# JobPilot — Autonomous AI-Powered Career Agent & Application Automation Platform

JobPilot is a production-grade, end-to-end autonomous career automation platform designed to discover, tailor, evaluate, and submit job applications at scale while preserving strict data authenticity, anti-ban rate limiting, and evidence-backed submission auditing.

Built around a modern TypeScript monorepo architecture, JobPilot integrates **Next.js 16**, **Express 5**, **PostgreSQL via Prisma ORM**, **LangGraph workflow state graphs**, **Playwright headless browser pools with anti-bot fingerprint masking**, and a **Human-in-the-Loop (HITL) interactive checkpoint engine**.

<div align="center">
  <img src="docs/architecture/jobpilot-architecture.svg" alt="JobPilot System Architecture" width="100%" style="border-radius: 12px; border: 1px solid #1e293b; box-shadow: 0 20px 40px rgba(0,0,0,0.8);" />
</div>

---

## Table of Contents

- [1. Overview & Core Value Proposition](#1-overview--core-value-proposition)
- [2. Features](#2-features)
- [3. System Architecture](#3-system-architecture)
- [4. Tech Stack](#4-tech-stack)
- [5. Core Services & Modules](#5-core-services--modules)
- [6. Request Flow & Data Flow](#6-request-flow--data-flow)
- [7. Database Design & Schema](#7-database-design--schema)
- [8. API Documentation](#8-api-documentation)
- [9. Project Structure](#9-project-structure)
- [10. Getting Started](#10-getting-started)
- [11. Environment Variables](#11-environment-variables)
- [12. Deployment & CI/CD](#12-deployment--cicd)
- [13. Testing & Verification](#13-testing--verification)
- [14. Security & Reliability](#14-security--reliability)
- [15. Roadmap & Future Improvements](#15-roadmap--future-improvements)

---

## 1. Overview & Core Value Proposition

Traditional job automation scripts rely on brittle web-scraping heuristics, submit duplicate profiles, invent synthetic confirmation codes, or trigger silent bot blocks from applicant tracking systems (ATS). JobPilot was architected from the ground up to solve these fundamental engineering challenges:

- **Evidence-Backed State Transitions**: Statuses like `SUBMITTED` and `APPLIED` cannot be assumed or fabricated; they strictly require verified employer confirmation references or deterministic submission receipts.
- **Idempotent Notification Strategy**: Atomic database tracking ensures that retries, worker restarts, or progression through statuses never result in duplicate emails to candidates.
- **Adaptive ATS Submission Engine**: Implements API-first submission adapters for structured platforms (Greenhouse, Ashby, Lever) with resilient Playwright Chromium fallback featuring anti-detection viewport masking and universal DOM heuristics.
- **Human-in-the-Loop (HITL) Checkpoints**: When portals present CAPTCHAs, two-factor authentication (2FA), or unexpected screening questions, execution safely pauses. The candidate receives an email and in-app checkpoint token to complete the missing fields, whereupon the automation seamlessly resumes without restarting the pipeline.
- **Bounded Rate Limiting & Anti-Ban Controls**: Token-bucket pacing per employer domain avoids platform blacklisting and rate-limit penalties.

---

## 2. Features

### Implemented Functionality

- **Autonomous Job Discovery & Ingestion**:
  - Direct live ATS querying for major platforms (Greenhouse, Ashby, Lever, Workday) and external aggregators (JSearch, Google Jobs).
  - Domain deduplication, ATS platform auto-detection, and location-aware filtering.
- **AI-Powered ATS Tailoring & Evaluation**:
  - LLM-assisted resume tailoring aligning candidate experiences to target job descriptions.
  - Multi-dimensional ATS match scorecards evaluating skills, experience, and role alignment.
  - Contextual 200+ character cover letter generation tailored to company mission.
- **Resilient Execution & Adapter Registry**:
  - API adapters for high-throughput, low-latency ATS platforms.
  - Universal DOM adapter handling arbitrary form layouts, complex selectors, checkboxes, radio groups, and custom questions.
  - Multi-instance Playwright browser pool with stealth fingerprinting, randomized viewports, and bounded pool lifecycle.
- **Interactive Human-in-the-Loop Checkpoints**:
  - Ephemeral JWT-scoped checkpoint resolution links sent via email.
  - Dedicated interactive checkpoint portal (`/checkpoint/:id`) rendering pre-filled values and isolated inputs for missing screening questions.
  - Direct post-resolution submission triggering without state reset.
- **Strict Canonical State Machine**:
  - Transactional status transitions (`DISCOVERED` ➔ `QUEUED` ➔ `TAILORING` ➔ `READY_TO_SUBMIT` ➔ `SUBMITTING` ➔ `WAITING_FOR_USER` ➔ `RESUMED` ➔ `SUBMITTED` ➔ `APPLIED`).
  - Strict validation preventing invalid state jumps or false-success reporting.
- **Idempotent Multi-Channel Telemetry**:
  - Real-time Server-Sent Events (SSE) broadcasting pipeline progress to the web cockpit.
  - Responsive HTML confirmation emails delivered via Resend or SMTP featuring official employer confirmation references, candidate name, resume attachment status, and timestamps.
  - Configurable sandbox routing with explicit subject tagging to prevent test emails from leaking to external recipients.
- **Persistent Job Queue & Pacing**:
  - PostgreSQL-backed `ApplicationQueue` with priority, retry limits, backoff delays, and per-company Bottleneck rate limiters.
  - Background scheduler (`JobSearchLoop`) executing scheduled recurring job searches.

### Planned Features / Roadmap

- Multi-tenant team collaboration and recruiter review workflows.
- Webhook ingestion for external ATS status callbacks.
- Bi-directional Gmail/Outlook integration for automated interview scheduling detection.

---

## 3. System Architecture

JobPilot is organized as a monorepo with clean separation between the frontend presentation cockpit, the backend orchestration engine, and the shared database access layer.

<div align="center">
  <img src="docs/architecture/jobpilot-architecture.svg" alt="JobPilot System Architecture Diagram" width="100%" style="border-radius: 12px; border: 1px solid #1e293b; box-shadow: 0 20px 40px rgba(0,0,0,0.8);" />
</div>

<br/>

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'darkMode': true, 'background': '#0a0d14', 'primaryColor': '#1e293b', 'primaryTextColor': '#f8fafc', 'primaryBorderColor': '#38bdf8', 'lineColor': '#38bdf8', 'secondaryColor': '#0f172a', 'tertiaryColor': '#111827' }}}%%
flowchart TD
    subgraph ClientLayer["🖥️ Frontend Cockpit (Next.js 16)"]
        UI["Web Dashboard (React 19 / Tailwind v4)"]
        SSE_Client["SSE Telemetry Listener"]
        HITL_Portal["Checkpoint Resolver (/checkpoint/:id)"]
    end

    subgraph GatewayLayer["🛡️ API Gateway & Security (Express 5)"]
        Ingress["Ingress Router (Port 8000)"]
        Auth["JWT / Checkpoint Auth Middleware"]
        PinoLogger["Pino Structured Diagnostics"]
    end

    subgraph MonorepoCore["⚙️ Orchestration Engine (apps/server)"]
        StateMachine["State Machine (Audit Guard & Invariants)"]
        QueueWorker["Queue Worker (Pessimistic Row Locking)"]
        RateLimiter["Bottleneck Rate Limiter (3/hr per Domain)"]
        LoopEngine["Loop Scheduler (Cron Role Ingestion)"]
        SSEBroadcaster["SSE Event Emitter (application.status)"]
    end

    subgraph CloudSatellites["☁️ Database & Intelligence"]
        Postgres[("PostgreSQL 16 (Prisma @prisma/pg)")]
        AIEngine["Gemini & OpenAI LLM (Tailoring & ATS Scorecards)"]
    end

    subgraph ExecutionLayer["🤖 Execution & Browser Pool (Playwright)"]
        AdapterRegistry["ApplyAdapterRegistry (Direct REST / DOM)"]
        BrowserPool["BrowserPool (Stealth Chromium Contexts)"]
        DomAdapter["UniversalDomAdapter (Autofill & Uploads)"]
    end

    subgraph ExternalTargets["🏢 Target Employer Systems"]
        LiveATS["Employer ATS Portals (Greenhouse, Ashby, Lever, Workday)"]
    end

    subgraph NotificationLayer["✉️ Notification Gateway"]
        EmailGateway["Resend & SMTP Email Service (Idempotent Alerts)"]
    end

    UI -->|REST / Cookies| Ingress
    Ingress --> Auth
    Auth --> StateMachine
    Auth --> QueueWorker
    Auth --> LoopEngine

    QueueWorker --> RateLimiter
    RateLimiter -->|Paced Execution| AdapterRegistry
    AdapterRegistry -->|Direct REST Submission| LiveATS
    AdapterRegistry -->|Headless Fallback| BrowserPool
    BrowserPool --> DomAdapter
    DomAdapter -->|Autofill & File Chooser| LiveATS

    LiveATS -->|Official Receipt / Confirmation Code| StateMachine
    LiveATS -.->|CAPTCHA / Interactive Challenge| BrowserPool
    BrowserPool -.->|Trigger Intervention| StateMachine

    StateMachine -->|Commit Status & Audit Logs| Postgres
    StateMachine -->|Idempotent Confirmation Alert| EmailGateway
    StateMachine -.->|Checkpoint Resolution Link| EmailGateway
    EmailGateway -.->|Email Delivered| HITL_Portal

    HITL_Portal -->|POST /resolve-checkpoint| Ingress
    LoopEngine --> AIEngine
    AIEngine --> Postgres

    SSEBroadcaster -.->|application.status_changed| SSE_Client

    classDef clientClass fill:#111827,stroke:#38bdf8,stroke-width:1.5px,color:#f8fafc;
    classDef coreClass fill:#1e293b,stroke:#475569,stroke-width:1.5px,color:#f8fafc;
    classDef targetClass fill:#0f172a,stroke:#10b981,stroke-width:1.5px,color:#34d399;
    classDef alertClass fill:#78350f,stroke:#f59e0b,stroke-width:1.5px,color:#fbbf24;

    class UI,SSE_Client clientClass;
    class HITL_Portal alertClass;
    class LiveATS targetClass;
```

### End-to-End Processing Stages

| Step | Component / Phase | Operation & Behavior |
|:---:|:---|:---|
| **1** | **Search Loop Engine** | Evaluates active recurring loops, discovers target openings via API scrapers or live boards, normalizes metadata, and persists records to `Job`. |
| **2** | **Candidate Matching** | Analyzes the candidate profile against job requirements. Computes semantic relevance and ATS scorecards. Matches above threshold are moved to `ApplicationStatus.QUEUED`. |
| **3** | **Queue Worker & Pacing** | Claims pending jobs with pessimistic row locking (`lockedAt`, `lockedBy`), checks company rate limits via Bottleneck, and paces requests to prevent anti-bot bans. |
| **4** | **Resume & Letter Tailoring** | Gemini/OpenAI engine generates tailored ATS bullet points and a targeted cover letter, attaching the tailored resume buffer. |
| **5** | **Adapter Execution** | Determines ATS provider. Executes API submission if supported; otherwise, checks out an anti-detection browser from `BrowserPool` to autofill inputs, select dropdowns, and upload resume files. |
| **6** | **HITL Gating (Conditional)** | If a CAPTCHA, 2FA, or unmapped required question appears, the worker saves state, transitions to `WAITING_FOR_USER`, and emails the candidate a scoped checkpoint link. |
| **7** | **Checkpoint Resolution** | Candidate submits missing responses via `/checkpoint/:id`. The state transitions to `RESUMED` and immediately triggers direct submission. |
| **8** | **Evidence Verification** | Inspects confirmation pages or API receipts for official confirmation codes. Verifies evidence before allowing transition to `SUBMITTED`. |
| **9** | **Idempotent Notification** | Atomically records notification in PostgreSQL and dispatches an official HTML confirmation alert to the candidate. Progression to `APPLIED` suppresses duplicate dispatches. |

---

## 4. Tech Stack

| Category | Technology | Purpose & Repository Verification |
|:---|:---|:---|
| **Monorepo Architecture** | pnpm Workspaces | Root package manager organizing `apps/` and `packages/` |
| **Frontend Framework** | Next.js 16.2.10 (React 19.2.4) | Server-rendered and dynamic App Router cockpit with Turbopack |
| **Styling & Icons** | Tailwind CSS v4, Lucide React | High-performance styling and interface iconography |
| **Backend Framework** | Express 5.2.1 (Node.js 20+) | High-throughput REST API with native Promise error handling |
| **Database & ORM** | PostgreSQL, Prisma 7.10.0 | Relational database with `@prisma/adapter-pg` connection pool |
| **AI / LLM Orchestration** | Google Gemini (`@google/genai`), OpenAI | Candidate profiling, ATS scoring, cover letters, LangGraph |
| **Workflow State Graph** | LangGraph (`@langchain/langgraph`) | Cyclical multi-node state graphs for autonomous agents |
| **Browser Automation** | Playwright 1.62.1 (Chromium) | Headless browser automation with stealth script injection |
| **Queue & Concurrency** | Bottleneck 2.19.5, PostgreSQL Queue | Distributed rate limiting, per-company delay windows, exponential backoff |
| **Email Gateway** | Resend 4.1.2, Nodemailer 10.0 | Transactional notifications and human-intervention alerts |
| **Real-Time Streaming** | Server-Sent Events (SSE) | Unidirectional event broadcast via EventEmitter to web client |
| **Document Processing** | `pdf-parse`, `mammoth` | Parsing and structured extraction of PDF and DOCX resumes |
| **Security & Middleware** | Helmet 8.3, Cookie-Parser, CORS, JWT | Security headers, scoped cookies, access/refresh tokens |
| **Logging & Diagnostics** | Pino 10.3, Pino-Http | Structured JSON logging with trace context |
| **Testing Framework** | Node.js Test Runner (`node:test`, `tsx`) | Native TypeScript regression and acceptance testing |
| **CI/CD Automation** | GitHub Actions | Automated lint, build, Prisma migration, and regression tests |

---

## 5. Core Services & Modules

### 5.1. Job Discovery & Crawler Module (`apps/server/src/modules/job`, `sources`, `crawler`)
- **Responsibility**: Ingests job openings from aggregators (JSearch, Google Jobs) and direct ATS career sites (Greenhouse, Ashby, Lever).
- **Key Operations**:
  - Deduplicates jobs using normalized employer domains and external job IDs.
  - Automatically identifies underlying ATS platforms via regex and DOM heuristics.
  - Filters out expired postings and ranks openings against active candidate preferences.
- **Dependencies**: PostgreSQL (`Job`, `Company`), external HTTP endpoints.

### 5.2. Resume Parser & Profile Service (`apps/server/src/modules/resume`, `profile`)
- **Responsibility**: Manages candidate profile data, work history, skill taxonomies, and resume files.
- **Key Operations**:
  - Ephemeral and persistent text extraction from PDF (`pdf-parse`) and DOCX (`mammoth`).
  - Syncs candidate profile updates bidirectionally when resolved in checkpoints.
  - Generates normalized candidate contexts for prompt injection and browser auto-fill.
- **Dependencies**: Multer file upload handler, PostgreSQL (`Profile`, `Resume`).

### 5.3. AI Tailoring & Evaluation Engine (`apps/server/src/modules/ai`, `ats`)
- **Responsibility**: Evaluates job descriptions against candidate qualifications and generates tailored assets.
- **Key Operations**:
  - Evaluates keyword density, hard skills, and experience overlaps to generate a 0–100 match score.
  - Generates ATS-optimized resume bullet points tailored to specific job postings.
  - Produces company-specific cover letters adhering to tone and character constraints.
- **Dependencies**: `@google/genai`, OpenAI API, fallback heuristic matchers.

### 5.4. Application State Machine (`apps/server/src/modules/application/application-state-machine.ts`)
- **Responsibility**: Enforces canonical application lifecycle transitions and audit logging.
- **Key Operations**:
  - Restricts state transitions according to a strict lifecycle graph.
  - Blocks transitions to `SUBMITTED` or `APPLIED` unless verified evidence is attached.
  - Synchronizes `ApplicationQueue` records to prevent state drift.
  - Dispatches idempotent notification alerts upon reaching critical states.
- **Dependencies**: Prisma transaction client, `EmailService`, SSE `EventEmitter`.

### 5.5. Browser Manager & Adapter Registry (`apps/server/src/modules/browser`, `application/adapters`)
- **Responsibility**: Manages headless Chromium instances and executes automated form submissions.
- **Key Operations**:
  - Maintains a pooled set of Playwright browser instances (`BrowserPool`).
  - Injects anti-bot fingerprint overrides, user-agent spoofing, and randomized viewport sizes.
  - Routes URLs to dedicated platform adapters (Greenhouse, Lever, Ashby, Workday) or falls back to the `UniversalDomAdapter`.
  - Automatically handles resume file uploads via Playwright file-chooser interception.
- **Dependencies**: Playwright Chromium binary, DOM selector engine.

### 5.6. Queue Worker & Bottleneck Rate Limiter (`apps/server/src/modules/queue`, `workflow`)
- **Responsibility**: Schedules and paces application submissions to adhere to ATS rate limits.
- **Key Operations**:
  - Fetches unlocked queue jobs with bounded concurrency (`QUEUE_CONCURRENCY`).
  - Applies per-company rate limiting (`APPLY_RATE_PER_HOUR_PER_COMPANY`, `APPLY_MIN_DELAY_MS`).
  - Computes jittered exponential backoff delays for transient network faults.
  - Provides graceful shutdown listeners draining in-flight jobs.
- **Dependencies**: `bottleneck`, PostgreSQL `ApplicationQueue`.

### 5.7. Human-in-the-Loop (HITL) Checkpoint Service (`apps/server/src/modules/human-action`)
- **Responsibility**: Pauses execution when human intervention is required and facilitates out-of-band resolution.
- **Key Operations**:
  - Detects CAPTCHA challenges, two-factor auth, and mandatory unmapped fields.
  - Generates tamper-proof, time-limited JWT checkpoint tokens.
  - Dispatches candidate notification emails containing one-click resolution links.
  - Receives completed answers, auto-syncs profile fields, and triggers immediate pipeline resumption.
- **Dependencies**: JWT signing utilities, PostgreSQL `HumanAction`.

### 5.8. Notification & Email Service (`apps/server/src/modules/notification`)
- **Responsibility**: Manages in-app alerts and transactional email communication.
- **Key Operations**:
  - Delivers rich HTML emails via Resend API or SMTP gateway.
  - Implements development sandbox routing preventing accidental emails to third parties.
  - Ensures exactly-once delivery semantics for submission confirmations.
- **Dependencies**: `resend`, `nodemailer`, PostgreSQL `Notification`.

---

## 6. Request Flow & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Candidate
    participant Cockpit as Web Cockpit (Next.js)
    participant API as Server API (Express)
    participant Queue as Queue Worker
    participant StateMachine as State Machine
    participant Adapter as Apply Adapter
    participant ATS as Employer ATS Portal
    participant DB as PostgreSQL Database
    participant Email as Email Gateway (Resend)

    Candidate->>Cockpit: Trigger Auto-Apply or Scheduled Loop
    Cockpit->>API: POST /api/v1/applications/auto-apply
    API->>DB: Create Application (status: QUEUED) & ApplicationQueue
    API-->>Cockpit: HTTP 202 Accepted { applicationId }

    Queue->>DB: Fetch & Lock Available Queue Job
    Queue->>StateMachine: transition(status: TAILORING)
    StateMachine->>DB: Update Application status & StatusTransition log
    StateMachine-->>Cockpit: SSE: application.status_changed (TAILORING)

    Queue->>StateMachine: transition(status: SUBMITTING)
    Queue->>Adapter: submit(candidateContext, jobUrl)
    Adapter->>ATS: Navigate & Autofill Form Fields

    alt Interactive Verification Encountered (CAPTCHA / 2FA / Custom Questions)
        Adapter-->>Queue: requiresUserIntervention(missingFields, token)
        Queue->>StateMachine: transition(status: WAITING_FOR_USER)
        StateMachine->>DB: Create HumanAction record & update Queue
        StateMachine->>Email: sendHumanInterventionAlert(actionUrl, token)
        Email-->>Candidate: Checkpoint Email Delivered
        StateMachine-->>Cockpit: SSE: application.status_changed (WAITING_FOR_USER)

        Candidate->>Cockpit: Open /checkpoint/:id?token=...
        Candidate->>Cockpit: Fill Missing Answers & Click Submit
        Cockpit->>API: POST /api/v1/applications/:id/resolve-checkpoint
        API->>DB: Resolve HumanAction & update Profile
        API->>Adapter: Re-execute submission with user inputs
    end

    Adapter->>ATS: Submit Application Form
    ATS-->>Adapter: Official Confirmation Page (Reference: CONF-12345)
    Adapter-->>Queue: Submission Success { confirmationId: "CONF-12345" }

    Queue->>StateMachine: transition(status: SUBMITTED, metadata: { confirmationCode })
    StateMachine->>DB: Commit status=SUBMITTED, confirmationCode, queue=COMPLETED
    StateMachine->>DB: Atomic Check & Record Notification(APPLICATION_SUBMITTED)
    StateMachine->>Email: sendApplicationStatusAlert(confirmationCode, timestamp)
    Email-->>Candidate: Official Confirmation Email Delivered
    StateMachine-->>Cockpit: SSE: application.status_changed (SUBMITTED)
```

---

## 7. Database Design & Schema

The PostgreSQL database schema is managed through Prisma ORM (`packages/database/prisma/schema.prisma`).

```mermaid
erDiagram
    User ||--o| Profile : "has profile"
    User ||--o{ Resume : "uploads"
    User ||--o{ Application : "owns"
    User ||--o{ ApplicationQueue : "enqueues"
    User ||--o{ Notification : "receives"
    User ||--o{ AuditLog : "triggers"
    User ||--o{ JobSearchLoop : "schedules"

    Profile ||--o{ ProfileExperience : "includes"
    Profile ||--o{ ProfileEducation : "includes"
    Profile ||--o{ ProfileSkill : "includes"
    Profile ||--o{ ProfileProject : "includes"

    Company ||--o{ Job : "lists"
    Job ||--o{ Application : "receives"
    Resume ||--o{ Application : "attached to"

    Application ||--o| ApplicationQueue : "synchronized with"
    Application ||--o{ ApplicationStatusTransition : "logs"
    Application ||--o{ HumanAction : "prompts"
    Application ||--o{ Notification : "references"
```

### Key Models & Indexes

| Model | Primary Keys / Indexes | Relations & Cardinality | Integrity Rules & Constraints |
|:---|:---|:---|:---|
| **`User`** | `id` (cuid)<br>Unique: `email` | `Profile` (1:1), `Resume` (1:N), `Application` (1:N) | Cascade deletes child assets on user deletion. |
| **`Profile`** | `id` (cuid)<br>Unique: `userId` | `User` (N:1), Experiences, Educations, Skills, Projects | Stores structured candidate background for auto-fill. |
| **`Job`** | `id` (cuid)<br>Indexes: `companyId`, `atsProvider` | `Company` (N:1), `Application` (1:N) | Normalizes URL, location, and ATS provider identifier. |
| **`Resume`** | `id` (cuid)<br>Indexes: `userId` | `User` (N:1), `Application` (1:N) | Tracks parsed text, ATS keywords, and file URLs. |
| **`Application`** | `id` (cuid)<br>Unique: `[userId, jobId]`<br>Indexes: `status`, `resumeId` | `Job` (N:1), `User` (N:1), `Resume` (N:1), `ApplicationQueue` (1:1) | Compound unique constraint prevents duplicate applications for same user and job. |
| **`ApplicationQueue`**| `id` (cuid)<br>Unique: `applicationId`<br>Indexes: `status`, `priority`, `availableAt` | `Application` (1:1), `User` (N:1) | Tracks worker locking (`lockedAt`, `lockedBy`), attempts, and execution backoff. |
| **`ApplicationStatusTransition`** | `id` (cuid)<br>Indexes: `applicationId`, `createdAt` | `Application` (N:1) | Immutable audit log recording every lifecycle status transition with actor and reason. |
| **`HumanAction`** | `id` (cuid)<br>Indexes: `applicationId`, `userId`, `status` | `Application` (N:1), `User` (N:1) | Stores JSON schema of required interactive fields and verification status. |
| **`Notification`** | `id` (cuid)<br>Indexes: `userId`, `applicationId`, `createdAt` | `User` (N:1), `Application` (N:1) | Drives in-app notification center and prevents duplicate email dispatches. |
| **`JobSearchLoop`** | `id` (cuid)<br>Indexes: `userId`, `status`, `nextRunAt` | `User` (N:1) | Stores scheduled query criteria, execution intervals, and matching statistics. |

---

## 8. API Documentation

All routes are mounted under `/api/v1` and return standard JSON payloads. Protected routes require a valid `Bearer <token>` in the `Authorization` header or an authenticated session cookie.

### 8.1. Applications & Execution (`/api/v1/applications`)

| Method | Endpoint | Purpose | Auth Required |
|:---|:---|:---|:---:|
| `GET` | `/api/v1/applications` | Lists all applications with filtering and status pagination | Yes |
| `POST` | `/api/v1/applications` | Creates a manual application record | Yes |
| `GET` | `/api/v1/applications/:id` | Fetches complete application details, audit history, and scorecard | Yes |
| `PATCH`| `/api/v1/applications/:id` | Updates application metadata or notes | Yes |
| `DELETE`| `/api/v1/applications/:id`| Soft-deletes or removes an application record | Yes |
| `POST` | `/api/v1/applications/auto-apply` | Enqueues matching jobs for automated execution | Yes |
| `POST` | `/api/v1/applications/discover-and-apply` | Discovers live openings and enqueues matches | Yes |
| `POST` | `/api/v1/applications/:id/submit` | Initiates immediate asynchronous submission worker | Yes |
| `POST` | `/api/v1/applications/:id/resume` | Resumes an application paused in `WAITING_FOR_USER` | Yes |
| `POST` | `/api/v1/applications/:id/resolve-checkpoint` | Submits answers for interactive HITL checkpoint and resumes pipeline | Yes (or Token) |
| `GET` | `/api/v1/applications/pipeline/stats` | Returns aggregate pipeline counts grouped by lifecycle status | Yes |

### 8.2. Autonomous Loops & Scheduling (`/api/v1/loops`)

| Method | Endpoint | Purpose | Auth Required |
|:---|:---|:---|:---:|
| `GET` | `/api/v1/loops` | Lists all active and paused search loops | Yes |
| `POST` | `/api/v1/loops` | Configures and creates a new scheduled job search loop | Yes |
| `GET` | `/api/v1/loops/:id` | Retrieves loop configuration, criteria, and execution metrics | Yes |
| `PATCH`| `/api/v1/loops/:id` | Modifies loop query parameters, match thresholds, or cron timing | Yes |
| `DELETE`| `/api/v1/loops/:id` | Deletes a search loop | Yes |
| `POST` | `/api/v1/loops/:id/run` | Triggers an immediate execution cycle for the specified loop | Yes |
| `POST` | `/api/v1/loops/:id/pause` | Pauses recurring execution for the loop | Yes |
| `POST` | `/api/v1/loops/:id/resume` | Resumes scheduled recurring execution for the loop | Yes |
| `POST` | `/api/v1/loops/execute-due` | Triggers background processing of all loops due for execution | Yes |

### 8.3. Queue Management & Worker Status (`/api/v1/queue`)

| Method | Endpoint | Purpose | Auth Required |
|:---|:---|:---|:---:|
| `GET` | `/api/v1/queue/user` | Lists queue items and execution status for current user | Yes |
| `GET` | `/api/v1/queue/worker-status` | Reports active concurrency, pool capacity, and uptime | Yes |
| `GET` | `/api/v1/queue/rate-limits` | Inspects per-company token-bucket limiter state and delays | Yes |
| `POST` | `/api/v1/queue/dispatch-batch` | Manually triggers queue worker execution batch | Yes |
| `GET` | `/api/v1/queue/pending` | Lists pending queue jobs awaiting worker slots | Yes |

### 8.4. Jobs & Live Discovery (`/api/v1/jobs`)

| Method | Endpoint | Purpose | Auth Required |
|:---|:---|:---|:---:|
| `GET` | `/api/v1/jobs/live` | Fetches live postings from public ATS boards without authentication block | Optional |
| `GET` | `/api/v1/jobs/discover` | Discovers target roles based on keyword and location queries | No |
| `GET` | `/api/v1/jobs` | Lists cached and ingested jobs | Yes |
| `POST` | `/api/v1/jobs/ingest` | Manually ingests an opening from a direct URL | Yes |
| `GET` | `/api/v1/jobs/:id` | Retrieves specific job listing details | Yes |

### 8.5. Resumes & AI Services (`/api/v1/resumes`, `/api/v1/ai`)

| Method | Endpoint | Purpose | Auth Required |
|:---|:---|:---|:---:|
| `POST` | `/api/v1/resumes` | Uploads and parses a PDF or DOCX resume | Yes |
| `POST` | `/api/v1/resumes/preview` | Ephemerally extracts text and skills without database persistence | No |
| `POST` | `/api/v1/resumes/parse-text` | Extracts structured experience and skills from raw text | Optional |
| `POST` | `/api/v1/ai/tailor` | Generates targeted resume bullet points for a target job | Yes |
| `POST` | `/api/v1/ai/cover-letter` | Generates a 200+ character company-specific cover letter | Yes |
| `POST` | `/api/v1/ai/rank` | Computes multidimensional ATS scorecard and match percentage | Yes |

### 8.6. Real-Time Telemetry & Health (`/api/v1/events`, `/health`)

| Method | Endpoint | Purpose | Auth Required |
|:---|:---|:---|:---:|
| `GET` | `/api/v1/events` | Opens a persistent Server-Sent Events (SSE) telemetry connection | Yes |
| `GET` | `/health` | Full health status: database latency, memory, uptime, worker state | No |
| `GET` | `/health/live` | Kubernetes/container liveness probe (200 OK) | No |
| `GET` | `/health/ready` | Readiness probe verifying PostgreSQL connectivity and migration state | No |

---

## 9. Project Structure

```text
JobPilot/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI/CD pipeline
├── apps/
│   ├── server/                  # Core Express 5 API & Automation Engine
│   │   ├── src/
│   │   │   ├── __tests__/       # Comprehensive test suites (Node.js test runner)
│   │   │   ├── core/            # Logger (Pino), errors (AppError), event emitter
│   │   │   ├── middleware/      # Auth, error handling, rate limiting
│   │   │   ├── modules/
│   │   │   │   ├── agent/       # LangGraph workflow graphs, candidate context
│   │   │   │   ├── ai/          # Gemini & OpenAI tailoring and scoring services
│   │   │   │   ├── application/ # State machine, adapters (Greenhouse, Ashby, Lever, DOM)
│   │   │   │   ├── browser/     # Playwright BrowserPool manager and stealth injection
│   │   │   │   ├── events/      # Server-Sent Events (SSE) controller & broadcaster
│   │   │   │   ├── health/      # Liveness and readiness endpoints
│   │   │   │   ├── human-action/# Checkpoint token generation & HITL resolution
│   │   │   │   ├── job/         # Ingestion, deduplication, search services
│   │   │   │   ├── loop/        # Scheduled search loop executor & cron scheduler
│   │   │   │   ├── notification/# Email service (Resend / SMTP) & in-app alerts
│   │   │   │   ├── queue/       # PostgreSQL queue worker & Bottleneck pacing
│   │   │   │   └── resume/      # PDF & DOCX text extraction & parsing
│   │   │   ├── app.ts           # Express application configuration & route mounting
│   │   │   └── server.ts        # Server entrypoint with graceful shutdown hooks
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                     # Next.js 16 Cockpit Interface
│       ├── app/
│       │   ├── checkpoint/[id]/ # Interactive HITL verification checkpoint portal
│       │   ├── page.tsx         # Central pipeline dashboard & controls
│       │   └── layout.tsx       # Root layout and theme provider
│       ├── components/          # Pipeline tables, loop editors, live logs, cards
│       ├── package.json
│       └── tailwind.config.js   # Tailwind CSS configuration
├── packages/
│   └── database/                # Shared Database Layer
│       ├── prisma/
│       │   └── schema.prisma    # Canonical PostgreSQL schema & indexes
│       ├── src/
│       │   ├── client.ts        # Prisma client with connection pooling
│       │   └── index.ts         # Model and enum exports
│       └── package.json
├── docs/                        # Domain models, ER diagrams, architecture notes
├── .env.example                 # Production-ready environment configuration template
├── package.json                 # Monorepo workspaces and scripts
├── pnpm-workspace.yaml          # Monorepo workspace declarations
└── README.md                    # Project documentation
```

---

## 10. Getting Started

### Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **pnpm**: `v10.x` or `v11.x`
- **PostgreSQL**: `14.x` to `16.x` running locally or accessible remotely
- **Playwright Chromium**: Browser binaries installed via CLI

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/RudraBhungaliya/JobPilot.git
cd JobPilot

# Install all workspace dependencies
pnpm install
```

### 2. Install Browser Automation Binaries

```bash
# Install Chromium binary required for Playwright DOM automation
npx playwright install --with-deps chromium
```

### 3. Database Initialization

```bash
# Configure local database connection in apps/server/.env
# Example: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobpilot?schema=public

# Generate Prisma client artifacts
pnpm db:generate

# Push schema directly in development OR run migrations for production
pnpm db:push
```

### 4. Running the Development Environment

```bash
# Run both Backend API and Web Cockpit in parallel
pnpm dev:all

# Alternatively, run them independently in separate terminals:
# Terminal 1: Backend Server (http://localhost:8000)
pnpm dev:server

# Terminal 2: Web Dashboard (http://localhost:3000)
pnpm dev
```

### 5. Verifying Builds

```bash
# Compile backend TypeScript
pnpm --filter @jobpilot/server build

# Compile frontend production Next.js bundle
pnpm --filter @jobpilot/web build
```

---

## 11. Environment Variables

Configure environment variables in `apps/server/.env` (and `apps/web/.env.local` for the client). Safe placeholder values are provided below:

| Variable Name | Description | Default / Example | Required |
|:---|:---|:---|:---:|
| `NODE_ENV` | Runtime environment (`development`, `test`, `production`) | `development` | Yes |
| `PORT` | Backend server port | `8000` | Yes |
| `DATABASE_URL` | PostgreSQL connection URI | `postgresql://user:pass@localhost:5432/jobpilot?schema=public` | Yes |
| `JWT_SECRET` | Secret key for access token and checkpoint token signing | `minimum-32-character-secret-key-phrase` | Yes |
| `CORS_ORIGINS` | Allowed origins for cross-origin resource sharing | `http://localhost:3000` | Yes |
| `QUEUE_CONCURRENCY` | Maximum concurrent application submission workers | `2` | No |
| `APPLY_RATE_PER_HOUR_PER_COMPANY` | Max submissions per employer domain per hour | `3` | No |
| `APPLY_MIN_DELAY_MS` | Minimum throttle delay between requests to same domain | `4000` | No |
| `HEADLESS` | Playwright browser mode (`new`, `true`, `false`) | `new` | No |
| `BROWSER_POOL_MAX` | Maximum concurrent browser contexts in pool | `2` | No |
| `LLM_PROVIDER` | Primary AI provider (`gemini` or `openai`) | `gemini` | No |
| `GEMINI_API_KEY` | Google Gemini API key for tailoring and scoring | `AIzaSy...` | Optional |
| `GEMINI_MODEL` | Target Gemini model | `gemini-1.5-flash` | No |
| `OPENAI_API_KEY` | OpenAI API key (alternative provider) | `sk-...` | Optional |
| `OPENAI_MODEL` | Target OpenAI model | `gpt-4o-mini` | No |
| `RESEND_API_KEY` | Resend API key for transactional emails | `re_...` | Optional |
| `RESEND_FROM_EMAIL` | Verified sender address for Resend | `JobPilot AI <onboarding@resend.dev>` | Optional |
| `RESEND_SANDBOX_REDIRECT_EMAIL` | Developer email for sandbox redirection | `developer@example.com` | No |
| `SMTP_HOST` | Fallback SMTP server hostname | `smtp.example.com` | Optional |
| `SMTP_PORT` | Fallback SMTP server port | `587` | Optional |
| `SMTP_USER` | Fallback SMTP username | `user@example.com` | Optional |
| `SMTP_PASS` | Fallback SMTP password | `password` | Optional |
| `WEB_URL` | Frontend URL for generating checkpoint links | `http://localhost:3000` | Yes |

---

## 12. Deployment & CI/CD

### Continuous Integration (GitHub Actions)

A CI/CD pipeline is configured in [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

- **Service Container**: Automatically starts an isolated PostgreSQL 16 container.
- **Dependency Caching**: Caches `pnpm` store based on `pnpm-lock.yaml`.
- **Database Generation**: Generates Prisma client types and applies schema via `prisma db push`.
- **Browser Installation**: Sets up Playwright Chromium binaries with OS dependencies.
- **Full Monorepo Builds**: Verifies type safety and bundles both `@jobpilot/server` and `@jobpilot/web`.
- **Regression Suite**: Executes the complete backend test suite before allowing merges to `main`.

### Production Deployment Considerations

1. **Database Migrations**: In production environments, never run `pnpm db:push`. Instead, execute `pnpm db:migrate:deploy` as part of your deployment release step.
2. **Secrets Enforcement**: The server explicitly checks `JWT_SECRET` during startup and rejects insecure default development keys when `NODE_ENV=production`.
3. **Health Check Probes**:
   - **Liveness**: Configure orchestration probes to hit `GET /health/live`.
   - **Readiness**: Configure readiness checks to hit `GET /health/ready`, which performs an active database ping before routing traffic to the instance.
4. **Graceful Shutdown**: The server traps `SIGTERM` and `SIGINT`, drains the active queue workers, stops schedulers, closes open Playwright browser instances, and terminates cleanly within `SHUTDOWN_TIMEOUT_S` (default 30 seconds).

---

## 13. Testing & Verification

JobPilot uses the native Node.js test runner combined with `tsx` for high-speed, zero-compilation test execution.

### Running Test Suites

```bash
# Run all server test suites
pnpm test

# Run a specific test suite
cd apps/server
NODE_ENV=test JWT_SECRET=jobpilot-test-only-secret-not-for-production REQUIRE_SUBMISSION_APPROVAL=false node --import tsx --test src/__tests__/submission-email-audit.test.ts
```

### Verified Test Categories & Acceptance Evidence

- **Submission Email & Idempotency Audit** (`submission-email-audit.test.ts`):
  - Validates that duplicate state transitions and queue retries suppress duplicate confirmation emails.
  - Verifies that external email provider failures do not corrupt application state or cause re-submission.
  - Enforces false-success prevention, requiring confirmation codes for `SUBMITTED` transitions.
  - Confirms candidate email, resume title, and timestamp in emails match persisted database records.
  - Verifies that sandbox redirection is strictly prohibited in production.
- **Human-in-the-Loop & Direct Submission** (`checkpoint-direct-submit.test.ts`):
  - Seeds candidates, resumes, and interactive checkpoints (`WAITING_FOR_USER`).
  - Verifies checkpoint token generation and profile auto-sync.
  - Enforces replay protection on checkpoint tokens.
- **Live ATS Acceptance** (`real-world-acceptance.test.ts`):
  - Inspects live employer job postings on Greenhouse, Ashby, and Lever.
  - Tests headless Playwright form field extraction, anti-bot evasion, and screening question detection.
- **Rate Limiting & Backoff** (`rate-limiter-retry.test.ts`):
  - Verifies token-bucket delays per employer key and exponential backoff on transient errors.

---

## 14. Security & Reliability

- **Strict State Invariant Protection**: An application cannot transition to `SUBMITTED` or `APPLIED` without verified employer evidence. Jumps from non-submitting states are rejected.
- **Ephemeral Checkpoint Scoping**: Human-in-the-Loop checkpoint tokens are signed with user and application claims, expiring after a configured time window to prevent unauthorized form submission.
- **Sanitized Notification Sandbox**: In development environments, test emails are routed exclusively to `RESEND_SANDBOX_REDIRECT_EMAIL` with explicit subject tags. In production, redirection is prohibited, preventing credential or candidate data leakage.
- **Pessimistic Queue Row Locking**: Worker jobs are locked at the database row level with ownership timestamps (`lockedAt`, `lockedBy`), preventing concurrent double-execution across multiple server instances.
- **Error Isolation**: Failure in non-critical components (such as real-time SSE broadcasts or confirmation emails) is caught and isolated, ensuring primary database state remains uncorrupted.

---

## 15. Roadmap & Future Improvements

- **OAuth-Based ATS Integrations**: Direct OAuth2 integrations with enterprise applicant tracking systems for instant applicant status syncing.
- **Automated Interview Detection**: Inbound email parsing detecting interview requests, calendar invitations, and rejection notifications.
- **Distributed Redis Queue Adapter**: Option to swap PostgreSQL queue tables with Redis BullMQ for high-throughput deployments exceeding 50+ concurrent workers.
- **Custom Screening AI Memory**: Persistent candidate memory storing custom screening answers (e.g. visa sponsorship status, salary expectations, notice periods) across multiple applications.

---

## License

This project is licensed under the ISC License.
