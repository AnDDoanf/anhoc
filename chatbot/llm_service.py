import json
import os
from collections.abc import AsyncIterator, Callable

import httpx
from fastapi import HTTPException, status

DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "hellonico/Qwen-2.5-Math-7.6B-Instruct-Q6_K.gguf")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_TIMEOUT_ENV = os.getenv("OLLAMA_TIMEOUT_SECONDS", "120").strip().lower()
OLLAMA_TIMEOUT_SECONDS = None if OLLAMA_TIMEOUT_ENV in {"", "0", "none", "false"} else float(OLLAMA_TIMEOUT_ENV)
OLLAMA_NUM_CTX = int(os.getenv("OLLAMA_NUM_CTX", "4096"))


def build_ollama_payload(prompt: str) -> dict:
    return {
        "model": DEFAULT_OLLAMA_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
        "keep_alive": "10m",
        "options": {
            "temperature": 0.2,
            "num_ctx": OLLAMA_NUM_CTX,
        },
    }


async def complete_with_ollama(prompt: str) -> str:
    chunks: list[str] = []
    async for chunk in stream_with_ollama(prompt):
        chunks.append(chunk)
    return "".join(chunks).strip()


async def stream_with_ollama(
    prompt: str,
    should_stop: Callable[[], bool] | None = None,
) -> AsyncIterator[str]:
    stop_requested = should_stop or (lambda: False)
    payload = build_ollama_payload(prompt)

    try:
        timeout = httpx.Timeout(None, connect=10.0) if OLLAMA_TIMEOUT_SECONDS is None else httpx.Timeout(OLLAMA_TIMEOUT_SECONDS, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                f"{OLLAMA_BASE_URL.rstrip('/')}/api/chat",
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if stop_requested():
                        await response.aclose()
                        return
                    if not line:
                        continue
                    data = json.loads(line)
                    chunk = (data.get("message") or {}).get("content") or ""
                    if chunk:
                        yield chunk
                    if data.get("done"):
                        return
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ollama HTTP error: {e.response.text}",
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Local Ollama connection error ({OLLAMA_BASE_URL}): {str(e)}",
        )
