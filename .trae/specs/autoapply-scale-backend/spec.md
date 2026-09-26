# JobPilot Auto-Apply Scale Backend Specification

## Problem

JobPilot has a skeleton agent pipeline capable of discovering and applying to a limited set of Western startups via public ATS boards. However the backend cannot yet: (a) target real MNCs, Indian IT services firms, and Semi-MNCs hiring across India; (b) leverage API-level apply endpoints when available to avoid browser sessions entirely; (c) run hundreds of applications per day with proper concurrency, stealth, pacing, and failure resilience; (d) reliably navigate multi-page ATS forms on Greenhouse, Lever, Workday, Ashby, and LinkedIn EasyApply. The user needs the backend to become production-grade for scale auto-apply across Indian on-site/hybrid openings plus international remote roles.

## Users

- Primary: Job seekers (candidates) based in India targeting MNC / Semi-MNC roles across India and international remote roles.
- Secondary: Ops/admin users reviewing application audit history.

## Goals

1. Coordinate completely with 3rd party ATS boards (Greenhouse, Lever, Workday, Ashby, SuccessFactors-style) and job boards (Indeed, Naukri, LinkedIn EasyApply, RemoteOK, Arbeitnow) for discovery.
2. Auto-apply **at scale** (100s of applications/day per user headroom) via a mix of API-level apply (where supported) and hardened browser automation (where a form must be filled).
3. Target real companies: MNCs (Google, Microsoft, Amazon, Meta, Apple, Adobe, Cisco, IBM, Oracle, SAP, Dell, VMware, Nvidia, Intel, Atlassian, ServiceNow, Salesforce, JP Morgan, Goldman Sachs, etc.), Indian IT / Semi-MNCs (TCS, Infosys, Wipro, HCLTech, Tech Mahindra, Cognizant, Capgemini, Accenture, LTI Mindtree, Mphasis, Flipkart, PhonePe, Swiggy, Zomato, Razorpay, Groww, Zerodha, Cred, Dream11, Byjus, Unacademy, etc.), and international remote-first companies.
4. Cover Indian openings across all major hubs (Bengaluru/Bangalore, Hyderabad, Pune, Mumbai/Bombay, Delhi NCR, Chennai, Kolkata, Ahmedabad, Kochi, Jaipur, Nagpur, Chandigarh) plus global remote / Remote India roles.
5. Ensure the existing LangGraph agent pipeline, persistent queue, workflow engine, ATS analysis, profile module, and audit/notification surface actually work end-to-end together end-to-end with tests.

## Non-Goals

- Frontend UI/UX changes beyond what is required for API contract parity.
- Candidate-facing dashboard redesign (backend focus only).
- Payment, billing, or subscription features.
- Scraping protected / authenticated-only paid job boards behind login (LinkedIn signed-in feed, Naukri employer dashboard). Public boards and public ATS boards only.
- Bulk outbound email or any outreach outside the ATS application form itself.

## Functional Requirements

### FR-1 Source & Discovery Coverage

- FR-1.1 **Greenhouse** live discovery queries the public `boards-api.greenhouse.io/v1/boards/{company}/jobs` endpoint against a curated list of **100+ MNC / Indian Semi-MNC** Greenhouse customers.
- FR-1.2 **Lever** live discovery queries the public `api.lever.co/v0/postings/{company}?mode=json` endpoint against a curated list of **50+ MNC / Indian Semi-MNC** Lever customers.
- FR-1.3 **Ashby** live discovery queries the public Ashby posting API against a curated list of Ashby customers that hire in India / remotely.
- FR-1.4 **Workday** live discovery uses the public Workday REST job-requisition search pattern (e.g. `{company}.workday.com/wday/cxs/{tenant}/{board}/jobs`) with a list of known Workday MNC tenants that hire in India.
- FR-1.5 **Indeed / Google-for-Jobs-style** aggregation fallback uses the Arbeitnow and RemoteOK live APIs plus a configurable external Jobs provider (Google Jobs / JSearch via an env-configured key) to broaden results, and filters to India-located hubs or pure-remote.
- FR-1.6 **Naukri / Indian job board public feed** fallback via publicly available RSS / JSON endpoints (if reachable) or generic aggregation, normalizing Indian job locations.
- FR-1.7 Every source result is de-duplicated by normalized job URL, and filtered out if the user already holds a `SUBMITTED` application for the same job.
- FR-1.8 Indian-location filter supports dual-name synonyms: Bengaluru = Bangalore, Mumbai = Bombay, Chennai = Madras, Kochi = Cochin, Kolkata = Calcutta, etc. Hub filter includes the 12 major Indian hubs listed in Goals.

