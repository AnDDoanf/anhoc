# 📘Anhoc Math Learning App (Next.js + Node.js + PostgreSQL)

The purpose of this application is to provide a **simple, engaging, and structured platform** for children to learn and practice mathematics effectively.

It aims to:

* Help kids understand math concepts through **easy-to-follow theory lessons**
* Reinforce learning with **interactive practice exercises**
* Evaluate progress through **tests and scoring**
* Track improvement over time to build **confidence and consistency**

---

# 🏗️ Tech Stack

## Frontend

* **Next.js (Vercel)**
* React
* Fetch API / Axios

## Backend

* **Node.js (Express)**
* RESTful API

## Database

* **PostgreSQL (Neon)**

## Deployment

* Frontend: Vercel
* Backend: Render
* Database: Neon

---

# 🧩 Architecture

```
Frontend (Next.js - Vercel)
        ↓ HTTP Requests
Backend (Node.js - Render)
        ↓ SQL Queries
Database (PostgreSQL - Neon)
```

---

# ✨ Features

## 👶 User Features

* Learn math concepts (theory pages)
* Practice exercises
* Take tests
* Track progress (scores, history)

## 🔐 Authentication & Authorization

* User registration & login
* Secure authentication (JWT/session-based)
* Role-based access:

  * **User**: learning, practice, testing
  * **Admin**: manage content (questions, lessons)

## 🧪 Learning Modules

* Theory pages (text, examples)
* Practice mode (interactive questions)
* Test mode (timed or structured exams)

## 🛠️ Admin Panel

* Create/edit/delete:

  * Lessons
  * Questions
  * Tests
* Manage users (optional)

---

# 📂 Project Structure

## Frontend (Next.js)

```
/frontend
  /app or /pages
    /login
    /register
    /learn
    /practice
    /test
    /admin
  /components
  /services (API calls)
  /utils
```

## Backend (Node.js)

```
/backend
  /src
    /controllers
    /routes
    /middlewares
    /services
    /models
    /config
  server.js
```

---

# 🗄️ Database Schema (Simplified)

```sql
users (
  id uuid primary key,
  email text unique,
  password text,
  role text, -- 'user' | 'admin'
  created_at timestamptz
);

lessons (
  id uuid primary key,
  title text,
  content text
);

questions (
  id uuid primary key,
  lesson_id uuid,
  question text,
  answer text
);

tests (
  id uuid primary key,
  name text
);

test_results (
  id uuid primary key,
  user_id uuid,
  score int,
  created_at timestamptz
);
```

---

# 🔐 Authentication Flow

1. User logs in via frontend
2. Backend validates credentials
3. Backend returns JWT token
4. Frontend stores token (cookie/localStorage)
5. Protected routes require valid token

---

# ⚙️ Environment Variables

## Frontend (.env)

```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

## Backend (.env)

```
SERVER_PORT=5001
DATABASE_URL=your_neon_connection_string
JWT_SECRET=your_secret_key
```

---

# 🚀 Getting Started

## 1. Clone repository

```
git clone <your-repo-url>
cd project
```

---

## 2. Setup Backend

```
cd backend
npm install
npm run dev
```

---

## 3. Setup Frontend

```
cd frontend
npm install
npm run dev
```

---

## 4. Setup Database (Neon)

* Create a PostgreSQL database
* Copy connection string
* Add to `DATABASE_URL`
* Run migrations / create tables

---

# 🌐 Deployment

## Frontend (Vercel)

* Connect GitHub repo
* Set environment variables
* Deploy

## Backend (Render)

* Create Web Service
* Add environment variables
* Deploy

## Database (Neon)

* Managed automatically
* No expiration on free tier

---

# ⚠️ Notes

* Render free tier may cause **cold starts (~10–30s)**
* Neon may have **small cold start delay**
* Always secure API endpoints with authentication middleware
* Never expose database credentials to frontend

---

# 🔮 Future Improvements

* Gamification (badges, rewards)
* Leaderboard
* Adaptive difficulty
* Multi-language support
* Parent dashboard

---

# 📄 License

This project is for personal purposes.
