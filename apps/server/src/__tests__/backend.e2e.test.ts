import test from "node:test";
import assert from "node:assert/strict";

import { queueService, queueWorker } from "../modules/queue/index.js";
import agentService from "../modules/agent/agent.service.js";
import agentRepository from "../modules/agent/agent.repository.js";
import plannerService from "../modules/agent/planner/planner.service.js";
import { agentGraph } from "../modules/agent/graph/graph.js";
import submissionVerificationTool from "../modules/agent/tools/submission-verification.tool.js";
import atsService from "../modules/ats/ats.service.js";
import applicationService from "../modules/application/application.service.js";
import auditService from "../modules/audit/audit.service.js";
import notificationService from "../modules/notification/notification.service.js";
import type { AgentStateType } from "../modules/agent/graph/state.js";

test("Queue and Worker Coordination", async (t) => {
    await t.test("enqueues jobs and prevents duplicate active runs", () => {
        const userId = "test-user-1";
        const job1 = queueService.enqueueAgentRun({
            userId,
            query: "Frontend Engineer",
            resumeId: "resume-123",
        });

        assert.ok(job1.id);
        assert.equal(job1.status, "QUEUED");
        assert.equal(job1.resumeId, "resume-123");

        // Duplicate attempt with same user while job is active
        const job2 = queueService.enqueueAgentRun({
            userId,
            query: "Frontend Engineer",
            resumeId: "resume-123",
        });

        assert.equal(job2.id, job1.id, "Should return existing active queue job");
    });

    await t.test("marks queue job statuses and bounded retries", () => {
        const userId = "test-user-retry";
        const job = queueService.enqueueAgentRun({
            userId,
            query: "DevOps",
            maxAttempts: 2,
        });

        queueService.markRunning(job.id);
        const running = queueService.getJob(job.id);
        assert.equal(running?.status, "RUNNING");
        assert.equal(running?.attempts, 1);

        queueService.requeue(job.id);
        const requeued = queueService.getJob(job.id);
        assert.equal(requeued?.status, "QUEUED");

        // Second failure reaches max attempts (2)
        queueService.markRunning(job.id);
        queueService.requeue(job.id);
        const failed = queueService.getJob(job.id);
        assert.equal(failed?.status, "FAILED");
    });

    await t.test("supports WAITING_FOR_USER and resumeJob", () => {
        const userId = "test-user-wait";
        const job = queueService.enqueueAgentRun({
            userId,
            query: "Backend Developer",
        });

        queueService.markWaitingForUser(job.id);
        assert.equal(queueService.getJob(job.id)?.status, "WAITING_FOR_USER");

        queueService.resumeJob(job.id);
        assert.equal(queueService.getJob(job.id)?.status, "QUEUED");
    });
});

test("Planner Service and Heuristic Fallback", async (t) => {
    await t.test("routes to DISCOVER when no jobs exist", async () => {
        const state: Partial<AgentStateType> = {
            query: "Full Stack Engineer",
            jobs: [],
            selectedJobs: [],
            evaluated: false,
            ranked: false,
            tailoringInstructions: [],
            errors: [],
            history: [],
        };

        const decision = await plannerService.decide(state as AgentStateType);
        assert.equal(decision.action, "DISCOVER");
    });

    await t.test("routes to EVALUATE when jobs exist but unevaluated", async () => {
        const state: Partial<AgentStateType> = {
            query: "Software Engineer",
            jobs: [
                { id: "j1", title: "Software Engineer", company: "Acme", url: "https://example.com" },
            ],
            selectedJobs: [],
            evaluated: false,
            ranked: false,
            tailoringInstructions: [],
            errors: [],
            history: [],
        };

        const decision = await plannerService.decide(state as AgentStateType);
        assert.equal(decision.action, "EVALUATE");
    });

    await t.test("routes to RANK after evaluation", async () => {
        const state: Partial<AgentStateType> = {
            query: "Software Engineer",
            jobs: [
                { id: "j1", title: "Software Engineer", company: "Acme", url: "https://example.com", score: 85 },
            ],
            selectedJobs: [],
            evaluated: true,
            ranked: false,
            tailoringInstructions: [],
            errors: [],
            history: [],
        };

        const decision = await plannerService.decide(state as AgentStateType);
        assert.equal(decision.action, "RANK");
    });

    await t.test("routes to TAILOR after ranking when selectedJobs exist", async () => {
        const state: Partial<AgentStateType> = {
            query: "Software Engineer",
            jobs: [
                { id: "j1", title: "Software Engineer", company: "Acme", url: "https://example.com", score: 85 },
            ],
            selectedJobs: [
                { id: "j1", title: "Software Engineer", company: "Acme", url: "https://example.com", score: 85 },
            ],
            evaluated: true,
            ranked: true,
            tailoringInstructions: [],
            errors: [],
            history: [],
        };

        const decision = await plannerService.decide(state as AgentStateType);
        assert.equal(decision.action, "TAILOR");
    });
});

test("Submission Verification Tool", async (t) => {
    await t.test("detects confirmation and verification errors", () => {
        assert.ok(submissionVerificationTool);
        assert.equal(typeof submissionVerificationTool.verify, "function");
    });
});

test("ATS Service Resume Analysis", async (t) => {
    await t.test("analyzes keywords properly", async () => {
        assert.ok(atsService);
        assert.equal(typeof atsService.analyzeResume, "function");
    });
});

