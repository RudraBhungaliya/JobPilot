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
   pnpm db:migrate:deploy
   pnpm db:generate
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

## Production database and health checks

- Set `NODE_ENV=production`, a reachable managed PostgreSQL `DATABASE_URL`, and a unique random `JWT_SECRET` of at least 32 characters. The server rejects the checked-in development defaults in production.
- Apply schema changes with `pnpm db:migrate:deploy` during the release. `pnpm db:push` is for local development and should not be used as the production migration process.
- New databases can apply the initial migration directly. If a database already has this schema from `db push`, first compare it with `packages/database/prisma/schema.prisma`; baseline the initial migration with `prisma migrate resolve --applied 20261013000000_init` only after confirming the existing schema matches.
- Use `GET /health/live` for process liveness and `GET /health/ready` for readiness (including PostgreSQL connectivity). `GET /health` also reports database latency, queue worker/scheduler state, uptime, and memory use.
- The server writes structured Pino logs to stdout. Collect stdout/stderr and alert on readiness failures, queue error/retry volume, and sustained resource growth in the chosen hosting platform.
- Human-intervention emails use Resend (`RESEND_API_KEY` and `RESEND_FROM_EMAIL` or `EMAIL_FROM`) or SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`). Configure one provider to receive application checkpoint alerts.

JobPilot has no hosting provider or production database target configured in this repository. Deployment still requires choosing a host, provisioning PostgreSQL, setting secrets there, and adding the migration and readiness checks to that host's release process.
