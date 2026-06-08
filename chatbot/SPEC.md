# SPEC: Vietnamese/English Friendly Math Tutor Chatbot

## 1. Goal

Build a math tutor chatbot that helps students learn math in **Vietnamese or English** using a friendly tutor style.

The chatbot should:

* Explain math step by step
* Give hints before answers
* Check student answers
* Generate similar exercises
* Remember student learning profile using MongoDB
* Use tools for calculation, not rely only on the language model
* Support Vietnamese, English, and mixed language input

---

# 2. Tech Stack

```txt
Frontend:
- Next.js / React
- Tailwind CSS
- KaTeX for math rendering

Backend:
- Python
- FastAPI
- Pydantic
- MongoDB
- Motor async MongoDB driver

AI:
- Small language model through Ollama
- Suggested model: Qwen2.5 3B/7B Instruct
- Optional: Phi, Gemma, Llama small models

Math tools:
- SymPy
- Python calculator
```

---

# 3. Core Architecture

```txt
User message
   ↓
FastAPI Backend
   ↓
Language detector
   ↓
Intent detector
   ↓
MongoDB memory lookup
   ↓
Lesson/context retrieval
   ↓
Math tool layer
   ↓
Small language model
   ↓
Response formatter
   ↓
Save message + update memory
   ↓
Return answer
```

---

# 4. Main Features

## 4.1 Chat Tutor

Student can ask:

```txt
tính nhanh: 46*99+54*99
```

or:

```txt
Can you solve 2x + 5 = 15?
```

The chatbot responds in the same language or preferred language.

---

## 4.2 Bilingual Support

Supported languages:

```ts
type Language = "vi" | "en" | "mixed";
```

Rules:

```txt
- If user writes Vietnamese, answer Vietnamese.
- If user writes English, answer English.
- If user mixes languages, answer naturally with the dominant language.
- Store preferred language in memory.
```

---

## 4.3 Tutor Modes

```ts
type TutorMode =
  | "hint"
  | "solve"
  | "check"
  | "explain"
  | "practice"
  | "review";
```

Examples:

```txt
"gợi ý thôi" -> hint
"giải giúp em" -> solve
"em làm vậy đúng không?" -> check
"cho bài tương tự" -> practice
"explain easier" -> explain
```

---

# 5. Tutor Personality

## Vietnamese Prompt

```txt
Bạn là gia sư Toán thân thiện cho học sinh Việt Nam.

Quy tắc:
- Nói tiếng Việt tự nhiên, dễ hiểu.
- Gọi học sinh là “em”.
- Không chê bai khi học sinh sai.
- Ưu tiên gợi ý trước nếu học sinh chưa yêu cầu lời giải.
- Nếu học sinh yêu cầu giải, giải từng bước ngắn gọn.
- Nếu học sinh sai, chỉ ra lỗi nhẹ nhàng và khích lệ.
- Luôn kiểm tra phép tính bằng công cụ.
- Không trả lời quá dài.
```

## English Prompt

```txt
You are a friendly math tutor.

Rules:
- Use simple English.
- Be encouraging and patient.
- Give hints first unless the student asks for the full solution.
- Explain step by step.
- Check calculations with tools.
- If the student is wrong, explain the mistake kindly.
- Keep answers clear and not too long.
```

---

# 6. API Design

## 6.1 Send Chat Message

```http
POST /api/v1/tutor/chat
```

Request:

```json
{
  "userId": "665f1a...",
  "conversationId": "666a2b...",
  "message": "tính nhanh: 46*99+54*99",
  "grade": 6,
  "lessonId": "distributive-property",
  "mode": "solve",
  "language": "vi"
}
```

Response:

```json
{
  "conversationId": "666a2b...",
  "answer": "Mình làm nhanh bằng cách nhóm thừa số chung nhé...",
  "language": "vi",
  "intent": "solve_problem",
  "mode": "solve",
  "steps": [
    "46 × 99 + 54 × 99",
    "(46 + 54) × 99",
    "100 × 99",
    "9900"
  ],
  "finalAnswer": "9900",
  "suggestedActions": [
    "Cho em bài tương tự",
    "Giải thích dễ hơn",
    "Kiểm tra bài em làm"
  ]
}
```

