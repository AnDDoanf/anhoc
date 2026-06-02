# Anhoc Math Chatbot Microservice

This is a Python-based microservice that implements an interactive mathematical chatbot tutor.

## Features

- **FastAPI Framework:** Efficient ASGI server for the chatbot API.
- **Multimodal Gemini AI (`gemini-2.5-flash`):** Understands mathematical text prompts and uploaded problem images.
- **Chain of Thought (CoT):** Step-by-step reasoning is parsed and displayed independently from student-facing answers.
- **Curriculum RAG:** Queries PostgreSQL to inject level stats and math lesson content as grounding context.
- **MongoDB Logging:** Persists full chat conversations and daily usage counts when MongoDB is available.
- **In-Memory Fallback:** Continues running locally when MongoDB is offline, with temporary usage and conversation storage.
- **Usage Limits:** Users are capped at 5 prompts per day, resetting at midnight.
- **JWT Role Verification:** Verifies the frontend JWT for admin-only internal providers such as OpenAI and Ollama.

## Setup Instructions

Run all Python commands from this `chatbot` directory and through the local `.venv`.

1. Create the virtual environment if it does not already exist:

   ```powershell
   cd C:\code\anhoc\chatbot
   py -m venv .venv
   ```

2. Install Python packages into `.venv`:

   ```powershell
   .\.venv\Scripts\python.exe -m pip install --upgrade pip
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   ```

3. Setup environmental values inside `.env` by copying from `.env.example`:

   ```env
   PORT=5002
   MONGODB_URI=mongodb://localhost:27017/anhoc_chatbot
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/anhoc
   JWT_SECRET=use_the_same_secret_as_backend
   GEMINI_API_KEY=your_gemini_api_key
   OPENAI_API_KEY=optional_system_openai_key
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.1:latest
   OLLAMA_TIMEOUT_SECONDS=0
   OLLAMA_NUM_CTX=1024
   ```

   `JWT_SECRET` must match the backend `JWT_SECRET`; the chatbot uses it to verify admin access for internal providers.
   Use a secret with at least 32 bytes to avoid HMAC key length warnings.
   `OLLAMA_MODEL` must match a model shown by `ollama list`. Install a model with `ollama pull <model>`.
   `OLLAMA_TIMEOUT_SECONDS=0` disables the chatbot-side Ollama timeout. Ollama answers are streamed to the UI and are not capped by a chatbot token limit. Install a smaller model if `llama3.1:latest` still feels slow.

4. Launch the server:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn main:app --port 5002 --reload
   ```

5. Run a quick compile check:

   ```powershell
   .\.venv\Scripts\python.exe -m py_compile main.py llm.py database.py knowledge_base.py prompts.py
   ```

## API

- `GET /health` returns basic service status.
- `POST /api/v1/chat` sends a chat request and returns the tutor answer, parsed reasoning metadata, personalization context, and remaining daily uses.
- `POST /api/v1/chat/stream` sends the same request and streams SSE-style `meta`, `delta`, `done`, and `error` events. The frontend widget uses this endpoint.

Chat requests may include `reasoning_technique`:

```json
{
  "reasoning_technique": "step_by_step"
}
```

Supported values are `step_by_step`, `plan_solve_check`, `socratic`, and `worked_example`.

When calling `POST /api/v1/chat` from the frontend, include the existing app token:

```http
Authorization: Bearer <token>
```

The token `id` must match the request `user_id`.
