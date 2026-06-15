import config_validator
import asyncio
import json
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from chat_models import (
    CheckAnswerRequest,
    CheckAnswerResponse,
    PracticeRequest,
    PracticeResponse,
    TutorChatRequest,
    TutorChatResponse,
    WidgetChatResponse,
)
from database import ensure_mongo_indexes
from lesson_retriever import warm_lessons
from memory_service import load_widget_history
from tutor_service import (
    build_tutor_context,
    finalize_streamed_chat,
    handle_chat,
    handle_check_answer,
    handle_practice,
    make_json_safe,
    stream_chat,
)

PORT = int(os.getenv("PORT", 5002))

app = FastAPI(
    title="Anhoc Math Tutor Chatbot",
    description="Vietnamese/English friendly math tutor with memory, tools, and lesson RAG.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    await ensure_mongo_indexes()
    rag_stats = await warm_lessons()
    print(
        "Tutor startup complete: "
        f"{rag_stats['lessons_indexed']} lessons, {rag_stats['chunks_indexed']} chunks, "
        f"ready={rag_stats['ready']}"
    )


def sse_event(event_type: str, data: dict) -> str:
    return f"data: {json.dumps({'type': event_type, **data}, ensure_ascii=False)}\n\n"


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "anhoc-math-tutor"}


@app.post("/api/v1/tutor/chat", response_model=TutorChatResponse)
async def tutor_chat(payload: TutorChatRequest):
    return await handle_chat(payload)


@app.post("/api/v1/tutor/check-answer", response_model=CheckAnswerResponse)
async def tutor_check_answer(payload: CheckAnswerRequest):
    return await handle_check_answer(payload)


@app.post("/api/v1/tutor/practice", response_model=PracticeResponse)
async def tutor_practice(payload: PracticeRequest):
    return await handle_practice(payload)


@app.get("/api/v1/chat/history")
async def get_chat_history(user_id: str, skip: int = 0, limit: int = 3):
    return await load_widget_history(user_id, skip, limit)


@app.post("/api/v1/chat", response_model=WidgetChatResponse)
async def widget_chat(payload: TutorChatRequest):
    tutor_response = await handle_chat(payload)
    return WidgetChatResponse(
        thought=f"intent={tutor_response.intent}; mode={tutor_response.mode}; language={tutor_response.language}",
        answer=tutor_response.answer,
        context_used=tutor_response.context_used,
        remaining_uses=5,
    )


@app.post("/api/v1/chat/stream")
async def widget_chat_stream(payload: TutorChatRequest, request: Request):
    context = await build_tutor_context(payload)

    async def event_stream():
        answer_parts: list[str] = []

        def should_stop() -> bool:
            return stop_event.is_set()

        try:
            if await request.is_disconnected():
                stop_event.set()
                return

            context_used = make_json_safe({
                "language": context.answer_language,
                "detected_language": context.detected_language,
                "intent": context.intent,
                "mode": context.mode,
                "memory": context.conversation.memory,
                "lesson_sources": context.lesson.sources,
                "tool_result": context.tool_result.__dict__ if context.tool_result else None,
                "provider_debug": {
                    "requested": payload.provider or "ollama",
                    "effective": "ollama",
                    "limited": False,
                },
            })
            yield sse_event("meta", {"context_used": context_used})

            async for chunk in stream_chat(context, should_stop):
                if await request.is_disconnected():
                    stop_event.set()
                    break
                answer_parts.append(chunk)
                yield sse_event("delta", {"text": chunk})

            if stop_event.is_set() or await request.is_disconnected():
                return

            answer_text = "".join(answer_parts).strip()
            final_context = await finalize_streamed_chat(context, answer_text)
            yield sse_event(
                "done",
                {
                    "thought": f"intent={context.intent}; mode={context.mode}; language={context.answer_language}",
                    "context_used": final_context,
                    "remaining_uses": 5,
                },
            )
        except asyncio.CancelledError:
            stop_event.set()
            raise
        except Exception as e:
            if stop_event.is_set() or await request.is_disconnected():
                return
            yield sse_event(
                "error",
                {
                    "detail": str(e),
                    "status_code": 500,
                },
            )

    stop_event = asyncio.Event()
    return StreamingResponse(event_stream(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