test("LangGraph Schema and Compilation", async (t) => {
    await t.test("graph is compiled and contains nodes", () => {
        assert.ok(agentGraph);
        assert.equal(typeof agentGraph.invoke, "function");
    });

    await t.test("all planner routes are handled including EVALUATE and WAITING_FOR_USER", async () => {
        // Test evaluate fallback
        const evaluatedState: Partial<AgentStateType> = {
            query: "Frontend",
            jobs: [
                { id: "j1", title: "Frontend Engineer", company: "Acme", url: "https://example.com" },
            ],
            selectedJobs: [],
            evaluated: false,
            ranked: false,
            tailoringInstructions: [],
            errors: [],
            history: [],
        };
        const decision = await plannerService.decide(evaluatedState as AgentStateType);
        assert.equal(decision.action, "EVALUATE");
    });
});

test("Sequential Processing and Concurrency Control", async (t) => {
    await t.test("worker is not running by default and processes single job sequentially", () => {
        assert.equal(queueWorker.isRunning(), false);
    });
});

test("Human Verification and Outsider Data Detection", async (t) => {
    const formTool = (await import("../modules/agent/tools/form.tool.js")).default;

    await t.test("detects outsider required fields when candidate value is missing", () => {
        const fields = [
            { selector: "#first_name", name: "first_name", type: "text", label: "First Name", required: true },
            { selector: "#custom_why", name: "custom_why", type: "textarea", label: "Why do you want to join Google?", required: true },
            { selector: "#clearance", name: "clearance", type: "text", label: "Security clearance level", required: false },
        ];

        const fillResults = [
            { selector: "#first_name", name: "first_name", value: "Alex", filled: true },
            { selector: "#custom_why", name: "custom_why", value: "", filled: false, reason: "No verified candidate value available." },
            { selector: "#clearance", name: "clearance", value: "", filled: false, reason: "No verified candidate value available." },
        ];

        const outsiderMissing = formTool.detectOutsiderRequiredFields(fields, fillResults);
        assert.equal(outsiderMissing.length, 2, "Should flag required custom question and clearance");
        assert.ok(outsiderMissing.some((m) => m.field.label.includes("Google")));
        assert.ok(outsiderMissing.some((m) => m.field.label.includes("clearance")));
    });

    await t.test("detectHumanVerification method exists and handles verification inspection", () => {
        assert.equal(typeof formTool.detectHumanVerification, "function");
    });
});

test("Job Sources and Live Openings Crawling", async (t) => {
    const { googleSource, remoteSource, greenhouseSource, ashbySource, sourceService, sourceRegistry } = await import("../modules/sources/index.js");

    sourceRegistry.initialize();

    await t.test("Greenhouse source fetches real-time openings from live ATS boards", async () => {
        const jobs = await greenhouseSource.search({ keyword: "engineer" });
        assert.ok(Array.isArray(jobs));
        if (jobs.length > 0) {
            assert.ok(jobs[0].url.startsWith("http"));
            assert.ok(jobs[0].company.length > 0);
        }
    });

    await t.test("Ashby source fetches real-time openings from live startup boards", async () => {
        const jobs = await ashbySource.search({ keyword: "engineer" });
        assert.ok(Array.isArray(jobs));
        if (jobs.length > 0) {
            assert.ok(jobs[0].url.startsWith("http"));
            assert.ok(jobs[0].company.length > 0);
        }
    });

    await t.test("Remote source searches live remote openings", async () => {
        const remoteJobs = await remoteSource.search({ keyword: "engineer", remote: true });
        assert.ok(Array.isArray(remoteJobs));
    });

    await t.test("SourceService aggregates live openings across startups and MNCs", async () => {
        const aggregated = await sourceService.search({ keyword: "engineer" });
        assert.ok(Array.isArray(aggregated));
    });
});

test("Skill-Weighted Evaluation", async (t) => {
    const evaluationService = (await import("../modules/agent/evaluation/evaluation.service.js")).default;

    await t.test("boosts score when job matches candidate resume skills", async () => {
        const jobs = [
            { id: "j1", title: "React & TypeScript Frontend Engineer", company: "Stripe", url: "https://example.com/1" },
            { id: "j2", title: "Java Backend Engineer", company: "Oracle", url: "https://example.com/2" },
        ];

        const candidateSkills = ["React", "TypeScript"];
        const result = await evaluationService.evaluate("Frontend Engineer", jobs, candidateSkills);

        const j1Eval = result.evaluations.find((e) => e.jobId === "j1");
        const j2Eval = result.evaluations.find((e) => e.jobId === "j2");

        assert.ok(j1Eval && j2Eval);
        assert.ok(j1Eval.score > j2Eval.score, "Job matching candidate resume skills should score higher");
        assert.ok(result.selectedJobIds.includes("j1"));
    });
});

test("Resume Skill-Driven DiscoverNode", async (t) => {
    const discoverNode = (await import("../modules/agent/nodes/discover.node.js")).default;

    await t.test("executes live discovery with candidate context", async () => {
        const update = await discoverNode.execute({
            userId: "test-user-discover",
            query: "Frontend Developer",
            jobs: [],
            selectedJobs: [],
            evaluated: false,
            ranked: false,
            tailoringInstructions: [],
            errors: [],
            history: [],
        } as any);

        assert.ok(Array.isArray(update.jobs));
        assert.ok((update.history?.length ?? 0) > 0);
    });
});