### FR-2 API-Level Apply (Scale Workhorse)

- FR-2.1 **Greenhouse API Apply adapter**: Implements `POST /v1/boards/{company}/jobs/{jobId}/applications` (public board apply endpoint) using multipart/form-data with resume file + candidate fields when the board exposes a token-free apply endpoint. Returns a typed `{ success, confirmationId, requiresBrowserFallback }` result.
- FR-2.2 **Lever API Apply adapter**: Implements the Lever public posting submit endpoint for companies whose Lever board accepts direct POST submits.
- FR-2.3 **Ashby API Apply adapter**: Submits a candidate via the Ashby public posting apply endpoint if supported by the board.
- FR-2.4 Adapter registry exposes `tryApiApply(job, profile, resume)` which returns success OR explicitly falls back to browser apply; the orchestrator always prefers API apply over browser.
- FR-2.5 Each API apply populates the same `Application` record: status, attempts, appliedAt, confirmationCode, failureReason, audit log, notification as if a browser submit had happened.

### FR-3 Hardened Browser Apply Pipeline

- FR-3.1 **Browser pool**: Playwright Service is enhanced to maintain a configurable pool (size via env `BROWSER_POOL_MAX`, default 4) of independent Chromium contexts with separate user-data directories, instead of a singleton browser.
- FR-3.2 **Stealth**: Each Playwright launch runs `headless: new` by default (env override to false for debug), loads stealth patches (randomised viewport, user-agent rotation, WebDriver masking via `evaluateOnNewDocument`, `navigator.webdriver=false`, languages stack `[en-US, en, hi-IN]`), and uses per-context proxy if `PROXY_URL` is set.
- FR-3.3 **ATS-specific DOM adapters**: Each of Greenhouse, Lever, Workday, Ashby exposes a dedicated form-navigator class that:
  - Detects the ATS by URL / DOM signature on the job page.
  - Clicks multi-step "Apply" / "Continue" buttons in the correct order, handles pagination between screens (Personal Info → Resume → Questions → Review → Submit).
  - Recognises ATS-specific fields (Greenhouse `question_*` inputs, Lever `customQuestion`, Workday input data-automation-id attributes) so fill rate > 80% on standard applications without AI guess.
  - Handles iframe-wrapped forms common on Workday and SuccessFactors.
- FR-3.4 **Resume upload**: Handles `<input type="file">`, drag-drop zones, and iframe file inputs; supports local absolute paths and data-URI/file-URLs of uploaded resumes.
- FR-3.5 **LLM-powered screening Q&A**: When the ATS presents unknown custom questions (textarea "Why do you want to work here?", radio "Do you need sponsorship?", dropdown "Highest education"), a `FormQuestionAIService` uses the configured LLM provider (Gemini by default; falls back to OpenAI if env present) + the candidate Profile + Resume text + Job description to produce an honest, profile-consistent short answer. Answers are cached per `(questionHash, userId, jobId)`.
- FR-3.6 **Submission verification**: Confirms SUBMITTED only if the post-submit DOM or URL matches a success indicator ("thank you", "application submitted", success route, confirmation email-sent banner, Greenhouse `?thank-you=true`); otherwise marks failed and retries up to `Agent.MAX_APPLY_ATTEMPTS`.
- FR-3.7 **LinkedIn EasyApply adapter** (ATS-agnostic but separate): Detects LinkedIn EasyApply flow (public URL with `/jobs/view/`), navigates modal dialog steps (Next → Upload → Review → Submit), and fills fields via DOM + AI Q&A pipeline.

