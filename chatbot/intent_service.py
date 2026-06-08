from chat_models import TutorMode


def detect_intent(message: str) -> str:
    msg = (message or "").lower()

    if any(x in msg for x in ["gợi ý", "goi y", "hint"]):
        return "give_hint"
    if any(x in msg for x in ["đúng không", "dung khong", "check", "is this correct"]):
        return "check_answer"
    if any(x in msg for x in ["bài tương tự", "bai tuong tu", "practice", "similar"]):
        return "generate_practice"
    if any(x in msg for x in ["giải thích", "giai thich", "explain", "why"]):
        return "explain_concept"
    if any(x in msg for x in ["giải", "giai", "tính", "tinh", "solve", "calculate", "compare", "so sánh", "so sanh"]):
        return "solve_problem"
    return "general_tutor_chat"


def detect_mode(message: str, requested_mode: TutorMode | None) -> TutorMode:
    if requested_mode:
        return requested_mode

    intent = detect_intent(message)
    mapping: dict[str, TutorMode] = {
        "give_hint": "hint",
        "check_answer": "check",
        "generate_practice": "practice",
        "explain_concept": "explain",
        "solve_problem": "solve",
        "general_tutor_chat": "review",
    }
    return mapping.get(intent, "solve")
