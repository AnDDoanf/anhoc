from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, datetime
from typing import AsyncIterator

try:
    from bson import ObjectId
except Exception:
    ObjectId = None

from chat_models import (
    CheckAnswerRequest,
    CheckAnswerResponse,
    PracticeRequest,
    PracticeResponse,
    TutorChatRequest,
    TutorChatResponse,
)
from intent_service import detect_intent, detect_mode
from language_service import choose_response_language, detect_language
from lesson_retriever import LessonRetrievalResult, retrieve_lesson_context
from llm_service import complete_with_ollama, stream_with_ollama
from math_tool_service import MathToolResult, check_student_answer, solve_with_tools
from memory_service import (
    ConversationBundle,
    format_memory,
    format_recent_messages,
    get_or_create_conversation,
    save_practice_question,
    save_tutor_exchange,
    update_student_memory,
)
from prompts import build_tutor_prompt
from database import utcnow


@dataclass
class TutorContext:
    request: TutorChatRequest
    conversation: ConversationBundle
    detected_language: str
    answer_language: str
    intent: str
    mode: str
    lesson: LessonRetrievalResult
    tool_result: MathToolResult | None
    prompt: str
    direct_answer: str | None


def make_json_safe(value):
    if ObjectId is not None and isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: make_json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [make_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [make_json_safe(item) for item in value]
    return value


def _format_tool_result(tool_result: MathToolResult | None, language: str) -> str:
    if tool_result is None:
        return "No tool result available." if language == "en" else "Chua co ket qua cong cu."

    lines = [
        f"Tool used: {tool_result.tool_used}",
        f"Topic: {tool_result.topic}",
    ]
    if tool_result.hint:
        lines.append(f"Hint: {tool_result.hint}")
    if tool_result.steps:
        lines.append("Steps:")
        lines.extend(f"- {step}" for step in tool_result.steps)
    if tool_result.final_answer:
        lines.append(f"Final answer: {tool_result.final_answer}")
    return "\n".join(lines)


def _build_suggested_actions(language: str) -> list[str]:
    if language == "vi":
        return ["Cho em bai tuong tu", "Giai thich de hon", "Kiem tra bai em lam"]
    return ["Give me a similar exercise", "Explain it more simply", "Check my answer"]


def sanitize_model_answer(answer: str) -> str:
    blocked_prefixes = (
        "answer in ",
        "do not output ",
        "if tool result",
        "keep the answer ",
        "use only ",
        "system:",
        "current mode:",
        "student memory:",
        "lesson context:",
        "recent messages:",
        "tool result:",
        "user:",
        "rules:",
        "instruction:",
        "- mode:",
        "- intent:",
    )

    cleaned_lines: list[str] = []
    skipping_prompt_block = True

    for raw_line in (answer or "").splitlines():
        line = raw_line.strip()
        if not line:
            if cleaned_lines:
                cleaned_lines.append("")
            continue

        lowered = line.lower()
        if skipping_prompt_block and lowered.startswith(blocked_prefixes):
            continue

        if skipping_prompt_block and any(token in lowered for token in ("hidden reasoning", "xml tags", "tool result is relevant")):
            continue

        skipping_prompt_block = False
        cleaned_lines.append(raw_line.rstrip())

    cleaned = "\n".join(cleaned_lines).strip()
    return cleaned or (answer or "").strip()


def _compose_direct_tool_answer(tool_result: MathToolResult, language: str, mode: str) -> str:
    if language == "vi":
        if mode == "hint" and tool_result.hint:
            return f"Goi y: {tool_result.hint}"

        lines: list[str] = []
        if tool_result.topic == "comparison":
            lines.append("Mình so sánh bằng cách tính giá trị của từng vế:")
        elif tool_result.topic == "linear-equation":
            lines.append("Mình giải ngắn gọn như sau:")
        elif tool_result.topic == "arithmetic-series":
            lines.append("Đây là tổng của một cấp số cộng:")
        else:
            lines.append("Mình tính nhanh như sau:")

        lines.extend(tool_result.steps)
        if tool_result.final_answer:
            lines.append(f"Vậy đáp án là {tool_result.final_answer}.")
        return "\n".join(lines)

    if mode == "hint" and tool_result.hint:
        return f"Hint: {tool_result.hint}"

    lines = []
    if tool_result.topic == "comparison":
        lines.append("Compare by evaluating each side:")
    elif tool_result.topic == "linear-equation":
        lines.append("Here is the short solution:")
    elif tool_result.topic == "arithmetic-series":
        lines.append("This is an arithmetic series sum:")
    else:
        lines.append("Here is the quick calculation:")
    lines.extend(tool_result.steps)
    if tool_result.final_answer:
        lines.append(f"So the answer is {tool_result.final_answer}.")
    return "\n".join(lines)


async def build_tutor_context(request: TutorChatRequest) -> TutorContext:
    explicit_language = request.language or request.locale
    detected_language = detect_language(request.message, explicit_language, None)
    conversation = await get_or_create_conversation(request, detected_language)
    preferred_language = conversation.memory.get("preferredLanguage")
    answer_language = choose_response_language(detected_language, preferred_language)
    intent = detect_intent(request.message)
    mode = detect_mode(request.message, request.mode)
    lesson = retrieve_lesson_context(request.message, answer_language)
    tool_result = solve_with_tools(request.message)

    student_memory_text = format_memory(conversation.memory, answer_language)
    recent_messages_text = format_recent_messages(conversation.recent_messages)
    tool_result_text = _format_tool_result(tool_result, answer_language)
    prompt = build_tutor_prompt(
        answer_language=answer_language,
        mode=mode,
        intent=intent,
        student_memory=student_memory_text,
        lesson_context=lesson.context_text,
        recent_messages=recent_messages_text,
        tool_result=tool_result_text,
        user_message=request.message,
    )
    direct_answer = None
    if tool_result and intent in {"solve_problem", "explain_concept"}:
        direct_answer = _compose_direct_tool_answer(tool_result, answer_language, mode)

    return TutorContext(
        request=request,
        conversation=conversation,
        detected_language=detected_language,
        answer_language=answer_language,
        intent=intent,
        mode=mode,
        lesson=lesson,
        tool_result=tool_result,
        prompt=prompt,
        direct_answer=direct_answer,
    )


def _extract_context_metadata(context: TutorContext) -> dict:
    return make_json_safe({
        "language": context.answer_language,
        "detected_language": context.detected_language,
        "intent": context.intent,
        "mode": context.mode,
        "memory": context.conversation.memory,
        "lesson_sources": context.lesson.sources,
        "tool_result": asdict(context.tool_result) if context.tool_result else None,
        "provider_debug": {
            "requested": context.request.provider or "ollama",
            "effective": "ollama",
            "limited": False,
        },
    })


async def handle_chat(request: TutorChatRequest) -> TutorChatResponse:
    context = await build_tutor_context(request)
    answer = context.direct_answer or sanitize_model_answer(await complete_with_ollama(context.prompt))

    steps = context.tool_result.steps if context.tool_result else []
    final_answer = context.tool_result.final_answer if context.tool_result else None
    context_used = _extract_context_metadata(context)

    await save_tutor_exchange(
        request=request,
        conversation_id=context.conversation.conversation_id,
        language=context.answer_language,
        mode=context.mode,
        intent=context.intent,
        answer=answer,
        steps=steps,
        final_answer=final_answer,
        tool_used=context.tool_result.tool_used if context.tool_result else None,
        context_used=context_used,
    )
    await update_student_memory(
        request.user_id,
        language=context.answer_language,
        grade=request.grade,
        mode=context.mode,
        topic=context.tool_result.topic if context.tool_result else None,
        easier_requested=context.mode in {"hint", "explain"},
    )

    return TutorChatResponse(
        conversation_id=context.conversation.conversation_id,
        answer=answer,
        language=context.answer_language,
        intent=context.intent,
        mode=context.mode,
        steps=steps,
        final_answer=final_answer,
        suggested_actions=_build_suggested_actions(context.answer_language),
        context_used=context_used,
    )


async def stream_chat(context: TutorContext, should_stop) -> AsyncIterator[str]:
    if context.direct_answer:
        yield context.direct_answer
        return
    streamed_answer = ""
    async for chunk in stream_with_ollama(context.prompt, should_stop=should_stop):
        streamed_answer += chunk
    yield sanitize_model_answer(streamed_answer)


async def finalize_streamed_chat(context: TutorContext, answer: str):
    steps = context.tool_result.steps if context.tool_result else []
    final_answer = context.tool_result.final_answer if context.tool_result else None
    context_used = _extract_context_metadata(context)
    await save_tutor_exchange(
        request=context.request,
        conversation_id=context.conversation.conversation_id,
        language=context.answer_language,
        mode=context.mode,
        intent=context.intent,
        answer=answer,
        steps=steps,
        final_answer=final_answer,
        tool_used=context.tool_result.tool_used if context.tool_result else None,
        context_used=context_used,
    )
    await update_student_memory(
        context.request.user_id,
        language=context.answer_language,
        grade=context.request.grade,
        mode=context.mode,
        topic=context.tool_result.topic if context.tool_result else None,
        easier_requested=context.mode in {"hint", "explain"},
    )
    return context_used


async def handle_check_answer(request: CheckAnswerRequest) -> CheckAnswerResponse:
    language = choose_response_language(detect_language(request.question, request.language, None))
    is_correct, correct_answer = check_student_answer(request.question, request.student_answer)
    if is_correct:
        feedback = "Em lam dung roi. Tot lam!" if language == "vi" else "That is correct. Nice work!"
    else:
        feedback = (
            "Em lam gan dung roi, nhung bi nham o buoc cuoi."
            if language == "vi"
            else "You are close, but there is a mistake in the final step."
        )

    await update_student_memory(
        request.user_id,
        language=language,
        grade=None,
        mode="check",
        topic="answer-check",
        easier_requested=False,
        was_correct=is_correct,
    )

    return CheckAnswerResponse(
        is_correct=is_correct,
        correct_answer=correct_answer,
        feedback=feedback,
        language=language,
    )


def _build_practice_payload(topic: str, difficulty: str, language: str) -> tuple[str, str, str, list[str]]:
    topic_lower = (topic or "").lower()
    if "distributive" in topic_lower or "phan phoi" in topic_lower:
        question = "37 * 25 + 63 * 25"
        hint = "Hai hang tu cung co thua so 25." if language == "vi" else "Both terms share the factor 25."
        answer = "2500"
        solution = ["(37 + 63) * 25", "100 * 25", "2500"]
        return question, hint, answer, solution

    if "equation" in topic_lower or "phuong trinh" in topic_lower:
        question = "3x + 7 = 22"
        hint = "Tru 7 o ca hai ve truoc." if language == "vi" else "Subtract 7 from both sides first."
        answer = "x = 5"
        solution = ["3x = 15", "x = 5"]
        return question, hint, answer, solution

    question = "46 * 9 + 54 * 9" if difficulty == "easy" else "125 * 48 - 25 * 48"
    hint = "Tim thua so chung." if language == "vi" else "Look for a common factor."
    answer = "900" if difficulty == "easy" else "4800"
    solution = ["(46 + 54) * 9", "100 * 9", "900"] if difficulty == "easy" else ["(125 - 25) * 48", "100 * 48", "4800"]
    return question, hint, answer, solution


async def handle_practice(request: PracticeRequest) -> PracticeResponse:
    language = choose_response_language(detect_language(request.topic, request.language, None))
    question, hint, answer, solution = _build_practice_payload(request.topic, request.difficulty or "easy", language)

    await save_practice_question(
        {
            "userId": request.user_id,
            "grade": request.grade,
            "topic": request.topic,
            "difficulty": request.difficulty or "easy",
            "question": question,
            "answer": answer,
            "hint": hint,
            "solution": solution,
            "createdAt": utcnow(),
        }
    )

    return PracticeResponse(
        question=question,
        hint=hint,
        answer=answer,
        solution=solution,
        language=language,
    )