### FR-4 Orchestration, Scale & Queue

- FR-4.1 **Queue parallelism**: `QueueWorker` supports a configurable worker pool (`QUEUE_CONCURRENCY`, default 2). Each worker calls `processNext()` independently; the shared "running" flag is replaced by per-worker state so N agent runs or direct application submits execute simultaneously up to pool size.
- FR-4.2 **WorkflowEngine.execute(batchSize)** is wired end-to-end: it picks QUEUED applications, prefers API apply via the adapter registry, falls back to browser apply from `ApplicationSubmitService`, and updates status/audit/notification exactly like the Agent path does.
- FR-4.3 **Direct apply route `POST /api/v1/applications/:id/submit`** uses the ApplicationSubmitService (API-first, browser-fallback) and returns before the worker run (async execution is allowed but the route must trigger the submit).
- FR-4.4 **Bulk apply route `POST /api/v1/agent/discover-and-apply`** accepts `{ query, location, remote, limit, companyTiers }`, runs discover → evaluate → rank → persist jobs → create QUEUED applications → enqueue QueueJob records, then returns `{ discoveredCount, enqueuedCount, runId }`.
- FR-4.5 **Rate limiting & pacing**: Global token-bucket limiter (in-memory, per-domain or per-company key) ensures no more than `APPLY_RATE_PER_HOUR_PER_COMPANY` (default 3) submits to the same company per hour, with jittered inter-apply sleep of `APPLY_MIN_DELAY_MS` to `APPLY_MAX_DELAY_MS` (default 4–15s) between applications.
- FR-4.6 **Exponential backoff retry**: Application retries on failures use backoff `baseMs * 2^(attempt-1)` capped at 10 minutes; transient errors (network, 5xx, page timeout) are re-queued; permanent errors (404 job, 403 banned, job closed) are terminal and do not retry beyond max attempts.
- FR-4.7 **Scheduled runs**: `workflow/scheduler.service.ts` exposes a `registerCron(expression, handler)` method used to enqueue a nightly "scan & apply" run per user opt-in; by default the scheduler is on and picks users with an opt-in flag on their profile.

### FR-5 Profile, Resume, Tailoring & ATS

- FR-5.1 Candidate Context builder (`candidate.service.ts buildContext`) returns:
  - All Profile scalar fields, educations, experiences, skills (with years), languages, certifications, projects, links.
  - Resume extracted text when a resumeId is passed.
  - Derived top skills by frequency and order.
  - Location preferences, remoteOnly flag, expected salary, notice period, yearsOfExperience.
- FR-5.2 **Resume Tailoring Service** actually rewrites resume summary / bullet points via LLM to emphasize keywords matched by the job description, persists the tailored `.pdf` bytes or `.docx` bytes to disk/file URL under a new temporary Resume record with `tailored=true` (status READY / FAILED / PROCESSING). The Tailor node in the LangGraph pipeline is updated to invoke this service rather than storing only instructions.
- FR-5.3 **Cover Letter Service** uses LLM (prompt in `ai/prompt.service.ts`) with job description + candidate context to produce a 3–5 paragraph tailored cover letter per application, saved into `Job.coverLetter` / `Application` tailoring notes; if the ATS has a cover letter field the browser adapter fills it.
- FR-5.4 **ATS analysis** moves from simple keyword subtraction to LLM-or-rule based scoring of resume vs JD keyword overlap, returning strengths, missing keywords, and an overall match score 0–100 persisted as `Application.matchScore` / `Application.scorecard`.
- FR-5.5 **CandidateMapper resolver** covers the 60 most-common application field names (firstName, lastName, email, phone, address, city, state, country, zip, linkedin, github, portfolio, currentCompany, currentTitle, yearsOfExperience, noticePeriod, expectedSalary, currentSalary, sponsorshipRequired, remotePreference, education, degree, university, graduationYear, visaStatus, doYouRequireVisaSponsorship, areYouAuthorizedToWorkIn, dateOfBirth, gender, nationality, etc.) using Profile fields + fallback resume text extract.

### FR-6 End-to-End Wiring & Reliability

