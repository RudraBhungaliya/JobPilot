# Implementation Tasks — Auto-Apply Scale Backend

Derives from `spec.md`. Dependencies flow top-to-bottom where stated. Each task records local Test Requirements (TRs) of type `rule` or `rubric` only.

---

## Task 1: Environment & constants — operational dials & env validation

**Priority:** high
**Depends on:** (none)
**Scope:**
- Update `apps/server/src/config/env.ts` (or create if it) to export typed validators for:
  - `BROWSER_POOL_MAX` (number, default 4)
  - `QUEUE_CONCURRENCY` (number, default 2)
  - `APPLY_RATE_PER_HOUR_PER_COMPANY` (number, default 3)
  - `APPLY_MIN_DELAY_MS` (number, default 4000)
  - `APPLY_MAX_DELAY_MS` (number, default 15000)
  - `HEADLESS` (string "new" | "true" | "false", default "new")
  - `PROXY_URL` (string optional)
  - `JSEARCH_API_KEY` / `GOOGLE_JOBS_API_KEY` (optional)
  - `LLM_PROVIDER` ("gemini" | "openai", default "gemini")
- Update `apps/server/src/core/logger/index.ts` Pino logger to redact env secret strings in any logged object (deep key match `*API_KEY`, `*SECRET`, `*TOKEN` → `<redacted>`).

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-1.1 | rule | Env loader returns a typed object with defaults for every new dial. | Unit call → object shape matches. |
| TR-1.2 | rule | Pino logger replaces any value of a key matching `/API_KEY\|SECRET\|TOKEN/i` to `<redacted>` in output. | Log capture assert `<redacted>` only. |

---

## Task 2: Database schema — minor extension fields + CuratedCompany model

