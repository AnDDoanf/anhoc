# Anhoc Gamify Learning App

The purpose of this application is to provide a **simple, engaging, structured, and AI-augmented platform** for children to learn and practice mathematics effectively.

It aims to:
- Help Vietnamese students from grade 1-9 understand math concepts through **easy-to-follow theory lessons**.
- Reinforce learning with **interactive practice exercises** powered by a procedurally checked math solver.
- Evaluate progress through **tests, auto-grading, and gamification**.
- Support students via an **AI Math Tutor Chatbot** with step-by-step reasoning.
- Track improvement over time to build **confidence and consistency**.

---

# Tech Stack

## Frontend
- **Next.js 16** (App Router, Tailwind CSS, Lucide icons, date-fns)
- **React 19 & Redux Toolkit** (State Management)
- **Axios & Fetch API** (API client with automatic JWT token refresh handlers)

## Backend
- **Node.js (Express)** with **Prisma ORM**
- **Swagger UI** (RESTful API documentation at `/api/docs`)
- **Helmet, CORS validation & Express Rate Limit** (Hardened Security headers)
- **Pino** (Structured logging) & Request Correlation ID tracking

## AI Chatbot Tutor Service
- **FastAPI (Python)**
- **Google Gemini API** (Main tutor reasoning) & **Ollama** (Local Qwen math model fallback)
- **SymPy** (Symbolic math engine, equation solver, and template validator)
- **Motor** (Asynchronous MongoDB driver)

## Databases & Storage
- **PostgreSQL (Neon / Containerized)** - Primary relational storage for users, achievements, lessons, and tests.
- **MongoDB (Atlas / Containerized)** - Conversational logs, history tracking, and student memory profile storage.

## Infrastructure & DevOps
- **Docker & Docker Compose** - Full orchestration containing all services with container-level healthchecks.
- **Reverse Proxy Routing** - Same-port client routing via Next.js server-side rewrites (zero CORS configuration issues).
- **Automated Backups** - Daily cron-ready shell scripts compressing Postgres and MongoDB data with a rolling 7-day retention.
- **Environment Validation** - Dynamic configuration sanity validation blocking boot on missing/weak keys.

---

# Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Browser (Single Origin Port 5000)"]
        Browser["User Browser"]
    end

    subgraph FrontendService ["Frontend Container (Next.js - Port 5000)"]
        NextJS["Next.js Server"]
        NextConfig["next.config.ts (Rewrites Engine)"]
        NextJS --> NextConfig
    end

    subgraph BackendService ["Backend Container (Express - Port 5001)"]
        Express["Express API Server"]
        PrismaClient["Prisma Client"]
        Express --> PrismaClient
    end

    subgraph ChatbotService ["Chatbot Container (FastAPI - Port 5002)"]
        FastAPI["FastAPI Server"]
        Motor["Motor (MongoDB Driver)"]
        Psycopg2["Psycopg2 (PostgreSQL Driver)"]
        FastAPI --> Motor
        FastAPI --> Psycopg2
    end

    subgraph Databases ["Database Tier"]
        Postgres[(PostgreSQL Relational DB)]
        MongoDB[(MongoDB Document DB)]
    end

    subgraph LLMTier ["LLM Service Tier"]
        Gemini[Google Gemini API]
        Ollama[Ollama Local Model]
    end

    %% Network routing
    Browser -->|HTTP / SSE on Port 5000| NextJS
    NextConfig -->|"/api/v1/auth, /lessons..." Proxy to http://backend:5001| Express
    NextConfig -->|"/api/v1/chat, /tutor..." Proxy to http://chatbot:5002| FastAPI

    %% Database queries
    PrismaClient --> Postgres
    Psycopg2 -->|Read queries| Postgres
    Motor --> MongoDB

    %% LLM integration
    FastAPI --> Gemini
    FastAPI -.->|Local Fallback| Ollama

    %% Styling
    classDef client fill:#eef2f7,stroke:#3b82f6,stroke-width:2px;
    classDef fe fill:#e0f2fe,stroke:#0284c7,stroke-width:2px;
    classDef be fill:#f0fdf4,stroke:#16a34a,stroke-width:2px;
    classDef cb fill:#fef3c7,stroke:#d97706,stroke-width:2px;
    classDef db fill:#faf5ff,stroke:#7c3aed,stroke-width:2px;
    classDef llm fill:#fff1f2,stroke:#e11d48,stroke-width:2px;

    class Browser client;
    class NextJS,NextConfig fe;
    class Express,PrismaClient be;
    class FastAPI,Motor,Psycopg2 cb;
    class Postgres,MongoDB db;
    class Gemini,Ollama llm;