- FR-6.1 `source.bootstrap.ts` initializes all 10+ sources into `SourceFactory.all()` on app start and logs the count per source.
- FR-6.2 LangGraph agent nodes `discover → evaluate → rank → tailor → apply → verify → persist` each complete without throwing unhandled exceptions; any node error is captured into `AgentRun.errors[]` and the run is persisted FAILED.
- FR-6.3 Duplicate protection: `@@unique([userId, jobId])` is preserved on Application; `findOrCreate` in the apply pipeline never violates it and marks skipped applications appropriately.
- FR-6.4 Audit logs, notifications, application history, browser session IDs, checkpoint snapshots are written for every lifecycle transition of every application.
- FR-6.5 Graceful shutdown: Playwright browsers and queue workers drain in-flight work on SIGTERM before Node exits.

### FR-7 Indian & International Filtering UX via API

- FR-7.1 Discover routes accept `location` with the values: `"Bengaluru" | "Hyderabad" | "Pune" | "Mumbai" | "Delhi NCR" | "Chennai" | "Kolkata" | "Ahmedabad" | "Kochi" | "Jaipur" | "Nagpur" | "Chandigarh" | "Remote India" | "Global Remote"`.
- FR-7.2 Discover routes accept `companyTier` enum `"MNC" | "SEMI_MNC" | "STARTUP" | "ALL"` that routes source queries to the appropriate curated company lists for each tier.
- FR-7.3 The filter in `live-ats.service.ts` correctly normalises job locations so "Bangalore" roles are returned for a "Bengaluru" search and vice-versa; similarly for other alias pairs.

### FR-8 Testing

- FR-8.1 Unit tests exist for `live-ats.service.ts filterJobs` (location alias, keyword, remote, India hub cases).
- FR-8.2 Unit tests exist for `ATS adapter registry tryApiApply` (success, fallback, error cases using nock/fetch mocks).
- FR-8.3 Unit tests exist for `FormQuestionAIService` (cache, LLM answer, required profile fields).
- FR-8.4 The existing e2e test `backend.e2e.test.ts` is extended to cover `/api/v1/agent/discover-and-apply` and `/api/v1/applications/:id/submit` with mocked source data + mocked Playwright browser so it runs in CI.

## Non-Functional Requirements

- **Performance (NFR-1)**: A single worker thread completes 10 auto-applications (mixed API + browser) in < 15 minutes end-to-end in mocked-CI mode.
- **Throughput (NFR-2)**: With default concurrency (2 workers, 4 browser contexts) the backend sustains 50+ applications/hour without memory growth beyond 1.5 GB Node RSS.
- **Reliability (NFR-3)**: Any single application failure does not block the queue; worker recovers within 10 seconds. Run state is persisted in DB so a server restart resumes from last checkpoint for any in-flight agent run (via LangGraph checkpoint).
- **Observability (NFR-4)**: All submission steps (discover count, apply attempt count, API vs browser split, success rate, CAPTCHA hit rate, failure reasons) are logged via Pino at INFO level.
- **Security (NFR-5)**: No 3rd party API keys (LLM, proxy, job search) are ever logged; all are read from env only. Candidate answers generated by LLM are never invented outside the facts present in Profile + Resume text (answers include a profile-derived grounding).
- **Extensibility (NFR-6)**: Adding a new ATS adapter requires one new class implementing `ApplyAdapter` interface plus a one-line registry entry; no changes to Agent or ApplicationSubmitService are required.
- **Data Integrity (NFR-7)**: All writes go through Prisma with transactions where multi-row updates must be atomic (Application status + AuditLog + Notification together).
- **Config by env (NFR-8)**: Every operational dial is overridable: browser pool size, pool concurrency, rate limits, delays, retry max, proxy URL, headless flag, LLM provider choice.
- **Compatibility (NFR-9)**: Remains fully TypeScript strict, compiles with `tsc --noEmit`, uses existing ESM module layout (`"type": "module"`).

## Constraints

