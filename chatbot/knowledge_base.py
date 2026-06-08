import math
import os
import re
import unicodedata
from collections import Counter

from database import get_pg_connection

DEFAULT_SUBJECT_EN = "general studies"
DEFAULT_SUBJECT_VI = "học tập chung"
DEFAULT_CONTEXT_EN = "No curriculum context available."
DEFAULT_CONTEXT_VI = "Khong co ngu canh bai hoc phu hop."
CHUNK_TARGET_CHARS = int(os.getenv("RAG_CHUNK_TARGET_CHARS", "900"))
CHUNK_OVERLAP_CHARS = int(os.getenv("RAG_CHUNK_OVERLAP_CHARS", "180"))
MAX_LESSONS_SCANNED = int(os.getenv("RAG_MAX_LESSONS_SCANNED", "150"))
MAX_RAG_RESULTS = int(os.getenv("RAG_TOP_K", "4"))
RAG_INDEX: list[dict] = []
RAG_INDEX_METADATA = {
    "ready": False,
    "lessons_indexed": 0,
    "chunks_indexed": 0,
}

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "cho", "co", "cua", "de", "do", "for",
    "from", "hay", "how", "in", "is", "la", "lam", "lam sao", "mot", "neu", "nhung", "noi",
    "of", "on", "or", "tai", "that", "the", "this", "to", "trong", "tu", "va", "ve", "voi",
    "what", "when", "where", "why", "và", "có", "là", "để", "trong", "cho", "với", "như",
}


def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value or "")
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def _normalize_text(value: str) -> str:
    lowered = _strip_accents(value).lower()
    lowered = re.sub(r"`{1,3}.*?`{1,3}", " ", lowered, flags=re.DOTALL)
    lowered = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", lowered)
    lowered = re.sub(r"\[[^\]]+\]\([^)]+\)", " ", lowered)
    lowered = re.sub(r"[*_>#-]+", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered)
    return lowered.strip()


def _tokenize(value: str) -> list[str]:
    normalized = _normalize_text(value)
    tokens = re.findall(r"[a-z0-9]{2,}", normalized)
    return [token for token in tokens if token not in STOPWORDS]


def _trim_text(value: str, limit: int) -> str:
    cleaned = re.sub(r"\s+", " ", (value or "")).strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: max(0, limit - 3)].rstrip() + "..."


def _split_markdown_sections(content: str) -> list[str]:
    content = (content or "").strip()
    if not content:
        return []

    raw_sections = re.split(r"\n(?=#{1,6}\s)", content)
    sections: list[str] = []
    for section in raw_sections:
        section = section.strip()
        if not section:
            continue
        paragraphs = [paragraph.strip() for paragraph in re.split(r"\n\s*\n", section) if paragraph.strip()]
        if paragraphs:
            sections.extend(paragraphs)
        else:
            sections.append(section)
    return sections


def _chunk_lesson_content(content: str) -> list[str]:
    sections = _split_markdown_sections(content)
    if not sections:
        return []

    chunks: list[str] = []
    current = ""

    for section in sections:
        candidate = f"{current}\n\n{section}".strip() if current else section
        if current and len(candidate) > CHUNK_TARGET_CHARS:
            chunks.append(current.strip())
            overlap = current[-CHUNK_OVERLAP_CHARS:].strip()
            current = f"{overlap}\n\n{section}".strip() if overlap else section
            if len(current) > CHUNK_TARGET_CHARS * 1.4:
                chunks.extend(_split_long_block(current))
                current = ""
        else:
            current = candidate

    if current:
        chunks.append(current.strip())

    return [chunk for chunk in chunks if chunk]


def _split_long_block(block: str) -> list[str]:
    block = block.strip()
    if len(block) <= CHUNK_TARGET_CHARS:
        return [block] if block else []

    sentences = re.split(r"(?<=[\.\!\?])\s+", block)
    chunks: list[str] = []
    current = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        candidate = f"{current} {sentence}".strip() if current else sentence
        if current and len(candidate) > CHUNK_TARGET_CHARS:
            chunks.append(current.strip())
            overlap = current[-CHUNK_OVERLAP_CHARS:].strip()
            current = f"{overlap} {sentence}".strip() if overlap else sentence
        else:
            current = candidate

    if current:
        chunks.append(current.strip())

    return chunks


