import test from "node:test";
import assert from "node:assert/strict";
import autoApplyService from "../modules/application/auto-apply.service.js";
import applicationQueueService from "../modules/queue/application-queue.service.js";
import ApplicationStateMachine from "../modules/application/application-state-machine.js";
import humanActionService from "../modules/human-action/human-action.service.js";
import applyAdapterRegistry from "../modules/application/adapters/apply-adapter.registry.js";
import { applyService } from "../modules/browser/apply.service.js";
import atsRateLimiter from "../modules/queue/ats-rate-limiter.js";
import notificationService from "../modules/notification/notification.service.js";
import auditService from "../modules/audit/audit.service.js";
import { prisma } from "@jobpilot/database";

test("Auto-Apply Execution Module Suite", async (t) => {
    // Global mocks for notifications & audits to prevent DB clutter during tests
    const origNotificationCreate = notificationService.create;
    const origAuditCreate = auditService.create;
    notificationService.create = async () => ({} as any);
    auditService.create = async () => ({} as any);

    t.after(() => {
        notificationService.create = origNotificationCreate;
        auditService.create = origAuditCreate;
    });

    await t.test("1. ATS Provider detection maps Greenhouse, Lever, Ashby, Workday, and default", () => {
        assert.equal(autoApplyService.detectAtsProvider("https://boards.greenhouse.io/stripe/jobs/123"), "greenhouse");
        assert.equal(autoApplyService.detectAtsProvider("https://jobs.lever.co/netflix/456"), "lever");
        assert.equal(autoApplyService.detectAtsProvider("https://jobs.ashbyhq.com/openai/789"), "ashby");
        assert.equal(autoApplyService.detectAtsProvider("https://mycompany.myworkdayjobs.com/en-US/careers/job/101"), "workday");
        assert.equal(autoApplyService.detectAtsProvider("https://company.com/careers/engineer"), "default");
    });

    await t.test("2. Missing candidate profile or resume triggers HITL flow and pauses queue in WAITING_FOR_USER", async () => {
        const origFindUnique = (prisma as any).application.findUnique;
        const origFindFirst = (prisma as any).application.findFirst;
        const origCreateAction = humanActionService.createAction;
        const origMarkWaiting = applicationQueueService.markWaitingForUser;

        let actionCreated = false;
        let actionQuestions: any[] = [];
        let queueMarkedWaiting = false;

        // Mock application with missing phone and educations
        (prisma as any).application.findUnique = async () => ({
            id: "app-missing-1",
            userId: "u-candidate-1",
            jobId: "job-1",
            status: "QUEUED",
            resumeId: "resume-1",
            job: {
                id: "job-1",
                title: "Backend Engineer",
                url: "https://boards.greenhouse.io/test/jobs/1",
                company: { name: "Test Corp" },
            },
            resume: { id: "resume-1", fileUrl: "https://storage/cv.pdf" },
            user: {
                profile: {
                    firstName: "Rudra",
                    lastName: "B",
                    email: "rudra@test.com",
                    phone: "", // Missing
                    educations: [], // Missing
                    experiences: [{ title: "Dev", company: "Tech" }],
                },
            },
        });

        (prisma as any).application.findFirst = async () => null;

        humanActionService.createAction = async (input: any) => {
            actionCreated = true;
            actionQuestions = input.questions;
            return { id: "action-1" } as any;
        };

        applicationQueueService.markWaitingForUser = async (id: string, reason: string) => {
            queueMarkedWaiting = true;
            return { id, status: "WAITING_FOR_USER" } as any;
        };

        try {
            const result = await autoApplyService.execute({
                id: "qjob-1",
                applicationId: "app-missing-1",
                userId: "u-candidate-1",
            });

            assert.equal(result, false, "Execution must pause when fields are missing");
            assert.equal(actionCreated, true, "HumanAction must be created");
            assert.equal(queueMarkedWaiting, true, "ApplicationQueue must be marked WAITING_FOR_USER");
            const labels = actionQuestions.map((q) => q.label);
            assert.ok(labels.includes("Phone Number"), "Must flag missing phone number");
            assert.ok(labels.includes("Education History"), "Must flag missing education history");
        } finally {
            (prisma as any).application.findUnique = origFindUnique;
            (prisma as any).application.findFirst = origFindFirst;
            humanActionService.createAction = origCreateAction;
            applicationQueueService.markWaitingForUser = origMarkWaiting;
        }
    });

    await t.test("3. Duplicate prevention: stops re-application if already APPLIED or SUBMITTED", async () => {
        const origFindUnique = (prisma as any).application.findUnique;
        const origFindFirst = (prisma as any).application.findFirst;
        const origMarkCompleted = applicationQueueService.markCompleted;

        let completedCalled = false;

        (prisma as any).application.findUnique = async () => ({
            id: "app-dup-1",
            userId: "u-candidate-1",
            jobId: "job-1",
            status: "APPLIED", // Already applied!
            resumeId: "resume-1",
            job: {
                id: "job-1",
                title: "Backend Engineer",
                url: "https://jobs.lever.co/test/1",
                company: { name: "Test Corp" },
            },
            resume: { id: "resume-1" },
            user: { profile: { firstName: "A", lastName: "B", email: "a@b.com", phone: "123", educations: [{}], experiences: [{}] } },
        });

        applicationQueueService.markCompleted = async (id: string, meta: any) => {
            completedCalled = true;
            return { id, status: "COMPLETED", metadata: meta } as any;
        };

        try {
            const result = await autoApplyService.execute({
                id: "qjob-dup-1",
                applicationId: "app-dup-1",
                userId: "u-candidate-1",
            });

            assert.equal(result, true, "Must resolve completed idempotently without re-submitting");
            assert.equal(completedCalled, true, "Queue item marked completed");
        } finally {
            (prisma as any).application.findUnique = origFindUnique;
            (prisma as any).application.findFirst = origFindFirst;
            applicationQueueService.markCompleted = origMarkCompleted;
        }
    });

    await t.test("4. Duplicate prevention: prevents application if prior application for job is SUBMITTED", async () => {
        const origFindUnique = (prisma as any).application.findUnique;
        const origFindFirst = (prisma as any).application.findFirst;
        const origTransition = ApplicationStateMachine.transition;
        const origMarkFailed = applicationQueueService.markFailed;

        let failedReason = "";
        let transitionStatus = "";

        (prisma as any).application.findUnique = async () => ({
            id: "app-dup-2",
            userId: "u-candidate-1",
            jobId: "job-2",
            status: "QUEUED",
            resumeId: "resume-1",
            job: {
                id: "job-2",
                title: "Backend Engineer",
                url: "https://jobs.ashbyhq.com/test/2",
                company: { name: "Test Corp" },
            },
            resume: { id: "resume-1" },
            user: { profile: { firstName: "A", lastName: "B", email: "a@b.com", phone: "123", educations: [{}], experiences: [{}] } },
        });

        // Another application already submitted
        (prisma as any).application.findFirst = async () => ({
            id: "app-prior-submitted",
            status: "SUBMITTED",
        });

        ApplicationStateMachine.transition = async (req: any) => {
            transitionStatus = req.newStatus;
            return {} as any;
        };

        applicationQueueService.markFailed = async (id: string, reason: string) => {
            failedReason = reason;
            return { id, status: "FAILED" } as any;
        };

        try {
            const result = await autoApplyService.execute({
                id: "qjob-dup-2",
                applicationId: "app-dup-2",
                userId: "u-candidate-1",
            });

            assert.equal(result, false, "Must not execute duplicate application");
            assert.equal(transitionStatus, "FAILED");
            assert.ok(failedReason.includes("Duplicate application"), "Must cite duplicate detection");
        } finally {
            (prisma as any).application.findUnique = origFindUnique;
            (prisma as any).application.findFirst = origFindFirst;
            ApplicationStateMachine.transition = origTransition;
            applicationQueueService.markFailed = origMarkFailed;
        }
    });

    await t.test("5. Successful Official API apply marks completed with verified external confirmation", async () => {
        const origFindUnique = (prisma as any).application.findUnique;
        const origFindFirst = (prisma as any).application.findFirst;
        const origTransition = ApplicationStateMachine.transition;
        const origWaitForSlot = atsRateLimiter.waitForSlot;
        const origTryApi = applyAdapterRegistry.tryApiApply;
        const origMarkCompleted = applicationQueueService.markCompleted;

        const transitions: string[] = [];
        let slotPaced = false;
        let queueMetadata: any = null;

        (prisma as any).application.findUnique = async () => ({
            id: "app-api-success",
            userId: "u-candidate-1",
            jobId: "job-3",
            status: "QUEUED",
            resumeId: "resume-1",
            job: {
                id: "job-3",
                title: "Fullstack Engineer",
                url: "https://boards.greenhouse.io/company/jobs/99",
                company: { name: "GreenhouseCo" },
            },
            resume: { id: "resume-1", fileUrl: "https://storage/cv.pdf" },
            user: {
                profile: {
                    firstName: "Rudra",
                    lastName: "Bhungaliya",
                    email: "rudra@jobpilot.ai",
                    phone: "+91 9999999999",
                    educations: [{ degree: "B.Tech" }],
                    experiences: [{ title: "Engineer" }],
                },
            },
        });

        (prisma as any).application.findFirst = async () => null;

        ApplicationStateMachine.transition = async (req: any) => {
            transitions.push(req.newStatus);
            return {} as any;
        };

        atsRateLimiter.waitForSlot = async (provider: string) => {
            slotPaced = true;
            assert.equal(provider, "greenhouse");
        };

        applyAdapterRegistry.tryApiApply = async () => ({
            success: true,
            confirmationId: "GH-REAL-CONF-98765",
            requiresBrowserFallback: false,
        });

        applicationQueueService.markCompleted = async (id: string, meta: any) => {
            queueMetadata = meta;
            return { id, status: "COMPLETED" } as any;
        };

        try {
            const result = await autoApplyService.execute({
                id: "qjob-api-1",
                applicationId: "app-api-success",
                userId: "u-candidate-1",
            });

            assert.equal(result, true, "API apply must succeed");
            assert.equal(slotPaced, true, "Rate limit pacing must be invoked");
            assert.deepEqual(transitions, ["TAILORING", "READY_TO_SUBMIT", "SUBMITTING"]);
            assert.equal(queueMetadata.confirmationId, "GH-REAL-CONF-98765");
            assert.equal(queueMetadata.method, "API");
        } finally {
            (prisma as any).application.findUnique = origFindUnique;
            (prisma as any).application.findFirst = origFindFirst;
            ApplicationStateMachine.transition = origTransition;
            atsRateLimiter.waitForSlot = origWaitForSlot;
            applyAdapterRegistry.tryApiApply = origTryApi;
            applicationQueueService.markCompleted = origMarkCompleted;
        }
    });

    await t.test("6. Playwright ATS Adapter: Security challenge (CAPTCHA / 2FA) routes to HITL and pauses", async () => {
        const origFindUnique = (prisma as any).application.findUnique;
        const origFindFirst = (prisma as any).application.findFirst;
        const origTransition = ApplicationStateMachine.transition;
        const origWaitForSlot = atsRateLimiter.waitForSlot;
        const origTryApi = applyAdapterRegistry.tryApiApply;
        const origApplyAdapter = applyService.applyWithAdapter;
        const origCreateAction = humanActionService.createAction;
        const origMarkWaiting = applicationQueueService.markWaitingForUser;

        let hitlActionCreated = false;
        let pausedQueueReason = "";

        (prisma as any).application.findUnique = async () => ({
            id: "app-captcha-1",
            userId: "u-candidate-1",
            jobId: "job-4",
            status: "QUEUED",
            resumeId: "resume-1",
            job: {
                id: "job-4",
                title: "Software Engineer",
                url: "https://mycompany.myworkdayjobs.com/careers/job/101",
                company: { name: "WorkdayCo" },
            },
            resume: { id: "resume-1", fileUrl: "https://storage/cv.pdf" },
            user: {
                profile: {
                    firstName: "Rudra",
                    lastName: "B",
                    email: "rudra@jobpilot.ai",
                    phone: "+91 9999999999",
                    educations: [{ degree: "B.Tech" }],
                    experiences: [{ title: "Dev" }],
                },
            },
        });

        (prisma as any).application.findFirst = async () => null;
        ApplicationStateMachine.transition = async () => ({} as any);
        atsRateLimiter.waitForSlot = async () => {};

        applyAdapterRegistry.tryApiApply = async () => ({
            success: false,
            requiresBrowserFallback: true,
        });

        applyService.applyWithAdapter = async () => ({
            success: false,
            status: "WAITING_FOR_USER",
            requiresHumanVerification: true,
            verificationType: "Cloudflare Turnstile",
            failureReason: "Cloudflare Turnstile challenge detected.",
        });

        humanActionService.createAction = async () => {
            hitlActionCreated = true;
            return { id: "action-captcha" } as any;
        };

        applicationQueueService.markWaitingForUser = async (id: string, reason: string) => {
            pausedQueueReason = reason;
            return { id, status: "WAITING_FOR_USER" } as any;
        };

        try {
            const result = await autoApplyService.execute({
                id: "qjob-captcha-1",
                applicationId: "app-captcha-1",
                userId: "u-candidate-1",
            });

            assert.equal(result, false, "Execution must pause for CAPTCHA");
            assert.equal(hitlActionCreated, true, "HumanAction must be created for CAPTCHA");
            assert.ok(pausedQueueReason.includes("Cloudflare Turnstile"), "Reason must identify security challenge");
        } finally {
            (prisma as any).application.findUnique = origFindUnique;
            (prisma as any).application.findFirst = origFindFirst;
            ApplicationStateMachine.transition = origTransition;
            atsRateLimiter.waitForSlot = origWaitForSlot;
            applyAdapterRegistry.tryApiApply = origTryApi;
            applyService.applyWithAdapter = origApplyAdapter;
            humanActionService.createAction = origCreateAction;
            applicationQueueService.markWaitingForUser = origMarkWaiting;
        }
    });

    await t.test("7. Playwright ATS Adapter: Real external confirmation marks application SUBMITTED/APPLIED", async () => {
        const origFindUnique = (prisma as any).application.findUnique;
        const origFindFirst = (prisma as any).application.findFirst;
        const origTransition = ApplicationStateMachine.transition;
        const origWaitForSlot = atsRateLimiter.waitForSlot;
        const origTryApi = applyAdapterRegistry.tryApiApply;
        const origApplyAdapter = applyService.applyWithAdapter;
        const origMarkCompleted = applicationQueueService.markCompleted;

        let completedCalled = false;
        let finalMetadata: any = null;

        (prisma as any).application.findUnique = async () => ({
            id: "app-pw-success",
            userId: "u-candidate-1",
            jobId: "job-5",
            status: "QUEUED",
            resumeId: "resume-1",
            job: {
                id: "job-5",
                title: "Senior Engineer",
                url: "https://jobs.lever.co/company/abc-123",
                company: { name: "LeverCo" },
            },
            resume: { id: "resume-1", fileUrl: "https://storage/cv.pdf" },
            user: {
                profile: {
                    firstName: "Rudra",
                    lastName: "B",
                    email: "rudra@jobpilot.ai",
                    phone: "+91 9999999999",
                    educations: [{ degree: "B.Tech" }],
                    experiences: [{ title: "Dev" }],
                },
            },
        });

        (prisma as any).application.findFirst = async () => null;
        ApplicationStateMachine.transition = async () => ({} as any);
        atsRateLimiter.waitForSlot = async () => {};

        applyAdapterRegistry.tryApiApply = async () => ({
            success: false,
            requiresBrowserFallback: true,
        });

        applyService.applyWithAdapter = async () => ({
            success: true,
            status: "SUBMITTED",
            confirmationId: "CONF-PORTAL-9876",
            metadata: { ats: "Lever", verified: true },
        });

        applicationQueueService.markCompleted = async (id: string, meta: any) => {
            completedCalled = true;
            finalMetadata = meta;
            return { id, status: "COMPLETED" } as any;
        };

        try {
            const result = await autoApplyService.execute({
                id: "qjob-pw-success",
                applicationId: "app-pw-success",
                userId: "u-candidate-1",
            });

            assert.equal(result, true, "Verified browser apply must succeed");
            assert.equal(completedCalled, true);
            assert.equal(finalMetadata.confirmationId, "CONF-PORTAL-9876");
            assert.equal(finalMetadata.method, "PLAYWRIGHT");
        } finally {
            (prisma as any).application.findUnique = origFindUnique;
            (prisma as any).application.findFirst = origFindFirst;
            ApplicationStateMachine.transition = origTransition;
            atsRateLimiter.waitForSlot = origWaitForSlot;
            applyAdapterRegistry.tryApiApply = origTryApi;
            applyService.applyWithAdapter = origApplyAdapter;
            applicationQueueService.markCompleted = origMarkCompleted;
        }
    });

    await t.test("8. Strict No Fake Confirmation: unverified external portal is NOT marked submitted", async () => {
        const origFindUnique = (prisma as any).application.findUnique;
        const origFindFirst = (prisma as any).application.findFirst;
        const origTransition = ApplicationStateMachine.transition;
        const origWaitForSlot = atsRateLimiter.waitForSlot;
        const origTryApi = applyAdapterRegistry.tryApiApply;
        const origApplyAdapter = applyService.applyWithAdapter;
        const origMarkCompleted = applicationQueueService.markCompleted;
        const origMarkFailed = applicationQueueService.markFailed;

        let completedCalled = false;
        let failedReason = "";
        let retryAllowed = false;

        (prisma as any).application.findUnique = async () => ({
            id: "app-no-fake",
            userId: "u-candidate-1",
            jobId: "job-6",
            status: "QUEUED",
            resumeId: "resume-1",
            job: {
                id: "job-6",
                title: "Staff Engineer",
                url: "https://jobs.ashbyhq.com/startup/404",
                company: { name: "StartupCo" },
            },
            resume: { id: "resume-1", fileUrl: "https://storage/cv.pdf" },
            user: {
                profile: {
                    firstName: "Rudra",
                    lastName: "B",
                    email: "rudra@jobpilot.ai",
                    phone: "+91 9999999999",
                    educations: [{ degree: "B.Tech" }],
                    experiences: [{ title: "Dev" }],
                },
            },
        });

        (prisma as any).application.findFirst = async () => null;
        ApplicationStateMachine.transition = async () => ({} as any);
        atsRateLimiter.waitForSlot = async () => {};

        applyAdapterRegistry.tryApiApply = async () => ({
            success: false,
            requiresBrowserFallback: true,
        });

        // Adapter could not verify submission confirmation
        applyService.applyWithAdapter = async () => ({
            success: false,
            status: "FAILED",
            failureReason: "Ashby application submission could not be verified on external portal.",
        });

        applicationQueueService.markCompleted = async () => {
            completedCalled = true;
            return {} as any;
        };

        applicationQueueService.markFailed = async (id: string, reason: string, isTransient: boolean) => {
            failedReason = reason;
            retryAllowed = isTransient;
            return { id, status: "FAILED" } as any;
        };

        try {
            const result = await autoApplyService.execute({
                id: "qjob-no-fake",
                applicationId: "app-no-fake",
                userId: "u-candidate-1",
                attempts: 1,
                maxAttempts: 3,
            });

            assert.equal(result, false, "Must not mark success when unverified");
            assert.equal(completedCalled, false, "Must strictly never mark completed");
            assert.ok(failedReason.includes("could not be verified"), "Must record external verification failure");
            assert.equal(retryAllowed, true, "Transient failure allows retry");
        } finally {
            (prisma as any).application.findUnique = origFindUnique;
            (prisma as any).application.findFirst = origFindFirst;
            ApplicationStateMachine.transition = origTransition;
            atsRateLimiter.waitForSlot = origWaitForSlot;
            applyAdapterRegistry.tryApiApply = origTryApi;
            applyService.applyWithAdapter = origApplyAdapter;
            applicationQueueService.markCompleted = origMarkCompleted;
            applicationQueueService.markFailed = origMarkFailed;
        }
    });
});