---

## 6.2 Check Answer

```http
POST /api/v1/tutor/check-answer
```

Request:

```json
{
  "userId": "665f1a...",
  "question": "2x + 5 = 15",
  "studentAnswer": "x = 4",
  "language": "vi"
}
```

Response:

```json
{
  "isCorrect": false,
  "correctAnswer": "x = 5",
  "feedback": "Em làm gần đúng rồi, nhưng bị nhầm ở bước chia cuối."
}
```

---

## 6.3 Generate Practice

```http
POST /api/v1/tutor/practice
```

Request:

```json
{
  "userId": "665f1a...",
  "topic": "distributive-property",
  "grade": 6,
  "difficulty": "easy",
  "language": "vi"
}
```

Response:

```json
{
  "question": "37 × 25 + 63 × 25",
  "hint": "Hai hạng tử có chung thừa số 25.",
  "answer": "2500",
  "solution": [
    "37 × 25 + 63 × 25",
    "(37 + 63) × 25",
    "100 × 25",
    "2500"
  ]
}
```

---

# 7. MongoDB Collections

## 7.1 `users`

```js
{
  _id: ObjectId,
  name: "An",
  email: "student@example.com",
  role: "student",
  createdAt: Date,
  updatedAt: Date
}
```

---

## 7.2 `conversations`

```js
{
  _id: ObjectId,
  userId: ObjectId,
  title: "Tính nhanh với tính chất phân phối",
  grade: 6,
  lessonId: "distributive-property",
  language: "vi",
  createdAt: Date,
  updatedAt: Date
}
```

---

## 7.3 `messages`

```js
{
  _id: ObjectId,
  conversationId: ObjectId,
  userId: ObjectId,
  role: "user", // user | assistant | system
  content: "tính nhanh: 46*99+54*99",
  language: "vi",
  mode: "solve",
  intent: "solve_problem",
  metadata: {
    steps: [],
    finalAnswer: null,
    toolUsed: null
  },
  createdAt: Date
}
```

---

## 7.4 `student_memories`

This is the chatbot memory.

```js
{
  _id: ObjectId,
  userId: ObjectId,
  preferredLanguage: "vi",
  grade: 6,
  learningStyle: "hint_first",
  weakTopics: [
    "phân số",
    "tính chất phân phối"
  ],
  strongTopics: [
    "cộng trừ số nguyên"
  ],
  recentMistakes: [
    {
      topic: "linear-equation",
      mistake: "forgot to divide both sides",
      createdAt: Date
    }
  ],
  updatedAt: Date
}
```

---

## 7.5 `lesson_chunks`

Used for RAG.

```js
{
  _id: ObjectId,
  grade: 6,
  lessonId: "distributive-property",
  title: "Tính chất phân phối",
  chunkText: "a × b + a × c = a × (b + c)",
  language: "vi",
  embedding: [0.012, -0.44, 0.21],
  createdAt: Date
}
```

---

## 7.6 `practice_questions`

```js
{
  _id: ObjectId,
  userId: ObjectId,
  grade: 6,
  topic: "distributive-property",
  difficulty: "easy",
  question: "37 × 25 + 63 × 25",
  answer: "2500",
  hint: "Nhóm thừa số chung 25.",
  solution: [
    "(37 + 63) × 25",
    "100 × 25",
    "2500"
  ],
  createdAt: Date
}
```

---

## 7.7 `tutor_logs`

```js
{
  _id: ObjectId,
  userId: ObjectId,
  conversationId: ObjectId,
  request: {
    message: "tính nhanh: 46*99+54*99",
    mode: "solve",
    language: "vi"
  },
  response: {
    answer: "...",
    finalAnswer: "9900"
  },
  toolsUsed: ["calculator"],
  modelName: "qwen2.5:3b-instruct",
  createdAt: Date
}
```

