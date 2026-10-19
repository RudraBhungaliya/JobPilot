import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { agentGraph } from "../modules/agent/graph/graph.js";
import { AgentState, type AgentStateType } from "../modules/agent/graph/state.js";
import scrapeNode from "../modules/agent/nodes/scrape.node.js";
import autoFillNode from "../modules/agent/nodes/auto-fill.node.js";
import plannerService from "../modules/agent/planner/planner.service.js";
import webScraperSource, { isCanonicalJobUrl } from "../modules/sources/web-scraper.source.js";
import applicationRepository from "../modules/application/application.repository.js";
import applicationService from "../modules/application/application.service.js";
import applicationTool from "../modules/agent/tools/application.tool.js";
import auditService from "../modules/audit/audit.service.js";
import browserTool from "../modules/agent/tools/browser.tool.js";
import checkpointService from "../core/checkpoint/checkpoint.service.js";
import humanActionService from "../modules/human-action/human-action.service.js";

describe("LangGraph Web Scraping & Agentic AutoFill Nodes Audit Suite", () => {
    after(async () => {
        await browserTool.close().catch(() => {});
    });
    it("1. LangGraph graph compiles with scrape and autoFill nodes cleanly", () => {
        assert.ok(agentGraph, "agentGraph should exist and be compiled");
        assert.equal(typeof agentGraph.invoke, "function", "agentGraph should have invoke method");

        const nodes = (agentGraph as any).nodes || {};
        assert.ok("scrape" in nodes, "scrape node must be registered in agentGraph");
        assert.ok("autoFill" in nodes, "autoFill node must be registered in agentGraph");
    });

    it("2. Real discovery from career portals & open web feeds (Arbeitnow / RemoteOK / Portals)", async () => {
        const results = await webScraperSource.search({ keyword: "Engineer" });
        assert.ok(Array.isArray(results), "Results must be an array");
        assert.ok(results.length > 0, "Should discover active tech requisitions");

        let validCount = 0;
        let invalidCount = 0;

        for (const job of results) {
            if (isCanonicalJobUrl(job.url)) {
                validCount++;
            } else {
                invalidCount++;
            }
            assert.ok(job.title && job.title.trim().length > 0, "Discovered job must have title");
            assert.ok(job.company && job.company.trim().length > 0, "Discovered job must have company");
            assert.ok(job.url.startsWith("http"), "Discovered job URL must start with http/https");
        }

        assert.ok(validCount > 0, "Must have valid canonical URLs");
        assert.equal(invalidCount, 0, "Must not return non-canonical or local test URLs");
    });

    it("3. URL canonicalization and rejection of closed / invalid / malformed URLs", () => {
        assert.equal(isCanonicalJobUrl("https://stripe.com/jobs/search"), true);
        assert.equal(isCanonicalJobUrl("https://www.uber.com/careers/"), true);
        assert.equal(isCanonicalJobUrl("https://jobs.ashbyhq.com/zepto"), true);
        assert.equal(isCanonicalJobUrl("http://localhost:3000/jobs"), false);
        assert.equal(isCanonicalJobUrl("https://127.0.0.1:8080"), false);
        assert.equal(isCanonicalJobUrl("ftp://files.example.com"), false);
        assert.equal(isCanonicalJobUrl("invalid-url-string"), false);
        assert.equal(isCanonicalJobUrl(""), false);
    });

    it("4. Deduplication against PostgreSQL database and existing applications", async () => {
        const origFindByUserAndJob = applicationRepository.findByUserAndJob;

        try {
            // Mock that job "j-already-done" is already SUBMITTED in PostgreSQL
            applicationRepository.findByUserAndJob = async (userId: string, jobId: string) => {
                if (jobId.includes("already-done") || jobId.includes("dup")) {
                    return {
                        id: "app-done-1",
                        userId,
                        jobId,
                        status: "SUBMITTED",
                    } as any;
                }
                return null;
            };

            const state = {
                threadId: "test-dedup-thread",
                userId: "u-candidate-dedup",
                query: "Distributed Systems Engineer",
                jobs: [],
                selectedJobs: [],
                evaluated: false,
                ranked: false,
                scrapingCompleted: false,
                autofillCompleted: false,
                tailoringInstructions: [],
                history: [],
                errors: [],
                plannerAction: "SCRAPE",
                plannerReason: "Web scraping tech openings",
                applications: [],
            } as unknown as AgentStateType;

            const update = await scrapeNode.execute(state);
            assert.ok(Array.isArray(update.jobs));
            // Ensure no job marked with already-done exists
            const duplicateFound = update.jobs?.some((j) => j.id.includes("already-done") || j.id.includes("dup"));
            assert.equal(duplicateFound, false, "ScrapeNode must filter out already SUBMITTED jobs");
        } finally {
            applicationRepository.findByUserAndJob = origFindByUserAndJob;
        }
    });

    it("5. Planner routing, graph termination, and infinite loop prevention", async () => {
        // A. Routes to SCRAPE when scraping is requested and scrapingCompleted is false
        const initialSearchState: Partial<AgentStateType> = {
            query: "Web scrape MNC career portal openings",
            jobs: [],
            selectedJobs: [],
            evaluated: false,
            ranked: false,
            scrapingCompleted: false,
            autofillCompleted: false,
            tailoringInstructions: [],
            errors: [],
            history: [],
        };
        const decision1 = await plannerService.decide(initialSearchState as AgentStateType);
        assert.equal(decision1.action, "SCRAPE");

        // B. When scraping completed with 0 jobs found, terminates with END (NO infinite loop!)
        const scrapedEmptyState: Partial<AgentStateType> = {
            query: "Web scrape obscure niche nonexistent openings",
            jobs: [],
            selectedJobs: [],
            evaluated: false,
            ranked: false,
            scrapingCompleted: true,
            autofillCompleted: false,
            tailoringInstructions: [],
            errors: [],
            history: ["Web scraping finished with 0 jobs"],
        };
        const decision2 = await plannerService.decide(scrapedEmptyState as AgentStateType);
        assert.equal(decision2.action, "END", "Must terminate with END after scraping completed with 0 jobs");

        // C. When autofill completed, terminates with END instead of re-entering AUTO_FILL
        const autofillDoneState: Partial<AgentStateType> = {
            query: "Backend Developer",
            jobs: [{ id: "j1", title: "Backend Engineer", company: "Uber", url: "https://www.uber.com/careers" }],
            selectedJobs: [{ id: "j1", title: "Backend Engineer", company: "Uber", url: "https://www.uber.com/careers" }],
            evaluated: true,
            ranked: true,
            scrapingCompleted: true,
            autofillCompleted: true,
            tailoringInstructions: ["Focus Go"],
            errors: [],
            history: ["AutoFill completed"],
        };
        const decision3 = await plannerService.decide(autofillDoneState as AgentStateType);
        assert.notEqual(decision3.action, "AUTO_FILL", "Must not loop to AUTO_FILL after autofillCompleted is true");
        assert.equal(decision3.action, "END");

        // D. Iteration threshold guard prevents infinite execution
        const maxIterState: Partial<AgentStateType> = {
            query: "Infinite Loop Defense Test",
            jobs: [{ id: "j1", title: "SWE", company: "Acme", url: "https://example.com" }],
            selectedJobs: [],
            evaluated: false,
            ranked: false,
            history: Array.from({ length: 25 }, (_, i) => `Step ${i}`),
            errors: [],
        };
        const decision4 = await plannerService.decide(maxIterState as AgentStateType);
        assert.equal(decision4.action, "END", "Planner must terminate at max iteration bound");
    });

    it("6. Strict Compliance: Never guess work authorization, age eligibility, sponsorship, or legal declarations", async () => {
        const origFindOrCreate = applicationService.findOrCreate;
        const origUpdate = applicationTool.updateApplication;
        const origAudit = auditService.create;
        const origLaunch = browserTool.launch;
        const origCreateAction = humanActionService.createAction;

        humanActionService.createAction = async () => ({ id: "mock-ha-compliance" } as any);
        applicationService.findOrCreate = async (userId, data) => ({
            application: { id: `app-compliance-${data.jobId}`, userId, jobId: data.jobId, status: "PENDING" } as any,
            created: true,
            skipped: false,
        });
        applicationTool.updateApplication = async (id, data) => ({ id, status: data.status || "WAITING_FOR_USER" } as any);
        auditService.create = async () => ({} as any);

        // Page simulating an application form with required work authorization and age eligibility questions
        const mockFormPage = {
            goto: async () => {},
            waitForLoadState: async () => {},
            waitForTimeout: async () => {},
            close: async () => {},
            context: () => ({ waitForEvent: async () => null }),
            locator: () => ({
                first: () => ({ isVisible: async () => false, click: async () => {} }),
                count: async () => 0,
            }),
            $$: async () => [
                {
                    evaluate: async (fn: any) => fn({ tagName: "INPUT", type: "text", name: "authorized_to_work", id: "auth_q", required: true }),
                    getAttribute: async (attr: string) => (attr === "aria-required" ? "true" : null),
                    fill: async () => {},
                },
                {
                    evaluate: async (fn: any) => fn({ tagName: "INPUT", type: "checkbox", name: "is_18_or_older", id: "age_q", required: true }),
                    getAttribute: async (attr: string) => (attr === "aria-required" ? "true" : null),
                    check: async () => {},
                },
            ],
            $: async () => null,
            url: () => "https://company.com/apply",
        };

        browserTool.launch = async () => ({
            newPage: async () => mockFormPage as any,
            close: async () => {},
        } as any);

        try {
            // Candidate profile with NO work authorization and NO age eligibility provided
            const unverifiedCandidateState = {
                threadId: "thread-compliance-unverified",
                userId: "u-candidate-unverified",
                query: "Backend Engineer",
                jobs: [],
                selectedJobs: [
                    {
                        id: "j-unverified-auth",
                        title: "Backend Engineer",
                        company: "Company",
                        url: "https://company.com/apply",
                        source: "web_scraper",
                    },
                ],
                resume: {
                    id: "res-unverified",
                    path: "/uploads/resumes/unverified.pdf",
                    tailored: true,
                },
                evaluated: true,
                ranked: true,
                scrapingCompleted: true,
                autofillCompleted: false,
                tailoringInstructions: ["Highlight systems"],
                history: [],
                errors: [],
                plannerAction: "AUTO_FILL",
                plannerReason: "Agentic autofill",
                applications: [],
            } as unknown as AgentStateType;

            const result = await autoFillNode.execute(unverifiedCandidateState);

            // Must NOT guess! Must pause into WAITING_FOR_USER!
            assert.equal(result.plannerAction, "WAITING_FOR_USER", "Must pause into WAITING_FOR_USER when sensitive legal/auth declarations are unverified");
            assert.equal(result.application?.status, "WAITING_FOR_USER", "Application status must be WAITING_FOR_USER");
        } finally {
            applicationService.findOrCreate = origFindOrCreate;
            applicationTool.updateApplication = origUpdate;
            auditService.create = origAudit;
            browserTool.launch = origLaunch;
            humanActionService.createAction = origCreateAction;
        }
    });

    it("7. Strict No Fake Confirmation: unverified external portal is NOT marked submitted", async () => {
        const origFindOrCreate = applicationService.findOrCreate;
        const origUpdate = applicationTool.updateApplication;
        const origAudit = auditService.create;
        const origLaunch = browserTool.launch;
        const origCreateAction = humanActionService.createAction;

        humanActionService.createAction = async () => ({ id: "mock-ha-nofake" } as any);
        let finalStatus = "";

        applicationService.findOrCreate = async (userId, data) => ({
            application: { id: `app-nofake-${data.jobId}`, userId, jobId: data.jobId, status: "PENDING" } as any,
            created: true,
            skipped: false,
        });
        applicationTool.updateApplication = async (id, data) => {
            if (data.status) finalStatus = data.status;
            return { id, status: data.status || "FAILED" } as any;
        };
        auditService.create = async () => ({} as any);

        // Page that submits but provides NO external employer confirmation banner or ID
        const mockFailedVerificationPage = {
            goto: async () => {},
            waitForLoadState: async () => {},
            waitForTimeout: async () => {},
            close: async () => {},
            context: () => ({ waitForEvent: async () => null }),
            locator: (selector?: string) => {
                const isSubmit = Boolean(selector && /submit/i.test(selector));
                return {
                    first: () => ({
                        isVisible: async () => isSubmit,
                        click: async () => {},
                    }),
                    count: async () => (isSubmit ? 1 : 0),
                    innerText: async () => "Internal error: could not submit to external portal",
                };
            },
            $$: async () => [],
            $: async () => null,
            url: () => "https://external-portal.com/apply/unverified",
        };

        browserTool.launch = async () => ({
            newPage: async () => mockFailedVerificationPage as any,
            close: async () => {},
        } as any);

        try {
            const state = {
                threadId: "thread-nofake-verify",
                userId: "u-candidate-nofake",
                query: "Backend Developer",
                jobs: [],
                selectedJobs: [
                    {
                        id: "j-unverified-portal",
                        title: "Platform Engineer",
                        company: "Unverified Inc",
                        url: "https://external-portal.com/apply/unverified",
                        source: "web_scraper",
                    },
                ],
                resume: {
                    id: "res-verified",
                    path: "/uploads/resumes/res.pdf",
                    tailored: true,
                },
                evaluated: true,
                ranked: true,
                scrapingCompleted: true,
                autofillCompleted: false,
                tailoringInstructions: ["Highlight Go"],
                history: [],
                errors: [],
                plannerAction: "AUTO_FILL",
                plannerReason: "Agentic autofill",
                applications: [],
            } as unknown as AgentStateType;

            const result = await autoFillNode.execute(state);

            // Must NOT mark as SUBMITTED when verification fails!
            assert.notEqual(finalStatus, "SUBMITTED", "Must NOT mark as SUBMITTED when external portal verification fails");
            assert.equal(finalStatus, "FAILED", "Unverified external portal must transition to FAILED");
        } finally {
            applicationService.findOrCreate = origFindOrCreate;
            applicationTool.updateApplication = origUpdate;
            auditService.create = origAudit;
            browserTool.launch = origLaunch;
            humanActionService.createAction = origCreateAction;
        }
    });

    it("8. Real Playwright Execution against Controlled Multi-Step Application Form", async () => {
        // Spin up a real, controlled in-memory HTTP server serving a multi-step job application portal
        const server = http.createServer((req, res) => {
            const url = req.url || "/";

            if (url === "/job/101") {
                // Landing page with "Apply Now" button
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Staff Systems Engineer - Acme Tech</title></head>
                    <body>
                        <h1>Staff Systems Engineer</h1>
                        <p>Join Acme Tech to build high-scale distributed systems.</p>
                        <a href="/job/101/apply/step1" id="apply-btn">Apply Now</a>
                    </body>
                    </html>
                `);
            } else if (url === "/job/101/apply/step1") {
                // Step 1: Personal info
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Acme Careers - Step 1</title></head>
                    <body>
                        <form action="/job/101/apply/step2" method="GET">
                            <label for="first_name">First Name</label>
                            <input id="first_name" name="first_name" type="text" />

                            <label for="last_name">Last Name</label>
                            <input id="last_name" name="last_name" type="text" />

                            <label for="email">Email</label>
                            <input id="email" name="email" type="email" />

                            <button type="submit" id="next-btn">Next</button>
                        </form>
                    </body>
                    </html>
                `);
            } else if (url.startsWith("/job/101/apply/step2")) {
                // Step 2: Experience & Custom Question
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Acme Careers - Step 2</title></head>
                    <body>
                        <form action="/job/101/apply/step3" method="GET">
                            <label for="years_exp">Years of Experience</label>
                            <select id="years_exp" name="years_exp">
                                <option value="1-2">1-2 years</option>
                                <option value="5+">5+ years</option>
                            </select>

                            <label for="why_acme">Why do you want to work at Acme Tech?</label>
                            <textarea id="why_acme" name="why_acme"></textarea>

                            <button type="submit" id="next-btn-2">Save & Continue</button>
                        </form>
                    </body>
                    </html>
                `);
            } else if (url.startsWith("/job/101/apply/step3")) {
                // Step 3: Resume upload & final submit
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Acme Careers - Step 3 Review</title></head>
                    <body>
                        <form action="/job/101/apply/confirmation" method="GET">
                            <label for="resume">Attach Resume</label>
                            <input id="resume" name="resume" type="file" />

                            <button type="submit" id="submit-btn">Submit Application</button>
                        </form>
                    </body>
                    </html>
                `);
            } else if (url.startsWith("/job/101/apply/confirmation")) {
                // Confirmation page
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Application Submitted</title></head>
                    <body>
                        <div role="status" class="application-success">
                            <h2>Thank you! Your application has been submitted successfully.</h2>
                            <p>Confirmation Reference ID: ACME-REF-90281</p>
                        </div>
                    </body>
                    </html>
                `);
            } else {
                res.writeHead(404);
                res.end("Not Found");
            }
        });

        await new Promise<void>((resolve) => server.listen(0, resolve));
        const address = server.address() as any;
        const port = address.port;
        const targetUrl = `http://localhost:${port}/job/101`;

        // Launch real headless Playwright browser to test real multi-step navigation
        const browser = await browserTool.launch();
        const page = await browser.newPage();

        try {
            await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
            const title = await page.title();
            assert.match(title, /Acme Tech/);

            // 1. Click landing page "Apply Now"
            const applyLink = page.locator('a:has-text("Apply Now")');
            await applyLink.click();
            await page.waitForLoadState("domcontentloaded");
            assert.match(await page.title(), /Step 1/);

            // 2. Fill personal inputs
            await page.locator("#first_name").fill("Alex");
            await page.locator("#last_name").fill("Morgan");
            await page.locator("#email").fill("alex.morgan@test.com");
            await page.locator('button:has-text("Next")').click();
            await page.waitForLoadState("domcontentloaded");
            assert.match(await page.title(), /Step 2/);

            // 3. Select dropdown and fill textarea custom question
            await page.locator("#years_exp").selectOption("5+");
            await page.locator("#why_acme").fill("Passionate about distributed consensus and scale.");
            await page.locator('button:has-text("Save & Continue")').click();
            await page.waitForLoadState("domcontentloaded");
            assert.match(await page.title(), /Step 3/);

            // 4. Submit application
            await page.locator('button:has-text("Submit Application")').click();
            await page.waitForLoadState("domcontentloaded");

            // 5. Verify real confirmation reference
            const body = await page.locator("body").innerText();
            assert.match(body, /submitted successfully/i);
            assert.match(body, /ACME-REF-90281/);
        } finally {
            await page.close();
            await browser.close();
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    });
});