def _score_chunk_from_tokens(
    query_tokens: list[str],
    query_counter: Counter,
    chunk_tokens: list[str],
    title_tokens: list[str],
) -> float:
    if not query_tokens:
        return 0.0

    if not chunk_tokens:
        return 0.0

    chunk_counter = Counter(chunk_tokens)
    overlap = set(query_tokens) & set(chunk_tokens)
    coverage = len(overlap) / max(1, len(set(query_tokens)))
    term_density = sum(min(count, chunk_counter.get(token, 0)) for token, count in query_counter.items())
    title_hits = sum(1 for token in set(query_tokens) if token in title_tokens)
    length_penalty = math.log(len(chunk_tokens) + 8, 2)

    return (coverage * 5.0) + (term_density / max(1.0, length_penalty)) + (title_hits * 1.5)


def _fetch_lessons_for_rag(cur):
    cur.execute(
        f"""
        SELECT
            l.id,
            l.subject_id,
            l.title_en,
            l.title_vi,
            l.content_markdown_en,
            l.content_markdown_vi,
            l.updated_at,
            g.slug AS grade_slug,
            g.title_en AS grade_title_en,
            g.title_vi AS grade_title_vi,
            s.slug AS subject_slug,
            s.title_en AS subject_title_en,
            s.title_vi AS subject_title_vi
        FROM lessons l
        JOIN grades g ON l.grade_id = g.id
        JOIN subjects s ON l.subject_id = s.id
        ORDER BY l.updated_at DESC
        LIMIT {MAX_LESSONS_SCANNED}
        """
    )
    return cur.fetchall()


def _build_rag_index_entries(lessons: list[dict]) -> list[dict]:
    index_entries: list[dict] = []

    for lesson in lessons:
        title_en = lesson["title_en"] or ""
        title_vi = lesson["title_vi"] or ""
        grade_en = lesson["grade_title_en"] or lesson["grade_slug"]
        grade_vi = lesson["grade_title_vi"] or lesson["grade_slug"]
        subject_en = lesson["subject_title_en"] or DEFAULT_SUBJECT_EN
        subject_vi = lesson["subject_title_vi"] or DEFAULT_SUBJECT_VI
        chunks_en = _chunk_lesson_content(lesson["content_markdown_en"])
        chunks_vi = _chunk_lesson_content(lesson["content_markdown_vi"])
        total_chunks = max(len(chunks_en), len(chunks_vi))

        for chunk_index in range(total_chunks):
            chunk_text_en = chunks_en[chunk_index] if chunk_index < len(chunks_en) else ""
            chunk_text_vi = chunks_vi[chunk_index] if chunk_index < len(chunks_vi) else ""
            if not chunk_text_en and not chunk_text_vi:
                continue

            index_entries.append(
                {
                    "lesson_id": lesson["id"],
                    "subject_id": lesson["subject_id"],
                    "lesson_title_en": title_en,
                    "lesson_title_vi": title_vi,
                    "grade_en": grade_en,
                    "grade_vi": grade_vi,
                    "subject_en": subject_en,
                    "subject_vi": subject_vi,
                    "chunk_index": chunk_index,
                    "content_en": chunk_text_en,
                    "content_vi": chunk_text_vi,
                    "title_tokens_en": _tokenize(title_en),
                    "title_tokens_vi": _tokenize(title_vi),
                    "content_tokens_en": _tokenize(chunk_text_en),
                    "content_tokens_vi": _tokenize(chunk_text_vi),
                }
            )

    return index_entries


def warm_rag_index() -> dict:
    conn = get_pg_connection()
    if not conn:
        RAG_INDEX.clear()
        RAG_INDEX_METADATA.update({
            "ready": False,
            "lessons_indexed": 0,
            "chunks_indexed": 0,
        })
        return dict(RAG_INDEX_METADATA)

    try:
        with conn.cursor() as cur:
            lessons = _fetch_lessons_for_rag(cur)

        index_entries = _build_rag_index_entries(lessons)
        RAG_INDEX.clear()
        RAG_INDEX.extend(index_entries)
        RAG_INDEX_METADATA.update({
            "ready": True,
            "lessons_indexed": len(lessons),
            "chunks_indexed": len(index_entries),
        })
    except Exception as e:
        print(f"Error warming RAG index: {e}")
        RAG_INDEX.clear()
        RAG_INDEX_METADATA.update({
            "ready": False,
            "lessons_indexed": 0,
            "chunks_indexed": 0,
        })
    finally:
        conn.close()

    return dict(RAG_INDEX_METADATA)