```

When containerized inside Docker, Next.js acts as the ingress reverse-proxy. Client browsers talk strictly to port **5000** for all page views, backend API routes, and chatbot streaming. Next.js server-side routes proxy these requests internally using the container network.

---

# Features

## User Features
- Learn math concepts (theory pages) with KaTeX rendering.
- Interactive practice exercises with instant step-by-step reasoning hints.
- Take timed tests and track scores, history, and streaks.
- Earn XP, unlock achievements, and view gamified progression.

## Math Tutor Chatbot
- Streaming SSE conversations.
- SymPy augmented intent detection (routes math equations to the solver).
- Student memory tracking (saves mistakes, categorizes weak topics in MongoDB).
- Hint-first, step-by-step, and full solution explanation tutoring modes.

## Hardened Security
- Login, registration, and password lockout rate-limit protection.
- Strong password requirements and refresh token rotation policies.
- Auto-validation of JWT signatures and startup safety checks.

## Admin Panel
- Content management (lessons, questions, tests).
- Student access request logs and approvals.

---

# Project Structure

```
├── backend/               # Express + Prisma API
│   ├── lib/env.ts         # Backend Env Validation
│   ├── prisma/            # DB Schema and seeding scripts
│   └── routes/            # REST API Routes
├── frontend/              # Next.js Application
│   ├── src/components/    # Feature widget layers
│   ├── src/services/api.ts# Axios instance with refresh intercepts
│   └── src/utils/env.ts   # Frontend Env Validation
├── chatbot/               # FastAPI Chatbot Service
│   ├── config_validator.py# Chatbot Env Validation
│   ├── database.py        # Relational and document connection loaders
│   └── main.py            # Streaming Chatbot API
├── scripts/               # Backup and utilities
│   ├── backup-postgres.sh # daily PG backup runner
│   └── backup-mongodb.sh  # daily Mongo backup runner
└── docs/                  # System guides & operations
    └── infrastructure/    # Secrets management and restore guides
```

---

# Environment Variables

Copy the `.env.example` templates in each folder to configure environment profiles.

### Frontend (`frontend/.env.development`)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/anhoc?sslmode=disable
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_CHATBOT_API_URL=/
INTERNAL_API_URL=http://localhost:5001
BACKEND_URL=http://localhost:5001
```

### Backend (`backend/.env.development`)
```env
SERVER_PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/anhoc?sslmode=disable
JWT_SECRET=this-is-a-long-development-only-jwt-secret-key-32-chars
CORS_ORIGINS=http://localhost:5000
FRONTEND_URL=http://localhost:5000
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=no-reply@anhoc.local
AUTO_SEED_ACHIEVEMENTS=true
```

### Chatbot (`chatbot/.env.development`)
```env
PORT=5002
MONGODB_URI=mongodb://localhost:27017/anhoc_chatbot
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/anhoc?sslmode=disable
JWT_SECRET=this-is-a-long-development-only-jwt-secret-key-32-chars
GEMINI_API_KEY=your_gemini_api_key_here
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=hellonico/Qwen-2.5-Math-7.6B-Instruct-Q6_K.gguf:latest
OLLAMA_TIMEOUT_SECONDS=0
OLLAMA_NUM_CTX=1024
```

---

# Getting Started

## Method A: Running with Docker Compose (Recommended)
This spins up the entire application, databases, and network routing in a single terminal command.

1. Ensure Docker Desktop is installed.
2. In the project root, run:
   ```bash
   docker compose up --build -d
   ```
3. Once running, access the services:
   - **Frontend App**: `http://localhost:5000`
   - **Backend API Docs**: `http://localhost:5000/api/docs` (proxied)
   - **Chatbot Health**: `http://localhost:5000/health` (proxied)
   - **MailHog Inbox**: `http://localhost:8025`
4. Check running status using:
   ```bash
   docker compose ps
   ```

---

## Method B: Manual Local Development

### 1. Prerequisites
- **Node.js**: v20+
- **Python**: v3.10+
- **PostgreSQL**: Local or Neon DB
- **MongoDB**: Local community edition or Atlas

### 2. Configure Databases
Update your `.env` files in `backend/` and `chatbot/` to target your local PostgreSQL and MongoDB credentials.

### 3. Install & Start Services
From the root workspace folder, you can install and spin up all three services concurrently using the workspace scripts:

```bash
# Install dependencies for all modules
npm run install:all

# Run all services (Frontend, Backend, Chatbot) concurrently
npm run dev
```

If you prefer to start them in separate terminals:
- **Backend**: `cd backend && npm install && npm run dev`
- **Frontend**: `cd frontend && npm install && npm run dev`
- **Chatbot**: `cd chatbot && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --port 5002 --reload`

### 4. Run MailHog Only for Local Email Testing
If your backend is running directly on your machine and you only want the email test inbox, start just MailHog from the repo root:

```bash
docker compose up -d mailhog
```

Then open:
- **MailHog Web UI**: `http://localhost:8025`
- **SMTP Endpoint for local backend**: `localhost:1025`

To stop it later:

```bash
docker compose stop mailhog
```

---

# Backups & Secrets Management

### Automated Backups
Automated backup scripts are available in the `/scripts` directory. They can be scheduled using crontab on the hosting VM:
- **PostgreSQL Backups**: Daily dump compressed with Gzip to `/backups/postgres`. Handles a rolling 7-day retention deletion process automatically.
  - Setup and recovery instructions: [postgres_backup.md](file:///c:/code/anhoc/docs/infrastructure/postgres_backup.md).
- **MongoDB Backups**: Daily database dumps compressed to archives in `/backups/mongodb`.
  - Setup and recovery instructions: [mongodb_backup.md](file:///c:/code/anhoc/docs/infrastructure/mongodb_backup.md).

### Secrets Management Strategy
For production secrets (such as JWT signatures, DB passwords, Gemini keys), we enforce environment validation at startup to block startup on misconfigured keys. Review the [secrets_management.md](file:///c:/code/anhoc/docs/infrastructure/secrets_management.md) guide for details.

---

# License

This project is for academic and personal research purposes.