---

# 8. MongoDB Indexes

```js
db.conversations.createIndex({ userId: 1, updatedAt: -1 })

db.messages.createIndex({ conversationId: 1, createdAt: 1 })

db.student_memories.createIndex({ userId: 1 }, { unique: true })

db.lesson_chunks.createIndex({ grade: 1, lessonId: 1, language: 1 })

db.practice_questions.createIndex({ userId: 1, topic: 1, createdAt: -1 })

db.tutor_logs.createIndex({ userId: 1, createdAt: -1 })
```

If using MongoDB Atlas Vector Search:

```js
lesson_chunks.embedding -> vector index
```

---

# 9. Python Backend Structure

```txt
backend/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   ├── api/
│   │   └── v1/
│   │       └── tutor_routes.py
│   ├── models/
│   │   ├── chat_models.py
│   │   ├── memory_models.py
│   │   └── practice_models.py
│   ├── services/
│   │   ├── tutor_service.py
│   │   ├── memory_service.py
│   │   ├── llm_service.py
│   │   ├── math_tool_service.py
│   │   ├── lesson_retriever.py
│   │   └── language_service.py
│   ├── prompts/
│   │   ├── vi_tutor_prompt.txt
│   │   └── en_tutor_prompt.txt
│   └── utils/
│       ├── object_id.py
│       └── response_formatter.py
├── requirements.txt
└── .env
```

---

# 10. Environment Variables

```env
APP_NAME=Math Tutor Chatbot
APP_ENV=development

MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=math_tutor

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b-instruct
```

---

# 11. Main Python Dependencies

```txt
fastapi
uvicorn
motor
pydantic
python-dotenv
httpx
sympy
numpy
langdetect
```

Install:

```bash
pip install fastapi uvicorn motor pydantic python-dotenv httpx sympy numpy langdetect
```

---

# 12. Pydantic Models

```py
from pydantic import BaseModel
from typing import Optional, Literal, List

Language = Literal["vi", "en", "mixed"]
TutorMode = Literal["hint", "solve", "check", "explain", "practice", "review"]

class ChatRequest(BaseModel):
    userId: str
    conversationId: Optional[str] = None
    message: str
    grade: Optional[int] = None
    lessonId: Optional[str] = None
    mode: Optional[TutorMode] = "solve"
    language: Optional[Language] = None

class ChatResponse(BaseModel):
    conversationId: str
    answer: str
    language: Language
    intent: str
    mode: TutorMode
    steps: List[str] = []
    finalAnswer: Optional[str] = None
    suggestedActions: List[str] = []
```

---

# 13. Math Tool Layer

The language model should explain. Python tools should calculate.

## Tools

```py
import sympy as sp

def calculate_expression(expression: str):
    return sp.sympify(expression).evalf()

def solve_equation(equation: str, variable: str = "x"):
    x = sp.Symbol(variable)
    left, right = equation.split("=")
    result = sp.solve(sp.Eq(sp.sympify(left), sp.sympify(right)), x)
    return result

def simplify_expression(expression: str):
    return sp.simplify(expression)

def check_equivalent(expr_a: str, expr_b: str):
    return sp.simplify(sp.sympify(expr_a) - sp.sympify(expr_b)) == 0
```

---

# 14. Intent Detection

Simple rule-based MVP:

```py
def detect_intent(message: str) -> str:
    msg = message.lower()

    if any(x in msg for x in ["gợi ý", "hint"]):
        return "give_hint"

    if any(x in msg for x in ["đúng không", "check", "is this correct"]):
        return "check_answer"

    if any(x in msg for x in ["bài tương tự", "practice", "similar"]):
        return "generate_practice"

    if any(x in msg for x in ["giải thích", "explain", "why"]):
        return "explain_concept"

    if any(x in msg for x in ["giải", "solve", "tính", "calculate"]):
        return "solve_problem"

    return "general_tutor_chat"
```

---

