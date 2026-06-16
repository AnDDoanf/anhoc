from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4

from chat_models import TutorChatRequest
from database import (
    db_mongo,
    in_memory_conversations,
    in_memory_messages,
    in_memory_practice_questions,
    in_memory_student_memories,
    in_memory_tutor_logs,
    is_mongo_available,
    utcnow,
)


@dataclass
class ConversationBundle:
    conversation_id: str
    conversation: dict
    memory: dict
    recent_messages: list[dict]


async def get_or_create_conversation(request: TutorChatRequest, language: str) -> ConversationBundle:
    if await is_mongo_available():
        conversation = None
        if request.conversation_id:
            conversation = await db_mongo.conversations.find_one({"_id": request.conversation_id, "userId": request.user_id})
        else:
            conversation = await db_mongo.conversations.find_one(
                {"userId": request.user_id},
                sort=[("updatedAt", -1)],
            )

        if conversation is None:
            conversation_id = request.conversation_id or str(uuid4())
            conversation = {
                "_id": conversation_id,
                "userId": request.user_id,
                "title": build_conversation_title(request.message),
                "grade": request.grade,
                "lessonId": request.lesson_id,
                "language": language,
                "createdAt": utcnow(),
                "updatedAt": utcnow(),
            }
            await db_mongo.conversations.insert_one(conversation)
        else:
            conversation_id = conversation["_id"]
            await db_mongo.conversations.update_one(
                {"_id": conversation_id},
                {"$set": {"updatedAt": utcnow(), "language": language}},
            )
            conversation["updatedAt"] = utcnow()

        memory = await db_mongo.student_memories.find_one({"userId": request.user_id}) or default_student_memory(request.user_id)
        recent_messages = await db_mongo.messages.find({"conversationId": conversation_id}).sort("createdAt", 1).to_list(length=8)
        return ConversationBundle(conversation_id=conversation_id, conversation=conversation, memory=memory, recent_messages=recent_messages)

    conversation = None
    if request.conversation_id:
        for item in in_memory_conversations:
            if item["_id"] == request.conversation_id and item["userId"] == request.user_id:
                conversation = item
                break
    elif in_memory_conversations:
        user_conversations = [item for item in in_memory_conversations if item["userId"] == request.user_id]
        user_conversations.sort(key=lambda item: item.get("updatedAt", utcnow()), reverse=True)
        conversation = user_conversations[0] if user_conversations else None

    if conversation is None:
        conversation = {
            "_id": request.conversation_id or str(uuid4()),
            "userId": request.user_id,
            "title": build_conversation_title(request.message),
            "grade": request.grade,
            "lessonId": request.lesson_id,
            "language": language,
            "createdAt": utcnow(),
            "updatedAt": utcnow(),
        }
        in_memory_conversations.append(conversation)
    else:
        conversation["updatedAt"] = utcnow()
        conversation["language"] = language

    memory = in_memory_student_memories.get(request.user_id) or default_student_memory(request.user_id)
    recent_messages = [item for item in in_memory_messages if item["conversationId"] == conversation["_id"]][-8:]
    return ConversationBundle(conversation_id=conversation["_id"], conversation=conversation, memory=memory, recent_messages=recent_messages)


def build_conversation_title(message: str) -> str:
    cleaned = " ".join((message or "").split()).strip()
    return cleaned[:60] if cleaned else "Math Tutor Chat"


def default_student_memory(user_id: str) -> dict:
    return {
        "userId": user_id,
        "preferredLanguage": "vi",
        "grade": None,
        "learningStyle": "hint_first",
        "weakTopics": [],
        "strongTopics": [],
        "recentMistakes": [],
        "updatedAt": utcnow(),
    }


def format_memory(memory: dict, language: str) -> str:
    weak_topics = ", ".join(memory.get("weakTopics") or []) or ("chưa có" if language == "vi" else "none yet")
    strong_topics = ", ".join(memory.get("strongTopics") or []) or ("chưa có" if language == "vi" else "none yet")
    grade = memory.get("grade") or ("chưa rõ" if language == "vi" else "unknown")
    preferred = memory.get("preferredLanguage") or language
    learning_style = memory.get("learningStyle") or "hint_first"

    return "\n".join(
        [
            f"- Grade: {grade}",
            f"- Preferred language: {preferred}",
            f"- Learning style: {learning_style}",
            f"- Weak topics: {weak_topics}",
            f"- Strong topics: {strong_topics}",
        ]
    )


def format_recent_messages(messages: list[dict]) -> str:
    lines: list[str] = []
    for item in messages[-6:]:
        role = item.get("role", "user")
        content = " ".join((item.get("content") or "").split()).strip()
        if content:
            lines.append(f"{role}: {content}")
    return "\n".join(lines) if lines else "No recent messages."


