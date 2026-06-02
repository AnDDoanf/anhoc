import os
import re
import base64
import json
import unicodedata
import requests
import jwt
from fastapi import HTTPException, status
from google import genai
from google.genai import types

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
JWT_SECRET = os.getenv("JWT_SECRET", "")
OLLAMA_TIMEOUT_ENV = os.getenv("OLLAMA_TIMEOUT_SECONDS", "0").strip().lower()
OLLAMA_TIMEOUT_SECONDS = None if OLLAMA_TIMEOUT_ENV in ["", "0", "none", "false"] else float(OLLAMA_TIMEOUT_ENV)
OLLAMA_NUM_CTX = int(os.getenv("OLLAMA_NUM_CTX", "1024"))


def solve_simple_vietnamese_linear_question(question: str) -> str | None:
    normalized = question.lower()
    normalized = "".join(
        char for char in unicodedata.normalize("NFD", normalized)
        if unicodedata.category(char) != "Mn"
    )
    normalized = normalized.replace(",", ".")
    normalized = re.sub(r"\s+", " ", normalized)

    # Handles forms like: "tim x biet x chia 7 cong 6 bang 11"
    pattern = re.compile(
        r"x\s*(?:/|chia)\s*(-?\d+(?:\.\d+)?)\s*"
        r"(?:\+|cong)\s*(-?\d+(?:\.\d+)?)\s*"
        r"(?:=|bang)\s*(-?\d+(?:\.\d+)?)"
    )
    match = pattern.search(normalized)
    if not match:
        return None

    divisor = float(match.group(1))
    addend = float(match.group(2))
    target = float(match.group(3))
    if divisor == 0:
        return "Khong the chia cho 0."

    x_value = (target - addend) * divisor
    x_text = str(int(x_value)) if x_value.is_integer() else str(x_value)
    target_text = str(int(target)) if target.is_integer() else str(target)
    addend_text = str(int(addend)) if addend.is_integer() else str(addend)
    divisor_text = str(int(divisor)) if divisor.is_integer() else str(divisor)

    return (
        f"Ta co: x / {divisor_text} + {addend_text} = {target_text}\n"
        f"x / {divisor_text} = {target_text} - {addend_text} = {target - addend:g}\n"
        f"x = {target - addend:g} x {divisor_text} = {x_text}\n"
        f"Vay x = {x_text}."
    )


def fetch_ollama_models(ollama_url: str) -> list[str]:
    try:
        res = requests.get(f"{ollama_url.rstrip('/')}/api/tags", timeout=5.0)
        res.raise_for_status()
        return [model.get("name", "") for model in res.json().get("models", []) if model.get("name")]
    except Exception as e:
        print(f"Ollama model list check failed: {e}")
        return []


def build_compact_ollama_prompt(full_text_prompt: str) -> str:
    question_match = re.search(r"Student Question:\s*(.*?)(?:\n\nFollow this exact structural layout:|$)", full_text_prompt, re.DOTALL)
    student_match = re.search(r"STUDENT INFO.*?---\s*(.*?)---", full_text_prompt, re.DOTALL)
    context_match = re.search(r"CURRICULUM CONTEXT.*?:\s*(.*?)---\s*\n\nINSTRUCTIONS:", full_text_prompt, re.DOTALL)
    technique_match = re.search(r"Use this reasoning technique privately before answering:\s*(.*?)\n", full_text_prompt, re.DOTALL)

    question = question_match.group(1).strip() if question_match else full_text_prompt[-800:].strip()
    student_info = student_match.group(1).strip() if student_match else ""
    context = context_match.group(1).strip() if context_match else ""
    technique = technique_match.group(1).strip() if technique_match else "Step-by-step decomposition."
    lang_instruction = "Respond entirely in Vietnamese." if "Respond entirely in Vietnamese." in full_text_prompt else "Respond entirely in English."

    return f"""
You are Anhoc, a careful math tutor for school students.
{lang_instruction}

Priority:
- For algebra word problems, first translate the sentence into an equation.
- Solve using inverse operations.
- Verify by substituting the final value back into the original equation.
- Do not guess. If the arithmetic is uncertain, recompute before answering.

Student info:
{student_info}

Relevant lesson context:
{context[:500]}

Reasoning technique to use privately:
{technique}

Answer with the equation, the solving steps, a substitution check, and the final value.
Do not include hidden reasoning or thought tags.

Student Question: {question}
""".strip()


