from dataclasses import dataclass

from database import db_mongo, is_mongo_available, utcnow
from knowledge_base import (
    RAG_INDEX,
    RAG_INDEX_METADATA,
    _build_ranked_chunks,
    _format_rag_context,
    warm_rag_index,
)


@dataclass
class LessonRetrievalResult:
    context_text: str
    sources: list[dict]
    subject_name: str


async def warm_lessons() -> dict:
    stats = warm_rag_index()
    if await is_mongo_available() and RAG_INDEX:
        for entry in RAG_INDEX:
            for language in ("vi", "en"):
                chunk_text = entry["content_vi"] if language == "vi" else entry["content_en"]
                if not chunk_text:
                    continue
                await db_mongo.lesson_chunks.replace_one(
                    {
                        "lessonId": str(entry["lesson_id"]),
                        "chunkIndex": entry["chunk_index"],
                        "language": language,
                    },
                    {
                        "lessonId": str(entry["lesson_id"]),
                        "grade": entry["grade_vi"] if language == "vi" else entry["grade_en"],
                        "title": entry["lesson_title_vi"] if language == "vi" else entry["lesson_title_en"],
                        "chunkText": chunk_text,
                        "language": language,
                        "embedding": [],
                        "createdAt": utcnow(),
                    },
                    upsert=True,
                )
    return stats


def retrieve_lesson_context(message: str, language: str, preferred_subject_id: int | None = None) -> LessonRetrievalResult:
    if not RAG_INDEX and not RAG_INDEX_METADATA["ready"]:
        warm_rag_index()

    chunks = _build_ranked_chunks(message, language, preferred_subject_id)
    context_text = _format_rag_context(chunks, language)
    subject_name = chunks[0]["subject"] if chunks else ("Toan" if language == "vi" else "Mathematics")
    return LessonRetrievalResult(
        context_text=context_text,
        sources=chunks,
        subject_name=subject_name,
    )