def _build_ranked_chunks(question: str, locale: str, preferred_subject_id: int | None) -> list[dict]:
    query_tokens = _tokenize(question)
    query_counter = Counter(query_tokens)
    ranked_chunks: list[dict] = []

    for entry in RAG_INDEX:
        if preferred_subject_id and entry["subject_id"] != preferred_subject_id:
            continue

        title = entry["lesson_title_vi"] if locale == "vi" else entry["lesson_title_en"]
        grade = entry["grade_vi"] if locale == "vi" else entry["grade_en"]
        subject = entry["subject_vi"] if locale == "vi" else entry["subject_en"]
        content = entry["content_vi"] if locale == "vi" else entry["content_en"]
        title_tokens = entry["title_tokens_vi"] if locale == "vi" else entry["title_tokens_en"]
        content_tokens = entry["content_tokens_vi"] if locale == "vi" else entry["content_tokens_en"]

        score = _score_chunk_from_tokens(query_tokens, query_counter, content_tokens, title_tokens)
        if score <= 0 or not content:
            continue

        ranked_chunks.append(
            {
                "lesson_id": entry["lesson_id"],
                "lesson_title": title,
                "grade": grade,
                "subject": subject,
                "chunk_index": entry["chunk_index"],
                "score": round(score, 3),
                "content": content,
            }
        )

    ranked_chunks.sort(key=lambda item: item["score"], reverse=True)
    return ranked_chunks[:MAX_RAG_RESULTS]


def _format_rag_context(chunks: list[dict], locale: str) -> str:
    if not chunks:
        return DEFAULT_CONTEXT_VI if locale == "vi" else DEFAULT_CONTEXT_EN

    entries: list[str] = []
    for position, chunk in enumerate(chunks, start=1):
        entries.append(
            "\n".join(
                [
                    f"[Chunk {position}] Lesson: {chunk['lesson_title']}",
                    f"Grade: {chunk['grade']}",
                    f"Subject: {chunk['subject']}",
                    f"Relevance score: {chunk['score']}",
                    f"Content: {chunk['content']}",
                ]
            )
        )

    return "\n\n".join(entries)


def fetch_student_context(user_id: str, student_query: str, locale: str = "vi") -> tuple:
    """
    Fetch student metadata and retrieve the most relevant lesson chunks for the
    student's question using a lightweight lexical RAG pipeline.
    """
    default_context = DEFAULT_CONTEXT_VI if locale == "vi" else DEFAULT_CONTEXT_EN
    conn = get_pg_connection()
    if not conn:
        return {}, default_context, DEFAULT_SUBJECT_EN, DEFAULT_SUBJECT_VI, []

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.username, r.name AS role, u.preferred_subject_id, s.level, s.total_xp, s.average_score
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                LEFT JOIN student_stats s ON u.id = s.user_id
                WHERE u.id = %s
                """,
                (user_id,),
            )
            user_data = cur.fetchone()

            if not user_data:
                return {}, default_context, DEFAULT_SUBJECT_EN, DEFAULT_SUBJECT_VI, []

            preferred_subject_id = user_data.get("preferred_subject_id")
            level = user_data.get("level") or 1
            subject_name_en = DEFAULT_SUBJECT_EN
            subject_name_vi = DEFAULT_SUBJECT_VI

            if preferred_subject_id:
                cur.execute(
                    """
                    SELECT title_en, title_vi FROM subjects WHERE id = %s
                    """,
                    (preferred_subject_id,),
                )
                subject_data = cur.fetchone()
                if subject_data:
                    subject_name_en = subject_data.get("title_en") or DEFAULT_SUBJECT_EN
                    subject_name_vi = subject_data.get("title_vi") or DEFAULT_SUBJECT_VI

            if not RAG_INDEX:
                warm_rag_index()

            top_chunks = _build_ranked_chunks(student_query, locale, preferred_subject_id)
            curriculum_context = _format_rag_context(top_chunks, locale)

            metadata = {
                "username": user_data.get("username"),
                "role": user_data.get("role") or "student",
                "level": level,
                "total_xp": user_data.get("total_xp") or 0,
                "average_score": float(user_data.get("average_score") or 0),
                "rag": {
                    "chunks_retrieved": len(top_chunks),
                    "lessons_scanned": RAG_INDEX_METADATA["lessons_indexed"],
                    "chunks_indexed": RAG_INDEX_METADATA["chunks_indexed"],
                    "index_ready": RAG_INDEX_METADATA["ready"],
                    "subject_scope": subject_name_vi if locale == "vi" else subject_name_en,
                    "sources": [
                        {
                            "lesson_id": chunk["lesson_id"],
                            "lesson_title": chunk["lesson_title"],
                            "grade": chunk["grade"],
                            "chunk_index": chunk["chunk_index"],
                            "score": chunk["score"],
                            "preview": _trim_text(chunk["content"], 180),
                        }
                        for chunk in top_chunks
                    ],
                },
            }
            return metadata, curriculum_context, subject_name_en, subject_name_vi, top_chunks

    except Exception as e:
        print(f"Error fetching student context: {e}")
        return {}, "Error loading context.", DEFAULT_SUBJECT_EN, DEFAULT_SUBJECT_VI, []
    finally:
        conn.close()