def build_ollama_request(provider: str, full_text_prompt: str, payload) -> tuple[str, dict]:
    ollama_url = payload.byok_ollama_url if provider == "ollama_byok" else os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3")

    if not ollama_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Local Ollama URL not found. Please set your connection URL in your profile configuration tab."
        )

    message = {"role": "user", "content": build_compact_ollama_prompt(full_text_prompt)}
    if payload.images:
        message["images"] = [img.data for img in payload.images]

    request_body = {
        "model": ollama_model,
        "messages": [message],
        "stream": True,
        "keep_alive": "5m",
        "options": {
            "temperature": 0.2,
            "num_ctx": OLLAMA_NUM_CTX,
        },
    }

    return ollama_url, request_body


def stream_ollama_provider(
    provider: str,
    full_text_prompt: str,
    student_meta: dict,
    payload,
    authorization_header: str | None = None,
):
    provider = provider.lower() if provider else "ollama"
    user_role = resolve_user_role(student_meta, payload, authorization_header)

    if provider == "ollama" and user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can use internal system models. Please use Gemini or bring your own API key (BYOK)."
        )

    question_match = re.search(r"Student Question:\s*(.*?)(?:\n\nFollow this exact structural layout:|$)", full_text_prompt, re.DOTALL)
    question = question_match.group(1).strip() if question_match else ""
    deterministic_answer = solve_simple_vietnamese_linear_question(question)
    if deterministic_answer:
        yield deterministic_answer
        return

    ollama_url, request_body = build_ollama_request(provider, full_text_prompt, payload)

    try:
        with requests.post(
            f"{ollama_url.rstrip('/')}/api/chat",
            json=request_body,
            stream=True,
            timeout=OLLAMA_TIMEOUT_SECONDS,
        ) as res:
            res.raise_for_status()

            for line in res.iter_lines(decode_unicode=True):
                if not line:
                    continue

                data = json.loads(line)
                chunk = (data.get("message") or {}).get("content") or ""
                if chunk:
                    yield chunk
                if data.get("done"):
                    break

    except requests.exceptions.HTTPError as e:
        installed_models = fetch_ollama_models(ollama_url)
        if e.response is not None and e.response.status_code == 404:
            installed_hint = ", ".join(installed_models) if installed_models else "none detected"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ollama model '{request_body['model']}' was not found. Installed models: {installed_hint}."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ollama HTTP error: {str(e)}"
        )


def resolve_user_role(student_meta: dict, payload, authorization_header: str | None) -> str:
    """
    Prefer a verified JWT role when available so admin-only model access uses the
    same identity source as the main backend. Fall back to the RAG lookup role.
    """
    db_role = (student_meta.get("role") or "student").lower()

    if not authorization_header or not JWT_SECRET:
        return db_role

    try:
        scheme, token = authorization_header.split(" ", 1)
        if scheme.lower() != "bearer" or not token:
            return db_role

        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        token_user_id = decoded.get("id")
        token_role = (decoded.get("role") or "").lower()

        if token_user_id == payload.user_id and token_role:
            return token_role
    except jwt.InvalidSignatureError:
        print("JWT verification skipped for chatbot auth: signature mismatch. Restart backend/chatbot with the same JWT_SECRET, then log in again.")
    except Exception as e:
        print(f"JWT verification skipped for chatbot auth: {e}")

    return db_role

