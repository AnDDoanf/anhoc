import json
import os
from datetime import date, datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from database import db_mongo, in_memory_conversations, in_memory_usage
from knowledge_base import fetch_student_context
from llm import invoke_llm_provider, stream_ollama_provider
from prompts import build_prompt_with_cot

PORT = int(os.getenv("PORT", 5002))

app = FastAPI(
    title="Anhoc Personalized Chatbot Microservice",
    description="Multimodal SLM Chatbot with CoT and RAG for dynamic course learning",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ImageContent(BaseModel):
    mime_type: str = Field(..., description="MIME type of the image, e.g., image/jpeg or image/png")
    data: str = Field(..., description="Base64 encoded string of image data")


class ChatRequest(BaseModel):
    user_id: str = Field(..., description="PostgreSQL user UUID")
    message: str = Field(..., description="Student prompt text")
    images: Optional[List[ImageContent]] = Field(default=None, description="Optional images for multimodal reasoning")
    locale: str = Field(default="vi", description="Target response language ('vi' or 'en')")
    provider: str = Field(default="gemini", description="AI provider")
    reasoning_technique: str = Field(default="step_by_step", description="Prompting technique for tutor reasoning")
    byok_openai_key: Optional[str] = Field(default=None, description="User provided OpenAI API key")
    byok_ollama_url: Optional[str] = Field(default=None, description="User provided local Ollama URL")
    byok_gemini_key: Optional[str] = Field(default=None, description="User provided Gemini API key")
    byok_claude_key: Optional[str] = Field(default=None, description="User provided Claude API key")


class ChatResponse(BaseModel):
    thought: str = Field(..., description="Reasoning or reasoning metadata")
    answer: str = Field(..., description="Final clean answer presented to the student")
    context_used: dict = Field(..., description="Personalization data context metadata")
    remaining_uses: int = Field(..., description="Remaining daily question count limit out of 5")


def get_daily_usage(user_id: str, today_str: str) -> tuple[int, bool]:
    try:
        if db_mongo is not None:
            record = db_mongo.user_usage.find_one({"user_id": user_id, "date": today_str})
            return (record["count"] if record else 0), True
    except Exception as e:
        print(f"MongoDB connection offline (falling back to in-memory storage): {e}")

    return in_memory_usage.get((user_id, today_str), 0), False


def enforce_daily_limit(current_count: int, locale: str):
    if current_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Ban da dat gioi han 5 cau hoi moi ngay. Gioi han se tu dong lap lai vao nua dem."
            if locale == "vi"
            else "You have reached your daily limit of 5 questions. It will reset at midnight.",
        )


def save_chat_record(
    user_id: str,
    today_str: str,
    current_count: int,
    mongo_available: bool,
    payload: ChatRequest,
    thought: str,
    answer: str,
    context_used: dict,
) -> int:
    new_count = current_count + 1
    conversation_record = {
        "user_id": user_id,
        "timestamp": datetime.utcnow(),
        "date": today_str,
        "message": payload.message,
        "images_count": len(payload.images) if payload.images else 0,
        "thought": thought,
        "answer": answer,
        "context_used": context_used,
    }

    if mongo_available:
        try:
            db_mongo.user_usage.update_one(
                {"user_id": user_id, "date": today_str},
                {"$inc": {"count": 1}},
                upsert=True,
            )
            db_mongo.conversations.insert_one(conversation_record)
            return new_count
        except Exception as e:
            print(f"MongoDB write failed: {e}. Defaulting to in-memory fallback.")

    in_memory_usage[(user_id, today_str)] = new_count
    in_memory_conversations.append(conversation_record)
    return new_count


def prepare_chat(payload: ChatRequest):
    today_str = date.today().isoformat()
    current_count, mongo_available = get_daily_usage(payload.user_id, today_str)
    enforce_daily_limit(current_count, payload.locale)

    student_meta, rag_context, subj_en, subj_vi = fetch_student_context(payload.user_id, payload.locale)
    full_text_prompt = build_prompt_with_cot(
        student_meta,
        rag_context,
        payload.message,
        subj_en,
        subj_vi,
        payload.locale,
        payload.reasoning_technique,
    )

    return today_str, current_count, mongo_available, student_meta, full_text_prompt


def sse_event(event_type: str, data: dict) -> str:
    return f"data: {json.dumps({'type': event_type, **data}, ensure_ascii=False)}\n\n"


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "anhoc-chatbot-microservice"}


@app.post("/api/v1/chat", response_model=ChatResponse)
def handle_chat(payload: ChatRequest, request: Request):
    today_str, current_count, mongo_available, student_meta, full_text_prompt = prepare_chat(payload)

    thought, answer = invoke_llm_provider(
        provider=payload.provider,
        full_text_prompt=full_text_prompt,
        student_meta=student_meta,
        payload=payload,
        locale=payload.locale,
        authorization_header=request.headers.get("authorization"),
    )

    new_count = save_chat_record(
        user_id=payload.user_id,
        today_str=today_str,
        current_count=current_count,
        mongo_available=mongo_available,
        payload=payload,
        thought=thought,
        answer=answer,
        context_used=student_meta,
    )

    return ChatResponse(
        thought=thought,
        answer=answer,
        context_used=student_meta,
        remaining_uses=max(0, 5 - new_count),
    )


@app.post("/api/v1/chat/stream")
def handle_chat_stream(payload: ChatRequest, request: Request):
    today_str, current_count, mongo_available, student_meta, full_text_prompt = prepare_chat(payload)
    provider = (payload.provider or "gemini").lower()
    authorization_header = request.headers.get("authorization")

    def event_stream():
        thought = "Streaming response; no separate hidden reasoning was returned."
        answer_parts: list[str] = []

        try:
            yield sse_event("meta", {"context_used": student_meta})

            if provider in ["ollama", "ollama_byok"]:
                for chunk in stream_ollama_provider(
                    provider=provider,
                    full_text_prompt=full_text_prompt,
                    student_meta=student_meta,
                    payload=payload,
                    authorization_header=authorization_header,
                ):
                    answer_parts.append(chunk)
                    yield sse_event("delta", {"text": chunk})
            else:
                thought, answer = invoke_llm_provider(
                    provider=provider,
                    full_text_prompt=full_text_prompt,
                    student_meta=student_meta,
                    payload=payload,
                    locale=payload.locale,
                    authorization_header=authorization_header,
                )
                answer_parts.append(answer)
                yield sse_event("delta", {"text": answer})

            answer_text = "".join(answer_parts)
            new_count = save_chat_record(
                user_id=payload.user_id,
                today_str=today_str,
                current_count=current_count,
                mongo_available=mongo_available,
                payload=payload,
                thought=thought,
                answer=answer_text,
                context_used=student_meta,
            )

            yield sse_event(
                "done",
                {
                    "thought": thought,
                    "context_used": student_meta,
                    "remaining_uses": max(0, 5 - new_count),
                },
            )
        except HTTPException as e:
            yield sse_event("error", {"detail": e.detail, "status_code": e.status_code})
        except Exception as e:
            print(f"Chat stream failed: {e}")
            yield sse_event("error", {"detail": str(e), "status_code": 500})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
