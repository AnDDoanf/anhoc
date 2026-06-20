# ANHOC Platform — Master TODO List

## Phase 0 — Foundation & Security (Highest Priority)

### Backend Hardening

* [x] Install Helmet security headers
* [x] Configure CORS whitelist
* [x] Add request size limits
* [x] Add request timeout middleware
* [x] Add centralized error handling
* [x] Add request correlation IDs
* [x] Add structured logging (Pino/Winston)

### Authentication Security

* [x] Rate limit login endpoint
* [x] Rate limit signup endpoint
* [x] Rate limit password reset endpoint
* [x] Add account lockout after repeated failures
* [x] Add refresh token rotation
* [x] Add JWT expiration strategy

### Infrastructure

* [x] Configure environment validation
* [x] Add Docker health checks
* [x] Configure production secrets management
* [x] Add backup strategy for PostgreSQL
* [x] Add MongoDB backup strategy
* [x] Add Local, Dev, Staging, Prod environment

---

# Phase 1 — Core Learning Platform

## Lesson System

### Lesson Management

* [x] CRUD lessons
* [x] CRUD chapters
* [x] CRUD topics
* [x] Markdown lesson editor
* [x] KaTeX rendering support
* [/] Lesson versioning

### Student Learning

* [x] Lesson viewer
* [x] Progress tracking
* [x] Lesson completion tracking
* [x] Resume last lesson
* [x] Learning streak tracking

---

## Question Bank

### Question Management

* [x] CRUD questions
* [x] Question categories
* [x] Question difficulty levels
* [x] Question tagging
* [x] Question import/export

### Practice Engine

* [x] Generate practice sets
* [x] Random question selection
* [x] Adaptive difficulty
* [x] Instant feedback
* [x] Answer explanations

### Testing Engine

* [x] Timed tests
* [x] Auto grading
* [x] Test history
* [x] Performance analytics

---

# Phase 2 — Tutor Chatbot

## Chatbot Core

### FastAPI Service

* [x] Create chatbot service
* [x] Chat session management
* [x] Conversation persistence
* [x] Streaming responses
* [x] Conversation history API

### Ollama Integration

* [x] Deploy Ollama server
* [x] Integrate Qwen model
* [x] Prompt management system
* [x] Response post-processing

### SymPy Integration

* [x] Expression parser
* [x] Calculation engine
* [x] Equation solver
* [x] Algebra simplification
* [x] Fraction support
* [x] Geometry helper
* [x] Validation layer

---

## Tool-Augmented LLM

### Intent Routing

* [x] Detect calculation requests
* [x] Detect explanation requests
* [x] Detect hint requests
* [x] Detect proof requests
* [x] Detect word problems

### Tool Calling

* [x] Route calculations to SymPy
* [x] Route explanations to LLM
* [x] Merge tool outputs
* [x] Confidence scoring

---

## Multilingual Support

### Language Detection

* [x] Vietnamese detection
* [x] English detection
* [x] Mixed-language detection

### Prompt Routing

* [x] Vietnamese prompt templates
* [x] English prompt templates
* [x] Bilingual explanations

---

# Phase 3 — Student Memory System

## MongoDB Memory Layer

### Profile Tracking

* [x] Store learning history
* [x] Store weak topics
* [x] Store strengths
* [x] Store preferred language

### Mistake Tracking

* [x] Record wrong answers
* [x] Categorize mistakes
* [x] Frequency analysis
* [x] Improvement tracking

### Adaptive Responses

* [x] Hint-first mode
* [x] Step-by-step mode
* [x] Full solution mode
* [x] Personalized recommendations

---

# Phase 4 — RAG Knowledge System

## Lesson Retrieval

### Content Processing

* [ ] Lesson chunking
* [ ] Metadata extraction
* [ ] Embedding generation
* [ ] Embedding storage

### Search

* [ ] Vector search
* [ ] Lexical search
* [ ] Hybrid search
* [ ] Ranking algorithm

### Prompt Augmentation

* [ ] Context injection
* [ ] Citation support
* [ ] Source tracking

---

# Phase 5 — Gamification

Status: partially implemented in the app. Core XP, achievements, daily streak UI, lesson/grade duel challenges, and a global games leaderboard are live; XP leaderboards, rating/matchmaking, enforced 1v1, live scoring, and school/class leaderboards are not.

## Experience System

### XP Engine

* [x] Award XP
* [x] XP history
* [ ] XP leaderboard

### Achievement System

* [x] Achievement definitions
* [x] Achievement unlock logic
* [x] Achievement notifications

### Streak System

* [x] Daily streak
* [ ] Weekly streak
* [ ] Recovery mechanics
* [ ] Daily login reward calendar
* [ ] One reward claim per day
* [ ] Consecutive login tracking
* [ ] Missed-day reset or recovery rule
* [ ] Milestone login rewards with bigger prizes
* [ ] Support milestone rewards with `ancoin`
* [ ] Support milestone rewards with shop items
* [ ] Daily reward notification and claim UI

