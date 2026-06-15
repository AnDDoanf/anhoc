# Production Secrets Management Strategy

We use standard environment variable patterns to pass secrets to services at runtime, avoiding hardcoding keys in the source tree or committing them to git.

## Environment Variable Validation

To prevent starting applications with missing or invalid configs, entry points run explicit validation routines:
- **Backend**: [backend/lib/env.ts](file:///c:/code/anhoc/backend/lib/env.ts) validates required fields (`DATABASE_URL`, `JWT_SECRET`). If `NODE_ENV` is set to `production`, it strictly enforces that `JWT_SECRET` is at least 32 characters long to ensure adequate signature strength.
- **Frontend**: [frontend/src/utils/env.ts](file:///c:/code/anhoc/frontend/src/utils/env.ts) validates that a valid backend URL is defined for loader queries and request proxy configurations.
- **Chatbot**: [chatbot/config_validator.py](file:///c:/code/anhoc/chatbot/config_validator.py) checks for database paths, JWT secrets, and external LLM keys.

## Deployment Setup

### 1. Render (Backend & Chatbot)
Render manages secrets securely as environment variables or secret files:
- **Environment Variables**: Configure keys in the Service Dashboard under **Environment**:
  - `DATABASE_URL`: Connection string mapping to production database.
  - `JWT_SECRET`: Random 256-bit (32+ byte) cryptographically strong string.
  - `GEMINI_API_KEY` / `MONGODB_URI`: Chatbot LLM and database credentials.
- **Secret Files**: For files like Service Accounts or credentials, use Render's **Secret Files** configuration to mount files directly at paths in the container.

### 2. Vercel (Frontend Next.js)
Vercel encrypts variables and exposes them to builds and functions:
- Add variables in Project Settings under **Environment Variables**:
  - `NEXT_PUBLIC_API_URL` (client-side calls)
  - `INTERNAL_API_URL` / `BACKEND_URL` (server-side loader calls)
  - `DATABASE_URL` (if running prisma server-side queries)

### 3. Local Development (`.env.local`)
For local overrides, do not modify shared `.env` or `.env.development` files. Instead, create:
- `backend/.env.local`
- `frontend/.env.local`
- `chatbot/.env.local`

These files are ignored by `.gitignore` and can contain local keys (like your private `GEMINI_API_KEY`) safely.

## Key Rotation Policy

It is recommended to rotate critical production secrets (such as DB credentials, JWT signing keys) at least once every 90 days, or immediately following any developer offboarding or suspicious log alerts.