- Must build on top of the existing Node.js / Express / Prisma Postgres / Playwright / LangGraph / Zod / Pino stack. No new backend framework.
- Browser automation is limited to Playwright Chromium; no Puppeteer, no Selenium.
- No persistence layer outside the existing Prisma schema (allowed to add models, but must stay in `packages/database/prisma/schema.prisma`).
- All HTTP fetches to 3rd parties must have a timeout (default 4s already in use) and graceful degradation.
- Must not scrape authenticated-only (logged-in) paid boards.

## Dependencies

- Existing: `@langchain/langgraph`, `playwright`, `@prisma/client`, `zod`, `pino`, `openai`, `pdf-parse`, `mammoth`, `resend`.
- New allowances (version-pinned in `apps/server/package.json` only): `bottleneck` for rate limiting; `nock` or equivalent for fetch mocking in tests; minimal `playwright-extra` / `puppeteer-extra-plugin-stealth`-style package only if Playwright built-in flags do not suffice (evaluated during implementation; no stealth package installed if we can achieve results with built-in evaluate patches).

## Assumptions

- Users have already uploaded a Resume and filled their Profile (educations, experiences, skills, address fields, contact info). If not, the agent gracefully moves to WAITING_FOR_USER with actionable missing-field notifications.
- Indian job data will come from (a) the public ATS APIs of MNCs/Indian IT firms that publish jobs in India hubs, (b) Arbeitnow/RemoteOK remote lists, (c) a Google Jobs / JSearch style aggregator if env key is provided, otherwise (c) is skipped.
- A Postgres instance is reachable and Prisma migrations runnable; environment variables for DB, LLM, Resend, PORT are populated.

## Open Questions

1. Should LinkedIn EasyApply support include public-page-only apply (no sign-in) for this release, or is a LinkedIn session cookie / credential support expected next phase? (Assumption: public-page-only for V1.)
2. Does the user want SMS / WhatsApp notifications in addition to Resend email? (Assumption: email only for V1.)
3. Are there specific company names / target lists the user will upload separately, or should we seed 150+ curated MNC / Semi-MNC Greenhouse/Lever/Workday boards from public lists? (Assumption: seed curated list of 150+; user can extend later via company routes.)
4. Is a Google Jobs / JSearch API key available or should V1 skip Google provider and rely on Arbeitnow/RemoteOK + ATS boards? (Assumption: JSearch via env key if present, else skip.)

---

## Acceptance Criteria

### Rule ACs (Pass/Fail)

