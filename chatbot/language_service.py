import re

try:
    from langdetect import detect
except Exception:
    detect = None


VIETNAMESE_MARKERS = set("ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ")
VI_KEYWORDS = {
    "giai", "tinh", "so sanh", "goi y", "dap an", "bai", "phan so", "phuong trinh", "vi sao", "dung khong",
    "dien tich", "chu vi", "hinh tron", "ban kinh", "duong kinh", "hinh vuong", "canh", "hinh chu nhat",
    "chieu dai", "chieu rong", "tam giac", "chieu cao", "day"
}
EN_KEYWORDS = {
    "solve", "calculate", "compare", "hint", "answer", "fraction", "equation", "why", "check", "practice",
    "area", "perimeter", "circumference", "circle", "radius", "diameter", "square", "side", "rectangle",
    "length", "width", "triangle", "height", "base"
}


def normalize_language(language: str | None, locale: str | None = None) -> str | None:
    value = (language or locale or "").strip().lower()
    if value in {"vi", "en", "mixed"}:
        return value
    return None


def detect_language(message: str, explicit_language: str | None = None, preferred_language: str | None = None) -> str:
    normalized = normalize_language(explicit_language)
    if normalized:
        return normalized

    lowered = (message or "").lower()
    vi_score = sum(1 for char in lowered if char in VIETNAMESE_MARKERS)
    vi_score += sum(1 for keyword in VI_KEYWORDS if keyword in lowered)
    en_score = sum(1 for keyword in EN_KEYWORDS if keyword in lowered)

    if detect is not None and message.strip():
        try:
            detected = detect(message)
            if detected == "vi":
                vi_score += 2
            elif detected == "en":
                en_score += 2
        except Exception:
            pass

    if vi_score and en_score:
        return "mixed"
    if vi_score > en_score:
        return "vi"
    if en_score > vi_score:
        return "en"

    if re.search(r"[a-zA-Z]", message or ""):
        return preferred_language or "en"
    return preferred_language or "vi"


def choose_response_language(detected_language: str, preferred_language: str | None = None) -> str:
    if detected_language in {"vi", "en"}:
        return detected_language
    return preferred_language or "vi"
