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

* [ ] Rate limit login endpoint
* [ ] Rate limit signup endpoint
* [ ] Rate limit password reset endpoint
* [ ] Add account lockout after repeated failures
* [ ] Add refresh token rotation
* [ ] Add JWT expiration strategy

### Infrastructure

* [ ] Configure environment validation
* [ ] Add Docker health checks
* [ ] Configure production secrets management
* [ ] Add backup strategy for PostgreSQL
* [ ] Add MongoDB backup strategy

---

# Phase 1 — Core Learning Platform

## Lesson System

### Lesson Management

* [ ] CRUD lessons
* [ ] CRUD chapters
* [ ] CRUD topics
* [ ] Markdown lesson editor
* [ ] KaTeX rendering support
* [ ] Lesson versioning

### Student Learning

* [ ] Lesson viewer
* [ ] Progress tracking
* [ ] Lesson completion tracking
* [ ] Resume last lesson
* [ ] Learning streak tracking

---

## Question Bank

### Question Management

* [ ] CRUD questions
* [ ] Question categories
* [ ] Question difficulty levels
* [ ] Question tagging
* [ ] Question import/export

### Practice Engine

* [ ] Generate practice sets
* [ ] Random question selection
* [ ] Adaptive difficulty
* [ ] Instant feedback
* [ ] Answer explanations

### Testing Engine

* [ ] Timed tests
* [ ] Auto grading
* [ ] Test history
* [ ] Performance analytics

---

# Phase 2 — Math Tutor Chatbot

## Chatbot Core

### FastAPI Service

* [ ] Create chatbot service
* [ ] Chat session management
* [ ] Conversation persistence
* [ ] Streaming responses
* [ ] Conversation history API

### Ollama Integration

* [ ] Deploy Ollama server
* [ ] Integrate Qwen model
* [ ] Prompt management system
* [ ] Response post-processing

### SymPy Integration

* [ ] Expression parser
* [ ] Calculation engine
* [ ] Equation solver
* [ ] Algebra simplification
* [ ] Fraction support
* [ ] Geometry helper
* [ ] Validation layer

---

## Tool-Augmented LLM

### Intent Routing

* [ ] Detect calculation requests
* [ ] Detect explanation requests
* [ ] Detect hint requests
* [ ] Detect proof requests
* [ ] Detect word problems

### Tool Calling

* [ ] Route calculations to SymPy
* [ ] Route explanations to LLM
* [ ] Merge tool outputs
* [ ] Confidence scoring

---

## Multilingual Support

### Language Detection

* [ ] Vietnamese detection
* [ ] English detection
* [ ] Mixed-language detection

### Prompt Routing

* [ ] Vietnamese prompt templates
* [ ] English prompt templates
* [ ] Bilingual explanations

---

# Phase 3 — Student Memory System

## MongoDB Memory Layer

### Profile Tracking

* [ ] Store learning history
* [ ] Store weak topics
* [ ] Store strengths
* [ ] Store preferred language

### Mistake Tracking

* [ ] Record wrong answers
* [ ] Categorize mistakes
* [ ] Frequency analysis
* [ ] Improvement tracking

### Adaptive Responses

* [ ] Hint-first mode
* [ ] Step-by-step mode
* [ ] Full solution mode
* [ ] Personalized recommendations

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

## Experience System

### XP Engine

* [ ] Award XP
* [ ] XP history
* [ ] XP leaderboard

### Achievement System

* [ ] Achievement definitions
* [ ] Achievement unlock logic
* [ ] Achievement notifications

### Streak System

* [ ] Daily streak
* [ ] Weekly streak
* [ ] Recovery mechanics

---

## Competitive Learning

### Matchmaking

* [ ] Rating system
* [ ] Glicko-2 implementation
* [ ] Student matchmaking

### Battle Mode

* [ ] 1v1 challenges
* [ ] Topic battles
* [ ] Live scoring

### Leaderboards

* [ ] Global leaderboard
* [ ] School leaderboard
* [ ] Class leaderboard

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

* [ ] User profile cache
* [ ] Lesson cache
* [ ] Question cache
* [ ] Permission cache

### Session Storage

* [ ] Chat sessions
* [ ] Authentication sessions

---

## Queue System (BullMQ)

### Background Jobs

* [ ] Email jobs
* [ ] Notification jobs
* [ ] Achievement jobs
* [ ] Analytics jobs

### Chatbot Jobs

* [ ] Long-running generations
* [ ] Report generation
* [ ] Summaries

---

## Database Optimization

### PostgreSQL

* [ ] Connection pooling
* [ ] Index audit
* [ ] Query optimization
* [ ] Slow query logging

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

* [ ] Learning platform
* [ ] Question bank
* [ ] FastAPI chatbot
* [ ] Ollama integration
* [ ] SymPy integration
* [ ] MongoDB memory
* [ ] RAG retrieval
* [ ] Gamification basics
* [ ] Redis cache
* [ ] Rate limiting
* [ ] Queue workers
* [ ] Monitoring dashboard

This MVP alone is already strong enough for a software engineering + AI thesis, with the later phases serving as distinction-level extensions.