def invoke_llm_provider(
    provider: str,
    full_text_prompt: str,
    student_meta: dict,
    payload, # ChatRequest instance or pydantic model
    locale: str = "vi",
    authorization_header: str | None = None
) -> tuple:
    """
    Executes the LLM request based on the selected provider and credentials.
    Performs authorization verification for admin-only system models.
    Parses reasoning <thought> block out of responses.
    """
    provider = provider.lower() if provider else "gemini"
    user_role = resolve_user_role(student_meta, payload, authorization_header)
    
    # Secure role-based authorization check for system paid models
    if provider in ["openai", "ollama"]:
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ quản trị viên mới có thể sử dụng các mô hình nội bộ của hệ thống. Vui lòng sử dụng Gemini hoặc tự nhập khóa API (BYOK) của bạn." if locale == "vi"
                else "Only administrators can use internal system models. Please use Gemini or bring your own API key (BYOK)."
            )
            
    raw_response = ""
    
    # Route execution based on provider
    if provider in ["openai", "openai_byok"]:
        api_key = payload.byok_openai_key if provider == "openai_byok" else os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không tìm thấy OpenAI API Key. Vui lòng thiết lập khóa API của bạn trong tab hồ sơ cá nhân." if locale == "vi"
                else "OpenAI API Key not found. Please set your API key in your profile configuration tab."
            )
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            user_content = [{"type": "text", "text": full_text_prompt}]
            if payload.images:
                for img in payload.images:
                    user_content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{img.mime_type};base64,{img.data}"
                        }
                    })
            
            res = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": user_content}],
                    "temperature": 0.3
                },
                timeout=30.0
            )
            res.raise_for_status()
            res_data = res.json()
            raw_response = res_data["choices"][0]["message"]["content"] or ""
            
        except Exception as e:
            print(f"OpenAI GPT API Error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Lỗi OpenAI GPT API: {str(e)}" if locale == "vi" else f"OpenAI GPT API error: {str(e)}"
            )
            
    elif provider in ["ollama", "ollama_byok"]:
        ollama_url = payload.byok_ollama_url if provider == "ollama_byok" else os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        ollama_model = os.getenv("OLLAMA_MODEL", "llama3")
        
        if not ollama_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không tìm thấy local Ollama URL. Vui lòng thiết lập URL trong tab hồ sơ cá nhân." if locale == "vi"
                else "Local Ollama URL not found. Please set your connection URL in your profile configuration tab."
            )
            
        try:
            message = {"role": "user", "content": build_compact_ollama_prompt(full_text_prompt)}
            if payload.images:
                message["images"] = [img.data for img in payload.images]
                
            res = requests.post(
                f"{ollama_url.rstrip('/')}/api/chat",
                json={
                    "model": ollama_model,
                    "messages": [message],
                    "stream": False,
                    "keep_alive": "5m",
                    "options": {
                        "temperature": 0.2,
                        "num_ctx": OLLAMA_NUM_CTX
                    }
                },
                timeout=OLLAMA_TIMEOUT_SECONDS
            )
            res.raise_for_status()
            res_data = res.json()
            raw_response = res_data["message"]["content"] or ""
            
        except requests.exceptions.HTTPError as e:
            installed_models = fetch_ollama_models(ollama_url)
            if e.response is not None and e.response.status_code == 404:
                installed_hint = ", ".join(installed_models) if installed_models else "none detected"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Không tìm thấy model Ollama '{ollama_model}'. Model hiện có: {installed_hint}. "
                        f"Hãy đặt OLLAMA_MODEL thành model đã cài hoặc chạy: ollama pull {ollama_model}"
                    ) if locale == "vi"
                    else (
                        f"Ollama model '{ollama_model}' was not found. Installed models: {installed_hint}. "
                        f"Set OLLAMA_MODEL to an installed model or run: ollama pull {ollama_model}"
                    )
                )

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Lỗi Ollama HTTP: {str(e)}" if locale == "vi" else f"Ollama HTTP error: {str(e)}"
            )
        except requests.exceptions.Timeout:
            timeout_label = f"{OLLAMA_TIMEOUT_SECONDS:.0f}s" if OLLAMA_TIMEOUT_SECONDS else "the configured timeout"
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=(
                    f"Ollama phan hoi qua cham sau {timeout_label}. "
                    "Hay dung model nho hon, bo timeout, hoac dung Gemini/OpenAI cho cau hoi dai."
                ) if locale == "vi"
                else (
                    f"Ollama was too slow and timed out after {timeout_label}. "
                    "Use a smaller model, disable the timeout, or use Gemini/OpenAI for long questions."
                )
            )
        except Exception as e:
            print(f"Ollama API Connection Error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Lỗi kết nối Local Ollama ({ollama_url}): {str(e)}. Hãy chắc chắn Ollama đang chạy và model '{ollama_model}' đã được tải về." if locale == "vi"
                else f"Local Ollama connection error ({ollama_url}): {str(e)}. Make sure Ollama is running and model '{ollama_model}' is pulled."
            )
            
    elif provider == "claude_byok":
        api_key = payload.byok_claude_key
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không tìm thấy Anthropic Claude API Key. Vui lòng thiết lập khóa API của bạn trong tab hồ sơ cá nhân." if locale == "vi"
                else "Anthropic Claude API Key not found. Please set your API key in your profile configuration tab."
            )
        try:
            headers = {
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            
            user_content = []
            if payload.images:
                for img in payload.images:
                    user_content.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": img.mime_type,
                            "data": img.data
                        }
                    })
            user_content.append({"type": "text", "text": full_text_prompt})
            
            res = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json={
                    "model": "claude-3-5-sonnet-20241022",
                    "max_tokens": 4096,
                    "messages": [{"role": "user", "content": user_content}],
                    "temperature": 0.3
                },
                timeout=40.0
            )
            res.raise_for_status()
            res_data = res.json()
            raw_response = "".join([block["text"] for block in res_data["content"] if block["type"] == "text"])
            
        except Exception as e:
            print(f"Claude API Error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Lỗi Anthropic Claude API: {str(e)}" if locale == "vi" else f"Anthropic Claude API error: {str(e)}"
            )
            
    elif provider in ["gemini", "gemini_byok"]:
        api_key = payload.byok_gemini_key if provider == "gemini_byok" else GEMINI_API_KEY
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không tìm thấy Gemini API Key. Vui lòng thiết lập khóa API của bạn trong tab hồ sơ cá nhân." if locale == "vi"
                else "Gemini API Key not found. Please set your API key in your profile configuration tab."
            )
        try:
            client = genai.Client(api_key=api_key)
            contents = []
            
            if payload.images:
                for img in payload.images:
                    contents.append(
                        types.Part.from_bytes(
                            data=base64.b64decode(img.data),
                            mime_type=img.mime_type
                        )
                    )
            
            contents.append(full_text_prompt)
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=contents,
            )
            raw_response = response.text or ""
            
        except Exception as e:
            print(f"Gemini API Error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Lỗi hệ thống trí tuệ nhân tạo Gemini: {str(e)}" if locale == "vi" else f"Gemini API error: {str(e)}"
            )
            
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nhà cung cấp dịch vụ AI không hợp lệ: {provider}" if locale == "vi" else f"Invalid AI provider: {provider}"
        )
        
    # Parse output for Chain of Thought <thought> tags
    thought_match = re.search(r"<thought>(.*?)</thought>", raw_response, re.DOTALL | re.IGNORECASE)
    if thought_match:
        thought_extracted = thought_match.group(1).strip()
        answer_extracted = re.sub(r"<thought>.*?</thought>", "", raw_response, flags=re.DOTALL | re.IGNORECASE).strip()
    else:
        thought_extracted = "No explicit `<thought>` tags found. Summarizing direct response reasoning."
        answer_extracted = raw_response.strip()
        
    return thought_extracted, answer_extracted