| ID | AC | Evidence |
|---|---|---|
| AC-R-1 | `SourceFactory.all()` returns ≥ 9 sources on bootstrap; live-ats.service Greenhouse list includes ≥ 50 MNC names and Lever list includes ≥ 30; India-hub location filter normalises Bengaluru ⇆ Bangalore, Mumbai ⇆ Bombay in `filterJobs`. | Run app bootstrap log + unit test for `filterJobs` aliases. |
| AC-R-2 | `tryApiApply` is exported from an adapter registry and is invoked before browser apply in ApplicationSubmitService; for a mocked Greenhouse board it submits via multipart POST and records SUBMITTED; for a mocked "no API apply" board it returns `requiresBrowserFallback: true`. | Unit test with nock/fetch mocks. |
| AC-R-3 | Browser apply pipeline can navigate at minimum Greenhouse multi-step and Lever multi-page flows end-to-end via dedicated ATS DOM adapters in the codebase (class files exist, are exported, and are auto-detected from URL/DOM). | Code inspection of new `modules/ats/adapters/*.ts` and unit tests for detection. |
| AC-R-4 | FormQuestionAIService exists and answers an unknown screening question with grounded answers from Profile + Resume; cached answers are reused for identical question+user+job. | Unit test with mocked LLM client returning a fixture, confirm cache hit returns same value. |
| AC-R-5 | QueueWorker runs ≥2 concurrent workers when `QUEUE_CONCURRENCY=2`; running flag is per-worker not global; workflow.engine.ts `execute(batchSize)` actually submits applications via the adapter registry and updates Application statuses. | Unit test spawning 2 workers on a 4-job queue; all 4 advance in < queue sequential time. |
| AC-R-6 | Rate limiter enforces ≤3 applies/hour per company; applies are spaced with 4–15s jitter sleep between submissions in the same run. | Unit test for rate limiter: 5 fast requests to same company → 3 go in, 2 wait / delay. |
| AC-R-7 | Discover `/api/v1/jobs/discover` (via agent discover route) accepts `companyTier` and `location` Indian hubs and returns only jobs whose location matches after alias normalisation. | E2E test with mocked sources confirms Bengaluru filter returns Bangalore jobs, MNC tier returns MNC-curated companies. |
| AC-R-8 | ResumeTailoringService produces a tailored Resume (new DB row) from a Job description + original Resume; CoverLetterService produces a cover letter string from same inputs. | Unit test with mocked LLM → new Resume row saved READY with tailored=true. |
| AC-R-9 | CandidateMapper resolver returns non-empty values for ≥55 of 60 common field names given a fully populated Profile + Resume; empty values returned only when Profile+Resume genuinely lack the info. | Unit test with seeded rich profile → assert 55/60 fields non-empty. |
| AC-R-10 | Graceful shutdown closes all Playwright browsers in the pool and drains in-flight queue workers on SIGTERM within 30s. | Test script sending SIGTERM during active run; asserts browsers closed, worker `isRunning()` all false. |
| AC-R-11 | TypeScript `tsc --noEmit` passes for the entire server package with zero errors after changes. | Build command evidence. |
| AC-R-12 | Existing `backend.e2e.test.ts` + new test cases pass with mocked network / mocked Playwright. | `pnpm --filter @jobpilot/server test` or equivalent test command output. |
| AC-R-13 | `ApplicationSubmitService.submitApplication` uses adapter registry first (API apply) before browser; audit/notification emitted correctly for SUBMITTED, FAILED, WAITING_FOR_USER paths. | Unit test on each of the three outcome paths. |
| AC-R-14 | LangGraph agent nodes complete without unhandled exceptions; a simulated failure in any node writes AgentRun status FAILED with populated errors[], user notified via notification record. | Unit test simulating apply.node failure → status=FAILED + notification exists. |
| AC-R-15 | All HTTP env-configurable keys (LLM API, proxy, JSearch, Resend) are never written to logs or DB except as placeholder `<redacted>` in any error message. | Grepped code + Pino log output in tests confirm `<redacted>` only. |

### Rubric ACs (Scored 0-2)

| ID | Dimension | Anchors (0 / 1 / 2) | Pass Threshold | Evidence |
|---|---|---|---|---|
| AC-RB-1 | ATS adapter coverage breadth | 0 = only Greenhouse browser works; 1 = Greenhouse + Lever + Workday adapters implemented with detection; 2 = Greenhouse/Lever/Workday/Ashby/LinkedIn-EasyApply all have dedicated DOM adapters with multi-step navigation | ≥2 | Adapter file list + detection test matrix |
| AC-RB-2 | Scale throughput headroom | 0 = single sequential apply only; 1 = 2-way concurrency via queue pool works; 2 = rate limiter, jitter, per-company throttling, browser pool of 4 all active together in integration run | ≥2 | Benchmark run log with timestamps of 50 applications |
| AC-RB-3 | Indian MNC / Semi-MNC coverage in curated lists | 0 = no India-specific company lists; 1 = ≥60 Indian-hiring companies across Greenhouse/Lever/Workday lists; 2 = ≥150 companies (MNC + Semi-MNC) with India hub location filtering working | ≥1 | Source constants size + live discovery returns Indian-located jobs |
| AC-RB-4 | Auto-apply reliability (success rate on mocked forms) | 0 = < 50% submit; 1 = 70% submit on mixed Greenhouse/Lever mocks; 2 = ≥ 85% submit rate across all ATS adapters in mocked E2E | ≥1 | Mock E2E run summary showing pass count |
| AC-RB-5 | Quality of LLM-grounded Q&A | 0 = invents values outside profile; 1 = answers mostly from profile but occasional generic phrase; 2 = answers strictly grounded, cites profile facts, cache hits, and "I don't have that info" when unknown | ≥1 | Test assertions against question/answer pairs |