# 15. Memory Behavior

## Save memory when:

```txt
- Student repeatedly gets a topic wrong
- Student asks for easier explanations
- Student prefers Vietnamese or English
- Student often asks for hints first
- Student grade is known
```

## Memory examples

```js
{
  preferredLanguage: "vi",
  learningStyle: "hint_first",
  weakTopics: ["phân phối"],
  recentMistakes: [
    {
      topic: "distributive-property",
      mistake: "did not recognize common factor"
    }
  ]
}
```

---

# 16. Prompt Building

Final prompt sent to model:

```txt
SYSTEM:
Bạn là gia sư Toán thân thiện cho học sinh Việt Nam...

STUDENT MEMORY:
- Grade: 6
- Preferred language: Vietnamese
- Weak topics: tính chất phân phối
- Learning style: hint first

LESSON CONTEXT:
Tính chất phân phối:
a × b + a × c = a × (b + c)

TOOL RESULT:
46*99+54*99 = 9900

USER:
tính nhanh: 46*99+54*99
```

---

# 17. Example Answer

```txt
Mình làm nhanh bằng cách nhóm thừa số chung nhé.

46 × 99 + 54 × 99
= (46 + 54) × 99
= 100 × 99
= 9900

Vậy đáp án là 9900.

Mẹo nhớ: khi hai hạng tử có cùng thừa số, mình có thể đưa thừa số đó ra ngoài.
```

---

# 18. FastAPI Routes

```py
from fastapi import APIRouter
from app.models.chat_models import ChatRequest, ChatResponse
from app.services.tutor_service import handle_chat

router = APIRouter(prefix="/api/v1/tutor", tags=["Tutor"])

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    return await handle_chat(request)
```

---

# 19. MVP Implementation Tasks

## Phase 1: Backend Setup

```txt
[ ] Create FastAPI project
[ ] Connect MongoDB with Motor
[ ] Create tutor chat endpoint
[ ] Add Pydantic request/response models
[ ] Save conversations and messages
```

## Phase 2: LLM Integration

```txt
[ ] Install Ollama
[ ] Pull small model
[ ] Create llm_service.py
[ ] Send prompt to Ollama
[ ] Return model response
```

## Phase 3: Vietnamese/English Tutor

```txt
[ ] Add language detector
[ ] Add Vietnamese tutor prompt
[ ] Add English tutor prompt
[ ] Add mixed-language handling
[ ] Add suggested action buttons
```

## Phase 4: Math Tools

```txt
[ ] Add calculator tool
[ ] Add SymPy equation solver
[ ] Add expression simplifier
[ ] Add answer checker
[ ] Inject tool result into prompt
```

## Phase 5: MongoDB Memory

```txt
[ ] Create student_memories collection
[ ] Read memory before response
[ ] Update weak topics
[ ] Save preferred language
[ ] Save common mistakes
```

## Phase 6: Lesson RAG

```txt
[ ] Load Markdown lessons
[ ] Split lessons into chunks
[ ] Store lesson chunks in MongoDB
[ ] Add vector search or keyword search
[ ] Inject lesson context into prompt
```

## Phase 7: Practice Mode

```txt
[ ] Generate similar questions
[ ] Store generated practice
[ ] Add difficulty levels
[ ] Add check-answer endpoint
```

---

# 20. Recommended MVP Model

For local development:

```bash
ollama pull qwen2.5:3b-instruct
```

Run:

```bash
ollama run qwen2.5:3b-instruct
```

Use model:

```env
OLLAMA_MODEL=qwen2.5:3b-instruct
```

---

# 21. Success Criteria

The chatbot is successful when it can:

```txt
[ ] Answer in Vietnamese or English
[ ] Explain math step by step
[ ] Give hints without revealing full answer
[ ] Check student answers correctly
[ ] Use Python tools for calculations
[ ] Remember student weak topics
[ ] Use lesson content from MongoDB
[ ] Generate similar practice questions
[ ] Keep a friendly tutor tone
```