**Priority:** high
**Depends on:** Task 1
**Scope:**
- In `packages/database/prisma/schema.prisma`:
  - Add `tier` field to existing `Company.tier` if still missing; ensure String enum or plain String with values `MNC | SEMI_MNC | STARTUP`.
  - Add new model `CuratedCompanySource` (or extend `live-ats.constants.ts` in code-only approach — choose constants-only if a DB model is overkill; recommendation: code-only constants to avoid migration for now).
  - Add `tailored Boolean` to `Resume.tailored` (`Boolean @default(false).
  - Add `source` String? to Resume for provider audit.
  - Optionally add `Application.coverLetterText` String? (can reuse `Job.coverLetter`, but add it explicitly to Application also for one-to-one correctness.
- Run `prisma generate` inside packages/database after schema change.
- **Note:** For speed, prefer code-only constants (see Task 4) for the 150+ MNC list; schema change is minimal field additions only.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-2.1 | rule | `prisma validate` passes; schema compiles. | CLI output. |
| TR-2.2 | rule | Prisma client regenerated and TS types include `tailored` on Resume. | TS compilation evidence. |

---

## Task 3: Install new pinned dependencies

**Priority:** high
**Depends on:** Task 1
**Scope:**
- In `apps/server/package.json` add and install pinned versions:
  - `bottleneck` (rate limiting)
  - `nock` (devDependency, fetch mocking for tests)
- Do not add playwright-extra unless Playwright stealth patches in Task 12 are shown to be insufficient; skip for now.
- `pnpm install` (or workspace install).

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-3.1 | rule | Both packages appear in resolved lockfile and can be `import`ed without TS error. | Import test in scratch script. |

---

## Task 4: Curated MNC / Indian Semi-MNC company lists (AC-R-1, AC-RB-3, AC-R-7)

**Priority:** high
**Depends on:** Task 1
**Scope:**
- Create `apps/server/src/modules/sources/curated-companies.constants.ts`:
  - `GREENHOUSE_COMPANIES_MNC` — 80+ entries (expand existing list to include Microsoft, Google, Amazon, Meta, Apple, Adobe, Cisco, IBM, Oracle, SAP, Dell, VMware, Nvidia, Intel, Atlassian, ServiceNow, Salesforce, Schneider, Siemens, + Indian IT MNCs on Greenhouse: if any.
  - `GREENHOUSE_COMPANIES_SEMI_MNC_INDIA` — Indian product/IT unicorns + Semi-MNCs on Greenhouse (Zeta, Postman, Freshworks, Zoho, Chargebee, Gainsight, etc.)
  - `LEVER_COMPANIES_MNC` — expand existingNetflix/Spotify/Canva list to 40+ names (Netflix, Spotify, Canva, Palantir, Twitch, Atlassian, add companies that hire in India/remote).
  - `LEVER_COMPANIES_SEMI_MNC_INDIA` — Indian Semi-MNCs on Lever.
  - `ASHBY_COMPANIES_MNC` — expand existing list; include any additional global companies that hire in India.
  - `WORKDAY_TENANTS` — new list of MNCs using Workday public boards that hire in India (Accenture, Deloitte, EY, PwC, KPMG, Cognizant public careers workday pattern, etc. — 40 entries with `{ slug: string, company: string, board?: string, tenant?: string, hiresInIndia: boolean, tier: 'MNC'|'SEMI_MNC'|'STARTUP' }`.
  - `NAUKRI_INDIAN_HUBS` — synonym map `{bengaluru:['bangalore','bengaluru'], mumbai:['mumbai','bombay'], ...}` covering all 12 hubs with aliases.
- Update `live-ats.constants.ts` (or live-ats.service.ts) to merge/use these new constants; exports `getCompaniesByTier(source, tier)` helper.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-4.1 | rule | `GREENHOUSE_COMPANIES_MNC.length + GREENHOUSE_COMPANIES_SEMI_MNC_INDIA.length ≥ 80 entries total; LEVER lists combined ≥ 40; WORKDAY_TENANTS ≥ 40. | Length assertions. |
| TR-4.2 | rule | `getCompaniesByTier('greenhouse','MNC')` returns subset; getCompaniesByTier('*','ALL') returns union. | Unit test. |
| TR-4.3 | rubric | Indian Semi-MNC breadth (0–2): 0 = ≤ 10 Indian names; 1 = 20+ names; 2 = 40+ distinct Indian IT/product companies across all 3 ATSes. Score ≥ 1 required. | List counts per source. |

---

## Task 5: Location alias normalization & source filter improvements (AC-R-1, AC-R-7)

**Priority:** high
**Depends on:** Task 4
**Scope:**
- Add `normalizeLocation(loc)` helper in `live-ats.service.ts` (or new `location.utils.ts`) using synonym map from Task 4.
- Update `filterJobs(input)` to apply normalization on both the requested location and the job location before substring match so "Bengaluru" query matches "Bangalore" job and vice versa; ensure "Delhi NCR" matches "Gurgaon"/"Noida"/"Gurugram"/"Delhi".
- Add `remote` parameter + work at the `SourceSearchInput` level to `"Global Remote"` = `location.includes('remote')` OR `location.includes('global')` OR `location.includes('anywhere')`; `"Remote India"` = `remoteOnly=true` AND any Indian hub OR location has `"India"` substring.
- Unit test file: `apps/server/src/__tests__/live-ats-filter.test.ts` (new) for filterJobs covering Bengaluru/Bangalore, Mumbai/Bombay, Delhi NCR sub-cities, Remote India, Global Remote.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-5.1 | rule | `normalizeLocation` returns canonical hub for both spelling variants. | Unit test alias matrix. |
| TR-5.2 | rule | A query `location='Bengaluru'` keeps a job with `location="Bangalore, Karnataka"` and drops a job with `location="Pune"`. | Unit test. |
| TR-5.3 | rule | A query `remote=true` keeps jobs marked Remote, Global, or Anywhere; drops Mumbai on-site. | Unit test. |
| TR-5.4 | rule | `"Delhi NCR"` matches Delhi, Gurgaon, Noida, Gurugram locations. | Unit test assertions. |

---

## Task 6: Workday source real implementation + JSearch/Indeed fallback (FR-1.4, FR-1.5)

**Priority:** high
**Depends on:** Task 4, Task 5
**Scope:**
- Rewrite `modules/sources/workday.source.ts` no longer calls `searchGeneral`; instead iterates `WORKDAY_TENANTS` and queries each pattern `https://{tenant}.workday.com/wday/cxs/{tenant}/{board}/jobs` (with timeouts per tenant, allSettled, 5-min cache) with query + location + keyword filters.
- Add new `modules/sources/jsearch.source.ts` (conditional on env JSEARCH_API_KEY): calls `https://jsearch.p.rapidapi.com/search` or Adzuna or the configured endpoint for Google-Jobs-like listings; when no API key present returns empty and source factory skips in factory.
- Update `source.factory.ts` to include new `jsearchSource` conditionally; keep indeed/google/remote/indeed.
- Keep fallback chain in `live-ats.searchGeneral` → Arbeitnow + RemoteOK unchanged for generic fallback.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-6.1 | rule | Workday source iterates ≥ 3 workday tenant URLs (mocked fetch) without throwing. | Mocked fetch test. |
| TR-6.2 | rule | JSearch source returns [] when API key missing; no network call made. | Assert fetch not called. |
| TR-6.3 | rule | With a mocked successful workday response, SourceJob objects include `source === 'workday'`. | Assert shape. |

---

## Task 7: ApplyAdapter interface & registry (AC-R-2, AC-R-13)

**Priority:** high
**Depends on:** Task 2
**Scope:**
- Create `modules/application/adapters/apply-adapter.interface.ts`:
  ```ts
  export type ApplyResult = { success: boolean; confirmationId?: string; requiresBrowserFallback: boolean; reason?: string };
  export interface ApplyAdapter {
    name: string; // e.g. 'greenhouse-api'
    canApply(url: string, atsProvider?: string): boolean;
    apply(input: { jobUrl: string; job: Job | any; profile: Profile; resume: Resume; resumeBuffer?: Buffer; resumeContentType?: string; userId: string; applicationId: string }): Promise<ApplyResult>;
  }
  ```
- Create `modules/application/adapters/apply-adapter.registry.ts` with `register(adapter)` and `tryApiApply(input)` that iterates registered adapters, calling `canApply(url)` then `apply(input)` in priority order; returns first successful `ApplyResult` or fallback browser if none can apply.
- Export singleton registry; ApplicationSubmitService (Task 18 wires it.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-7.1 | rule | Registry with no adapters → `tryApiApply(...)` returns `{ requiresBrowserFallback: true }`. | Unit test. |
| TR-7.2 | rule | Registry with mock adapter that `canApply = true & success=true` → adapter is invoked once and returns its result. | Unit test. |
| TR-7.3 | rule | Registry with adapter that throws → next adapter is tried; if all fail fallback. | Unit test. |

---

## Task 8: Greenhouse / Lever / Ashby API apply adapters (FR-2.1 — FR-2.3, AC-R-2)

**Priority:** high
**Depends on:** Task 7
**Scope:**
- Create `modules/application/adapters/greenhouse-api.adapter.ts`:
  - Parses `boards.greenhouse.io/{board}/jobs/{jobId}` → board & jobId from URL; if pattern matches (canApply).
  - Submits `POST https://boards-api.greenhouse.io/v1/boards/{board}/jobs/{jobId}` as multipart/form-data with fields mapped from Profile + resume file. Map the ~20 known fields (first_name, last_name, email, phone, etc.).
  - Returns `{ success, confirmationId, requiresBrowserFallback }`.
- Create `lever-api.adapter.ts`:
  - Pattern `jobs.lever.co/{board}/{id}` or `apply endpoint; submits via known Lever posting POST apply endpoint if it exists; fallback true if unsupported by that board.
- Create `ashby-api.adapter.ts`:
  - Pattern `jobs.ashbyhq.com/...` public posting apply submit if supported; true/false.
- Register all three in registry at app bootstrap (source.bootstrap.ts or new apply.bootstrap.ts called from app.ts).

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-8.1 | rule | Greenhouse adapter canApply returns true for a greenhouse URL and false for Lever URL. | Unit tests. |
| TR-8.2 | rule | Greenhouse adapter.submit with nock-mocked 200 success returns ApplyResult with success=true & confirmationId set. | nock + test. |
| TR-8.3 | rule | Greenhouse adapter submit with nock-mocked 4xx returns fallback so browser is tried next. | nock + test. |
| TR-8.4 | rule | Lever/Ashby adapters exist, canApply correctly, submit returns typed result. | Unit tests per adapter. |

---

## Task 9: Browser pool & Playwright enhancements (FR-3.1, FR-3.2)

**Priority:** high
**Depends on:** Task 1, Task 3
**Scope:**
- Replace the browser singleton pattern in `browser.manager.ts` + `playwright.service.ts` with a typed pool of `BrowserContext` objects (pool size = env `BROWSER_POOL_MAX`).
- `launch()` returns a pooled `{ browser, contextId, release() }` wrapper; release returns context to pool instead of closing.
- Stealth patches:
  - `launchPersistentContext` or `newContext` with randomized viewport (1280–1920 x 720–1080), timezone `Asia/Kolkata`, locale `en-IN` or `en-US`, per-context user agent rotation list of real Chrome UAs.
  - `addInitScript` that: sets `navigator.webdriver = undefined`, `navigator.languages = ['en-US','en','hi-IN']`, masks `chrome.runtime` presence, randomizes `screen.*`, plugins array.
  - If env `PROXY_URL` set → `proxy: { server: process.env.PROXY_URL }` in context options.
  - Headless default `headless: env.HEADLESS === 'false' ? false : 'new'`.
- Ensure `browser.tool.ts` / `playwright.service.ts` exports updated; backward compat for callers that today `await browserTool.launch()` and `.newPage()`.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-9.1 | rule | Pool instantiated with size 2 → two acquire() return 2 distinct contexts; release() followed by acquire() returns first again (reuse). | Unit test with mocked Playwright. |
| TR-9.2 | rule | Init script injection sets navigator.webdriver undefined. | evaluate assert via page.evaluate in browser pool spec. |
| TR-9.3 | rule | PlaywrightService with `HEADLESS=false` launches non-headless; default `new` on default env. | Launch options assertion. |

---

## Task 10: ATS DOM adapter interface + auto-detector (FR-3.3, AC-R-3, AC-RB-1)

**Priority:** high
**Depends on:** Task 9
**Scope:**
- Create `modules/browser/ats-dom/adapter.interface.ts`:
  ```ts
  export interface AtsDomAdapter {
    name: string; // 'greenhouse-dom'
    detect(page: Page): Promise<boolean>;
    navigateToApplyForm(page: Page): Promise<void>;
    fillPersonal(page, profile); ... multi-step navigation: next(page) until on last step: submit(page), detectSubmitButton(page).
  }
  ```
- Implement `modules/browser/ats-dom/ats-detector.ts`: iterates all adapters, calls each detect(page); returns first matching adapter.
- Ensure detectors inspect:
  - Greenhouse: URL contains `boards.greenhouse.io` or DOM contains `#application_form` or `.apply-button`.
  - Lever: URL contains `jobs.lever.co` or form `postings-form`.
  - Workday: URL contains `.workday.com` or data-uid / iframe `*workday*`.
  - Ashby: URL contains `ashbyhq.com` or DOM `[data-ashby]`.
  - LinkedIn EasyApply: URL contains `linkedin.com/jobs` or `.jobs-search-box__text-input` or EasyApply button.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-10.1 | rule | Detector returns Greenhouse adapter on a GH HTML fixture page mock; returns Lever on a Lever mock page. | Unit tests with mock pages. |
| TR-10.2 | rubric | Adapter breadth (0–2): 0 = 1 adapter; 1 = 3 adapters; 2 = 5 adapters registered + detect all works. Threshold ≥ 2. | Adapter count assertion. |

---

## Task 11: Greenhouse + Lever + Workday DOM adapters (multi-step aware) (FR-3.3, AC-R-3, AC-RB-1)

**Priority:** high
**Depends on:** Task 10
**Scope:**
- `greenhouse-dom.adapter.ts`: navigate to apply, click Continue through (Personal → Resume → Voluntary Disclosures → Questions → Review), fill each step by smart locator order, robust next/submit.
- `lever-dom.adapter.ts`: fill personal questions, resume upload field, submit.
- `workday-dom.adapter.ts`: handle iframe wrapping, fill first iframe, common fields, workday typical buttons.
- `ashby-dom.adapter.ts`: Ashby-specific form.
- `linkedin-easyapply-dom.adapter.ts`: LinkedIn EasyApply flow via modal dialogs (public URL).
- All adapters share `uploadResume(page, file) delegates to ResumeUploadTool.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-11.1 | rubric | Multi-step navigation success (0–2): 0 = no stepwise fails immediately; 1 = GH or Lever multi-step navigates N steps; 2 = GH multi-step + Lever multi-step both reach final step. Threshold ≥ 1. | Mocked DOM steps test. |
| TR-11.2 | rule | Greenhouse adapter fills at least 10 fields and presses submit on mocked GH DOM. | Assert page.fill call count ≥ 10 and submit.click called once. |
| TR-11.3 | rule | Workday adapter switches into iframe for fill without error. | Unit test with iframe fixture. |

---

## Task 12: FormQuestionAIService — LLM-grounded screening Q&A (FR-3.5, AC-R-4, AC-RB-5)

**Priority:** high
**Depends on:** Task 1, Task 2
**Scope:**
- Create `modules/ai/form-question-ai.service.ts`:
  - `answer(userId, jobDescription, profileContext, question, fieldLabel, type): Promise<{value: string; grounded: boolean; sourceFacts: string[]}>.
  - Cache key `sha1(question.normalize + userId + jobId)` → Map with 24h TTL in-memory + Prisma `FormAnswerCache model OR simple Map (choose in-memory for speed; V1).
  - Prompt in `ai/prompt.service.ts` add new `FORM_QUESTION_PROMPT` strictly instructing to answer only from provided profile/resume facts; explicitly output "N/A" if not available, never invent.
  - Uses `ai.service.ts` (existing Gemini/OpenAI provider factory).
  - FormTool.fillFields when no candidateMapper match → fall through to this new AI service for unknown required questions; cache hits reused.
- Update `form.tool.ts` fill pipeline: candidateMapper first; if empty value then AI service; if still empty → mark missing → outsiderMissing.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-12.1 | rule | Answer cached on first call; second identical call returns same string without calling LLM. | Mock LLM call count == 1. |
| TR-12.2 | rule | When profile lacks info → LLM prompt yields "N/A" or strictly profile-consistent value; no arbitrary invented phone/years/gpa etc. | Mock LLM fixture provider returns N/A test. |
| TR-12.3 | rubric | Grounding quality (0–2): 0 = answer uses only LLM free text; 1 = uses profile in prompt; 2 = prompts explicitly list facts and instruct to abstain. Threshold ≥ 2. | Prompt string inspection asserts grounding sections present. |

---

## Task 13: CandidateMapper 60 field expansion (FR-5.5, AC-R-9)

**Priority:** medium
**Depends on:** Task 2
**Scope:**
- Update `modules/agent/candidate/candidate.mapper.ts` resolver switch/case map from 20→60 fields:
  firstName, lastName, fullName, email, phone, address, city, state, country, zip/postal, linkedin, github, portfolio, website, currentCompany, currentTitle, yearsOfExperience, noticePeriod, expectedSalaryCtc, currentSalaryCtc, sponsorshipRequired, remotePreference, authorizedToWorkInIndia authorizedToWorkInUs dateOfBirth gender nationality maritalStatus visaStatus workAuthorization highestDegree degree university fieldOfStudy graduationYear school college universityMajor gpa workEligibility rehire willingnessToRelocate willingnessToTravel startDate availability criminalRecord felony militaryService veteran disability governmentEmployee securityClearance leetcode codeforces summary tagline coverletterSummary referral referralName salaryExpectations noticePeriodMonths expectedHourlyRate linkedinUrl githubUrl portfolioUrl resumeText yearsOfExperienceFloat experienceSummary topSkills etc.
- Unit test `__tests__/candidate-mapper.spec.ts` with a fully seeded Profile + resume; assert ≥ 55 of 60 return non-empty.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-13.1 | rule | Total switch/case entries >= 60 distinct field label matchers (count >= 60). | Line count / keys length assertion. |
| TR-13.2 | rule | Rich profile test returns non-empty for >= 55 of the 60 canonical labels. | Unit test table assert. |

---

## Task 14: Resume upload robustness & submission verification (FR-3.4, FR-3.6)

**Priority:** medium
**Depends on:** Task 9
**Scope:**
- Improve `resume-upload.tool.ts`:
  - Handle `<input type="file">` by label/text selector; if 0 matches → try aria-label, try drag-drop zone via `setInputFiles`; if iframe → `frameLocator`.
  - If fileUrl is remote URL, download to tmp Buffer first (fetch buffer from data URL.
- Improve `submission-verification.tool.ts`:
  - More success indicators: URL thank-you page contains "application submitted|successfully applied|thank you for applying|we have received your application|application #|confirmation".
  - Also check for network success URL patterns greenhouse `?thank-you=true`, lever success endpoint, workday thank-you route.
  - Failure reasons include more precise detection of job closed, error banner, "already applied".

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-14.1 | rule | resumeUploadTool with mocked file input → setInputFiles called once. | Unit test. |
| TR-14.2 | rule | submissionVerification on a "thank you" body mock → verified=true. | Test. |
| TR-14.3 | rule | submissionVerification on "already applied" → verified=false, reason=already applied. | Test. |

---

## Task 15: QueueWorker concurrent pool + running per-worker (FR-4.1, AC-R-5)

**Priority:** high
**Depends on:** Task 1, Task 3
**Scope:**
- Rewrite `queue.worker.ts`:
  - Internal array of `workers: { id, running, processNext() }` sized QUEUE_CONCURRENCY.
  - `processNext` acquires an available worker; each worker has own `running: false/true`.
  - `processAll()` spawns pool.start(); each worker independently loops, pulling next job.
  - Add `stop()` method sets stopped flag so workers exit after current job.
- Ensure DB row locking / race: `markRunning` returns null if another worker grabbed it (Prisma updateMany where status=QUEUED → return count 1). No lost jobs.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-15.1 | rule | With QUEUE_CONCURRENCY=2, 4 pending jobs → 2 workers active simultaneously; total finish time < 2× sequential single-job duration. | Fake timing test. |
| TR-15.2 | rule | markRunning with race → only 1 of 2 concurrent markRunning calls gets the job; loser returns null. | Race test. |

---

## Task 16: WorkflowEngine wiring end-to-end (FR-4.2, AC-R-5)

**Priority:** high
**Depends on:** Task 7 (registry), Task 9 (browser), Task 15 (queue)
**Scope:**
- Rewrite `workflow.engine.ts execute(batchSize)`:
  1. schedulerService.schedule(batchSize) → QUEUED applications.
  2. For each call ApplicationSubmitService.submitApplication per app.
  3. Errors caught → markFailed / retry queue.
- Update `workflow/scheduler.service.ts` actual scheduling logic: pick QUEUED apps with oldest createdAt; batchSize limit.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-16.1 | rule | Engine execute(2) on 4 pending → processes first 2; next call processes remaining 2. | Step test. |
| TR-16.2 | rule | All status transitions advance correctly. | DB status assertions. |

---

## Task 17: Rate limiter + exponential backoff retry + graceful shutdown (FR-4.5, FR-4.6, AC-R-6, AC-R-10)

**Priority:** high
**Depends on:** Task 3 (bottleneck), Task 1 (env), Task 15 (queue workers)
**Scope:**
- Create `modules/workflow/rate-limiter.ts` using Bottleneck: per-company limiter (company normalised name key). `schedule(companyKey, fn)` schedules fn; max concurrent 1; minTime between calls jittered APPLY_MIN_DELAY_MS–APPLY_MAX_DELAY_MS; hourly cap APPLY_RATE_PER_HOUR_PER_COMPANY; returns Promise of fn.
- Create `modules/workflow/retry.ts`: exponential backoff with jitter. `withRetry(fn, { max, baseMs=1000, capMs=600_000 })`; transient vs permanent classification helper `classifyApplicationError(err)` → permanent if 404 job closed, 403 banned, job missing; else transient.
- ApplicationSubmitService wraps apply pipeline inside `rateLimiter.schedule(companyKey)` call + `withRetry(transientOnly)` inner.
- Graceful shutdown in `server.ts`: `process.on('SIGTERM', handler)` calls `await Promise.all([queueWorker.stop(), browserPool.closeAll()])`.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-17.1 | rule | Rate limiter: 5 fast apply attempts same company → 3 quick then delayed per hour cap. | Bottleneck reservoir test. |
| TR-17.2 | rule | Exponential backoff: first retry fires after baseMs; second after 2·baseMs. | Fake timers test. |
| TR-17.3 | rule | classifyApplicationError returns permanent on 404 job closed → no additional retries beyond maxAttempts. | Unit test. |
| TR-17.4 | rule | SIGTERM handler invokes stop; within 30s pool drained browsers closed. | Integration test script evidence. |

---

## Task 18: ApplicationSubmitService rewrite (FR-13) rewrite to API-first + browser-fallback (AC-R-13)

**Priority:** high
**Depends on:** Task 7 adapter registry, Task 11 adapters, Task 17 rate limiter
**Scope:**
- Rewrite `application-submit.service.ts submitApplication(userId, applicationId)`:
  1. Load application + job + company + profile + resume.
  2. Update status RUNNING + increment attempts.
  3. Call `rateLimiter.schedule(normalizeCompany(company.name), async () => {`
  4. Inside: try API apply via `applyAdapterRegistry.tryApiApply(...)`.
  5. If API `success=true` → SUBMITTED + audit + notification.
  6. If API `requiresBrowserFallback=true` → launch pooled browser → detect ATS DOM adapter → ATS-specific filling + form.tool + resume upload + submit + verify.
  7. AI Q&A via FormQuestionAIService for questions not in profile.
  8. Transient failures use backoff retry up to MAX_APPLY_ATTEMPTS; permanent stops early.
  9. CAPTCHA / missing profile fields → WAITING_FOR_USER + HumanAction record.
 10. Audit logs, notifications emitted exactly as already specified in existing code paths (preserve current behavior).

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-18.1 | rule | Successful API apply path → application status SUBMITTED. | Unit test with mocked registry. |
| TR-18.2 | rule | API fallback → browser path executed; browser pool acquire once. | Mock browser tests. |
| TR-18.3 | rule | Missing profile fields → WAITING_FOR_USER + HumanAction record created. | DB assertions. |
| TR-18.4 | rule | CAPTCHA detected → WAITING_FOR_USER + notification created. | DB assertions. |

---

## Task 19: Scheduler cron + nightly scan-and-apply (FR-4.7)

**Priority:** medium
**Depends on:** Task 18
**Scope:**
- Implement `scheduler.service.ts registerCron(expr, handler)` with `setInterval`-based or node-cron-free simple cron parser (lightweight, no new dep; or import lightweight).
- On app bootstrap in app.ts after source bootstrap: register default hourly scheduler that scans users with profile.nightlyScanEnabled flag and enqueue discover-and-apply.
- Add simple time-driven discovery.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-19.1 | rule | registerCron with `"* * * * *"` fires at least once within 90s. | Test with fast-forward time. |

---

## Task 20: ResumeTailoringService + CoverLetterService (FR-5.2/3, AC-R-8)

**Priority:** medium
**Depends on:** Task 2 schema Resume.tailored, Task 12 AI service
**Scope:**
- Create `ai/resume-tailor.service.ts`:
  - `tailorResume(userId, resumeId, jobDescription)` →
    1. Load original Resume (text.
    2. Call LLM with `RESUME_TAILORING_PROMPT` rewrite summary and bullet point suggestions to emphasize keywords in JD.
    3. Write new tailored Resume row (copy original file (deep copy bytes to new url/file bytes (copy original bytes; persist with tailored=true and source=jobId; return new Resume id (no file rewriting of actual pdf/docx bytes deep copy new Resume row.
- Create `ai/cover-letter.service.ts`:
  - `generate(userId, profile, resumeText, jobDescription, companyName)` → LLM cover letter 3–5 paragraphs; save to `application.coverLetterText` (schema Task 2), return string.
- In LangGraph tailor.node.ts: update tailor → invoke tailoringInstructions now calls resume-tailor + cover-letter; store result into state (no breaking change); pass through to apply.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-20.1 | rule | TailorResume with mocked LLM returns new Resume id; tailored=true persisted. | DB check. |
| TR-20.2 | rule | Cover letter service returns non-empty 200+ char string from mocked LLM. | Assert length. |

---

## Task 21: ATS analysis upgrade — JD-vs-resume match scoring (FR-5.4, FR-5)

**Priority:** medium
**Depends on:** Task 12
**Scope:**
- Rewrite `ats/ats.service.ts analyzeResume(resumeId, jobId?)`:
  - Extract JD keywords + resume keywords; produce scorecard JSON with `{ keywordMatch: {matched: [...], missing: [...]}, experience: {yearsMatch: boolean}, degreeMatch: boolean, overallScore 0–100}`.
  - Persist `application.matchScore` + application.scorecard fields on save.
  - Old simple keyword list replaced; use LLM if enabled optionally (configurable ATS_USE_LLM) for better scoring.
- Ranking node in agent graph uses new ATS score for sort.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-21.1 | rule | analyzeResume returns score 0–100, scorecard with matched/missing arrays. | Shape assertions. |
| TR-21.2 | rule | Application.matchScore updated after analyze call. | DB row check. |

---

## Task 22: Application routes + bulk discover-and-apply route (FR-4.3, FR-4.4)

**Priority:** high
**Depends on:** Task 18 (submit), Task 5 (sources), Task 20 (tailor)
**Scope:**
- In `application.controller.ts` / routes: ensure `POST /api/v1/applications/:id/submit` exists; controller calls `applicationSubmitService.submitApplication(userId, id)` wrapped async (202 Accepted + returns queue).
- In `agent.controller.ts` / routes: add `POST /api/v1/agent/discover-and-apply` accepts body `{ query, location?, remote?, companyTier?, limit=50 }`:
  1. Run discoverNode-like logic across sources with companyTier & location.
  2. Evaluate + rank top N by ATS score.
  3. Persist jobs + companies to DB.
  4. For each create Application(status=QUEUED).
  5. Enqueue QueueJob rows.
  6. Return `{ discoveredCount, enqueuedCount, runId }` 202.
- Wire to existing router in `app.ts` (if missing endpoint).

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-22.1 | rule | submit endpoint returns 202 + submit service called. | Supertest call + mock. |
| TR-22.2 | rule | discover-and-apply returns enqueuedCount > 0 on mocked sources. | Supertest + mock sources. |

---

## Task 23: E2E test suite expansion, compile, run (AC-R-11, AC-R-12, AC-R-14)

**Priority:** high
**Depends on:** All prior tasks
**Scope:**
- In `apps/server/src/__tests__/backend.e2e.test.ts`:
  - Mock network: nock Greenhouse, Lever API stubs for discovery.
  - Mock Playwright via `{ chromium: { launch: mock } }`.
  - `POST /auth/register` → login → upload resume → create profile → call discover-and-apply → assert 202 + applications created.
  - `POST /applications/:id/submit` → assert status advance to SUBMITTED or WAITING_FOR_USER on CAPTCHA fixture.
- Run:
  - `tsc --noEmit` (pnpm --filter @jobpilot/server exec tsc --noEmit`.
  - `pnpm --filter @jobpilot/server test` run tests pass.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-23.1 | rule | tsc --noEmit → exit 0. | CLI exit code. |
| TR-23.2 | rule | E2E suite passes ≥ 90% tests. | Test runner output. |
| TR-23.3 | rule | LangGraph any node throwing results in status FAILED AgentRun with errors[0] non-empty; notification row created. | Node failure test. |

---

## Task 24: Playwright install + Playwright browser binary install + README operational docs

**Priority:** medium
**Depends on:** Task 3 dependencies installed
**Scope:**
- Add `postinstall` or docs to scripts of `@jobpilot/server`: `"install:browsers": "playwright install chromium"`.
- Run it once in server package.
- Ensure all tests can run in non-headless default true during dev.

### Test Requirements

| ID | Type | TR | Evidence |
|---|---|---|---|
| TR-24.1 | rule | `playwright install chromium` completes; chromium usable from Node. | CLI output. |

---

## Completion of Queue

All tasks Status ∈ { completed, cancelled (user approved) } required. No pending/in_progress/blocked remaining; all cancelled with explicit approval; AC coverage intact.

---

## AC-to-Task Coverage Table

| Spec AC | Covered by Tasks |
|---|---|
| AC-R-1 | Task 4, Task 5 |
| AC-R-2 | Task 7, Task 8 |
| AC-R-3 | Task 10, Task 11 |
| AC-R-4 | Task 12 |
| AC-R-5 | Task 15, Task 16 |
| AC-R-6 | Task 17 |
| AC-R-7 | Task 4, Task 5, Task 22 |
| AC-R-8 | Task 20 |
| AC-R-9 | Task 13 |
| AC-R-10 | Task 17 |
| AC-R-11 | Task 23 |
| AC-R-12 | Task 23 |
| AC-R-13 | Task 18 |
| AC-R-14 | Task 23 |
| AC-R-15 | Task 1 |
| AC-RB-1 | Task 10, Task 11 |
| AC-RB-2 | Task 9, Task 15, Task 17 |
| AC-RB-3 | Task 4 |
| AC-RB-4 | Task 11, Task 18 |
| AC-RB-5 | Task 12 |