async def save_tutor_exchange(
    *,
    request: TutorChatRequest,
    conversation_id: str,
    language: str,
    mode: str,
    intent: str,
    answer: str,
    steps: list[str],
    final_answer: str | None,
    tool_used: str | None,
    context_used: dict,
):
    user_message = {
        "_id": str(uuid4()),
        "conversationId": conversation_id,
        "userId": request.user_id,
        "role": "user",
        "content": request.message,
        "language": language,
        "mode": mode,
        "intent": intent,
        "metadata": {},
        "createdAt": utcnow(),
    }
    assistant_message = {
        "_id": str(uuid4()),
        "conversationId": conversation_id,
        "userId": request.user_id,
        "role": "assistant",
        "content": answer,
        "language": language,
        "mode": mode,
        "intent": intent,
        "metadata": {
            "steps": steps,
            "finalAnswer": final_answer,
            "toolUsed": tool_used,
            "contextUsed": context_used,
        },
        "createdAt": utcnow(),
    }

    if await is_mongo_available():
        await db_mongo.messages.insert_many([user_message, assistant_message])
        await db_mongo.conversations.update_one({"_id": conversation_id}, {"$set": {"updatedAt": utcnow()}})
        await db_mongo.tutor_logs.insert_one(
            {
                "userId": request.user_id,
                "conversationId": conversation_id,
                "request": {
                    "message": request.message,
                    "mode": mode,
                    "language": language,
                },
                "response": {
                    "answer": answer,
                    "finalAnswer": final_answer,
                },
                "toolsUsed": [tool_used] if tool_used else [],
                "modelName": "ollama",
                "createdAt": utcnow(),
            }
        )
        return

    in_memory_messages.extend([user_message, assistant_message])
    in_memory_tutor_logs.append(
        {
            "userId": request.user_id,
            "conversationId": conversation_id,
            "request": {
                "message": request.message,
                "mode": mode,
                "language": language,
            },
            "response": {
                "answer": answer,
                "finalAnswer": final_answer,
            },
            "toolsUsed": [tool_used] if tool_used else [],
            "modelName": "ollama",
            "createdAt": utcnow(),
        }
    )


async def update_student_memory(
    user_id: str,
    *,
    language: str,
    grade: int | None,
    mode: str,
    topic: str | None,
    easier_requested: bool,
    was_correct: bool | None = None,
    mistake: str | None = None,
):
    if await is_mongo_available():
        memory = await db_mongo.student_memories.find_one({"userId": user_id}) or default_student_memory(user_id)
    else:
        memory = in_memory_student_memories.get(user_id) or default_student_memory(user_id)

    memory["preferredLanguage"] = "vi" if language == "mixed" else language
    if grade is not None:
        memory["grade"] = grade
    if mode == "hint" or easier_requested:
        memory["learningStyle"] = "hint_first"
    elif mode == "solve":
        memory["learningStyle"] = "step_by_step"

    if topic:
        weak_topics = memory.setdefault("weakTopics", [])
        strong_topics = memory.setdefault("strongTopics", [])
        if was_correct is False and topic not in weak_topics:
            weak_topics.append(topic)
        if was_correct is True and topic not in strong_topics:
            strong_topics.append(topic)

    if was_correct is False and topic:
        recent_mistakes = memory.setdefault("recentMistakes", [])
        recent_mistakes.append({
            "topic": topic,
            "mistake": mistake or f"Incorrect answer in {topic}",
            "createdAt": utcnow(),
        })
        memory["recentMistakes"] = recent_mistakes[-5:]

    memory["updatedAt"] = utcnow()

    if await is_mongo_available():
        await db_mongo.student_memories.replace_one({"userId": user_id}, memory, upsert=True)
    else:
        in_memory_student_memories[user_id] = memory


async def save_practice_question(record: dict):
    if await is_mongo_available():
        await db_mongo.practice_questions.insert_one(record)
    else:
        in_memory_practice_questions.append(record)


async def load_widget_history(user_id: str, skip: int, limit: int) -> list[dict]:
    if await is_mongo_available():
        conversations = await db_mongo.conversations.find({"userId": user_id}).sort("updatedAt", -1).skip(skip).limit(limit).to_list(length=limit)
        results: list[dict] = []
        for conversation in conversations:
            latest_pair = await db_mongo.messages.find({"conversationId": conversation["_id"]}).sort("createdAt", -1).to_list(length=2)
            latest_pair.reverse()
            record = {
                "_id": conversation["_id"],
                "user_id": user_id,
                "timestamp": conversation.get("updatedAt", utcnow()).isoformat(),
                "message": next((item["content"] for item in latest_pair if item["role"] == "user"), ""),
                "answer": next((item["content"] for item in latest_pair if item["role"] == "assistant"), ""),
                "thought": "",
                "context_used": next((item.get("metadata", {}).get("contextUsed", {}) for item in latest_pair if item["role"] == "assistant"), {}),
            }
            results.append(record)
        return results

    user_conversations = [item for item in in_memory_conversations if item["userId"] == user_id]
    user_conversations.sort(key=lambda item: item.get("updatedAt", utcnow()), reverse=True)
    selected = user_conversations[skip : skip + limit]
    results: list[dict] = []
    for conversation in selected:
        latest_pair = [item for item in in_memory_messages if item["conversationId"] == conversation["_id"]][-2:]
        results.append(
            {
                "_id": conversation["_id"],
                "user_id": user_id,
                "timestamp": conversation.get("updatedAt", utcnow()).isoformat(),
                "message": next((item["content"] for item in latest_pair if item["role"] == "user"), ""),
                "answer": next((item["content"] for item in latest_pair if item["role"] == "assistant"), ""),
                "thought": "",
                "context_used": next((item.get("metadata", {}).get("contextUsed", {}) for item in latest_pair if item["role"] == "assistant"), {}),
            }
        )
    return results
