# JobPilot — Autonomous AI Job Application Platform

JobPilot is an end-to-end, production-grade autonomous job application engine. It features AI-driven job discovery, resume & cover letter tailoring, ATS scorecard evaluation, multi-tier apply adapters (API-first with Playwright browser fallback), rate limiting with exponential backoff, and human-in-the-loop verification gates.

---

## 🚀 Key Architecture & Services

### 1. Multi-Stage Workflow Engine (`WorkflowEngine`)
- **Batch Processing**: Sequentially processes pending applications in configurable batches with strict concurrency control.
- **Status Lifecycles**: `QUEUED` ➔ `RUNNING` ➔ `SUBMITTED` / `WAITING_FOR_USER` / `FAILED`.
- **Race Condition Prevention**: Employs atomic Prisma database transitions to ensure multi-worker synchronization without duplicate submissions.

### 2. Rate Limiting & Graceful Shutdown
- **Per-Company Rate Limiting**: Powered by Bottleneck (`APPLY_RATE_PER_HOUR_PER_COMPANY`, `APPLY_MIN_DELAY_MS`).
- **Exponential Backoff**: Jittered exponential delay for transient errors (`RETRY_BASE_MS`, `RETRY_MULTIPLIER`, `RETRY_MAX_MS`).
- **Error Classifier**: Categorizes errors into `TRANSIENT`, `RATE_LIMITED`, or `PERMANENT` (e.g. 404 closed postings terminate immediately).
- **Graceful Shutdown**: Drains worker pools, stops scheduling, and closes all Playwright browser contexts within `SHUTDOWN_TIMEOUT_S`.

### 3. API-First Application Submission (`ApplicationSubmitService`)
- **API Adapters (`ApplyAdapterRegistry`)**: Fast direct HTTP submissions for supported ATS platforms (Greenhouse, Ashby, Lever).
- **Browser Fallback (`BrowserPool`)**: Playwright Chromium pool with anti-bot fingerprint masking, dynamic viewport randomization, and DOM adapters.
- **Human-in-the-Loop Gating**: Detects CAPTCHAs and missing profile fields, immediately switching state to `WAITING_FOR_USER` and dispatching real-time notifications.

### 4. AI-Powered Tailoring & ATS Scoring
- **Resume Tailoring (`ResumeTailorService`)**: Tailors resumes to job requirements, persisting tailored versions with `tailored=true`.
- **Cover Letter Generation (`CoverLetterService`)**: Creates custom, highly specific 200+ character letters tailored to the candidate and role.
- **JD Match Scoring (`ATSService`)**: Evaluates keyword overlaps, semantic matches, and generates scorecards persisted to `Application.matchScore`.

---

## 🛠️ Prerequisites & Installation

### Requirements
- **Node.js**: `v20.x` or `v22.x`
- **pnpm**: `v9.x` or `v10.x`
- **PostgreSQL**: Running instance

### Setup Steps

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Install Playwright Browser Binaries**:
   ```bash
   npx playwright install chromium
   ```

3. **Database Migration & Generation**:
   ```bash
   pnpm --filter @jobpilot/database prisma db push
   pnpm --filter @jobpilot/database prisma generate
   ```

4. **Environment Variables**:
   Copy `.env.example` to `.env` in `apps/server`:
   ```env
   PORT=8000
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobpilot?schema=public
   JWT_SECRET=jobpilot-super-secret-jwt-key-2026
   QUEUE_CONCURRENCY=2
   APPLY_RATE_PER_HOUR_PER_COMPANY=3
   APPLY_MIN_DELAY_MS=4000
   HEADLESS=new
   ```

---

## 🧪 Testing & Verification

### Running the Full Test Suite
```bash
cd apps/server
npx tsx --test src/__tests__/**/*.test.ts
```

### Running TypeScript Verification
```bash
# Server typecheck
cd apps/server
npx tsc --noEmit

# Frontend typecheck
cd apps/web
npx tsc --noEmit
```

---

## 📡 Core API Routes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/applications/:id/submit` | Enqueues and initiates asynchronous application submission (HTTP 202) |
| `POST` | `/api/v1/applications/discover-and-apply` | Discovers live openings across sources and enqueues matches for application |
| `POST` | `/api/v1/agent/run` | Triggers a LangGraph agent run for discovery and evaluation |
| `POST` | `/api/v1/agent/run/:threadId/resume` | Resumes an agent run after human action completion |
| `GET`  | `/api/v1/applications` | Lists all applications with match scores, scorecard, and status |
| `GET`  | `/api/v1/sources/jobs` | Queries aggregated job boards with location and keyword filtering |