---

## Student Economy

### Lives Mechanism

* [x] Consume 1 life per practice attempt
* [x] Restore 1 life every hour
* [x] Start each user with 6 lives
* [x] Increase max lives by 1 every 10 levels
* [x] Cap max lives at 12

### Ancoin Rewards

* [x] Reward `ancoin` for completed practice attempts
* [x] Ancoin wallet balance
* [x] Ancoin transaction history

### Shop Features

* [x] Avatar packs
* [x] Profile frames
* [x] Titles
* [x] Profile backgrounds
* [x] App themes
* [x] Study pets
* [x] Skip Guard (skip question with correct mark)
* [x] Pet eggs
* [x] Pet food and boosts
* [x] Streak shield
* [x] XP booster
* [x] Challenge tickets
* [x] AI tutor credits

### Level-Up Points

* [x] Award level points on level up
* [x] Spend 1 point to add 2 or 5 seconds to a game mode duration limit
* [x] Spend 10 points to add 1 total life, up to 3 extra lives
* [x] Spend 1 point to add 5% coin reward bonus to future rewards
* [x] Spend 1 point to add 5% XP reward bonus to future rewards
* [x] Spend 10 points to buy 1 extra game attempt (total 5)

---

## Competitive Learning

### Battle Mode
* [x] Topic battles

### Leaderboards

* [x] Global leaderboard
* [ ] Learning Unit leaderboard
---

# Phase 6 — Advanced Research Features

## Adaptive Learning Engine

### Student Modeling

* [ ] Knowledge state estimation
* [ ] Skill mastery tracking
* [ ] Difficulty estimation

### Recommendation Engine

* [ ] Next lesson prediction
* [ ] Weak topic recommendation
* [ ] Review scheduling

### Research Extensions

* [ ] Item Response Theory (IRT)
* [ ] Bayesian Knowledge Tracing (BKT)

---

## Procedural Question Generation

### Template Generator

* [ ] Variable substitution
* [ ] Constraint validation
* [ ] Difficulty scaling

### AST Generator

* [ ] Expression tree generation
* [ ] Equation generation
* [ ] Distractor generation

### Validation

* [ ] Solve generated question
* [ ] Verify uniqueness
* [ ] Difficulty scoring

---

# Phase 7 — Scalability

## Redis

### Caching

* [x] User profile cache
* [x] Lesson cache
* [x] Question cache
* [x] Permission cache

### Session Storage

* [ ] Chat sessions
* [x] Authentication sessions

---

## Queue System (BullMQ)

### Background Jobs

* [x] Email jobs
* [x] Notification jobs
* [x] Achievement jobs
* [x] Analytics jobs

### Chatbot Jobs

* [ ] Long-running generations
* [ ] Report generation
* [ ] Summaries

---

## Database Optimization

### PostgreSQL

* [x] Connection pooling
* [x] Index audit
* [x] Query optimization
* [x] Slow query logging

### MongoDB

* [ ] Compound indexes
* [ ] TTL collections
* [ ] Aggregation optimization

---

## Horizontal Scaling

### Backend

* [ ] PM2 cluster mode
* [ ] Multi-instance deployment
* [ ] Health check endpoints

### Load Balancer

* [ ] Nginx configuration
* [ ] Sticky session strategy
* [ ] Failover configuration

---

## Semantic Cache

### LLM Cache

* [ ] Similarity search
* [ ] Response cache
* [ ] Cache invalidation

---

# Phase 8 — Monitoring & Analytics

## Observability

### Metrics

* [ ] API latency
* [ ] Error rates
* [ ] Queue metrics
* [ ] Chatbot latency

### Monitoring

* [ ] Prometheus
* [ ] Grafana dashboards

### Alerting

* [ ] High error rate alerts
* [ ] High latency alerts
* [ ] Queue backlog alerts

---

# Phase 9 — Thesis Deliverables

## Experimental Evaluation

### Chatbot Research

* [ ] LLM vs LLM+SymPy accuracy comparison
* [ ] Hallucination reduction analysis
* [ ] Vietnamese-English benchmark

### RAG Research

* [ ] Vector vs lexical retrieval comparison
* [ ] Retrieval precision evaluation

### Adaptive Learning Research

* [ ] Learning gain analysis
* [ ] Recommendation effectiveness study

### Scalability Research

* [ ] Load testing
* [ ] Concurrent user benchmarks
* [ ] Response time analysis
* [ ] System throughput evaluation

---

## MVP Milestone

The minimum thesis-worthy version would be:

* [x] Learning platform
* [x] Question bank
* [x] FastAPI chatbot
* [x] Ollama integration
* [x] SymPy integration
* [x] MongoDB memory
* [ ] RAG retrieval
* [x] Gamification basics
* [ ] Redis cache
* [ ] Rate limiting
* [ ] Queue workers
* [ ] Monitoring dashboard

This MVP alone is already strong enough for a software engineering + AI thesis, with the later phases serving as distinction-level extensions.
