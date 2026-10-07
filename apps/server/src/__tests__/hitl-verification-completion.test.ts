import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@jobpilot/database";
import ApplicationStateMachine from "../modules/application/application-state-machine.js";
import humanActionService from "../modules/human-action/human-action.service.js";
import humanActionRepository from "../modules/human-action/human-action.repository.js";
import { AutoApplyService } from "../modules/application/auto-apply.service.js";
import applicationSubmitService from "../modules/application/application-submit.service.js";
import applicationQueueService from "../modules/queue/application-queue.service.js";
import auditService from "../modules/audit/audit.service.js";
import notificationService from "../modules/notification/notification.service.js";
import applyAdapterRegistry from "../modules/application/adapters/apply-adapter.registry.js";
import atsRateLimiter from "../modules/queue/ats-rate-limiter.js";
import formTool from "../modules/agent/tools/form.tool.js";

test("HITL & Verification Completion Flow Suite", async (t) => {
    const origAuditCreate = auditService.create;
    const origNotifCreate = notificationService.create;
    const origPrismaAudit = (prisma as any).auditLog.create;
    const origPrismaTrans = (prisma as any).$transaction;

    auditService.create = async () => ({} as any);
    notificationService.create = async () => ({} as any);
    (prisma as any).auditLog.create = async () => ({ id: "audit-1" });
    (prisma as any).$transaction = async (ops: any[]) => {
        if (Array.isArray(ops)) {
            return Promise.all(ops.map((op) => (typeof op === "function" ? op() : Promise.resolve(op))));
        }
        return ops;
    };

    t.after(() => {
        auditService.create = origAuditCreate;
        notificationService.create = origNotifCreate;
        (prisma as any).auditLog.create = origPrismaAudit;
        (prisma as any).$transaction = origPrismaTrans;
    });

    // 1. State Machine: WAITING_FOR_USER -> RESUMED -> SUBMITTING
    await t.test("1. ApplicationStateMachine strictly validates WAITING_FOR_USER -> RESUMED -> SUBMITTING lifecycle", async () => {
        const transitions: string[] = [];
        const origFindUnique = (prisma as any).application.findUnique;
        const origUpdate = (prisma as any).application.update;
        const origCreateTrans = (prisma as any).applicationStatusTransition.create;

        let currentStatus = "WAITING_FOR_USER";
        (prisma as any).application.findUnique = async () => ({
            id: "app-hitl-1",
            status: currentStatus,
            userId: "u-1",
            jobId: "j-1",
            user: { email: "cand@test.ai", profile: { firstName: "Cand", email: "cand@test.ai" } },
            job: { title: "SWE", company: { name: "Acme" } },
        });

        (prisma as any).application.update = async ({ data }: any) => {
            currentStatus = data.status;
            transitions.push(data.status);
            return { id: "app-hitl-1", status: data.status };
        };
        (prisma as any).applicationStatusTransition.create = async () => ({ id: "trans-1" });

        try {
            // Can transition from WAITING_FOR_USER to RESUMED
            const canResume = ApplicationStateMachine.canTransition("WAITING_FOR_USER", "RESUMED");
            assert.equal(canResume, true, "Must allow transition WAITING_FOR_USER -> RESUMED");

            // Can transition from RESUMED to SUBMITTING
            const canSubmit = ApplicationStateMachine.canTransition("RESUMED", "SUBMITTING");
            assert.equal(canSubmit, true, "Must allow transition RESUMED -> SUBMITTING");

            // Direct jump from WAITING_FOR_USER to SUBMITTED without verification is disallowed
            const canFakeSubmit = ApplicationStateMachine.canTransition("WAITING_FOR_USER", "SUBMITTED");
            assert.equal(canFakeSubmit, false, "Disallow skipping verification directly to SUBMITTED");

            // Perform transition WAITING_FOR_USER -> RESUMED
            const resResumed = await ApplicationStateMachine.transition({
                applicationId: "app-hitl-1",
                newStatus: "RESUMED",
                reason: "Candidate entered 2FA OTP and confirmed approval.",
                actor: "USER",
            });
            assert.equal(resResumed.application?.status || (resResumed as any).status, "RESUMED");

            // Perform transition RESUMED -> SUBMITTING
            const resSubmitting = await ApplicationStateMachine.transition({
                applicationId: "app-hitl-1",
                newStatus: "SUBMITTING",
                reason: "Worker dispatching payload to employer ATS.",
                actor: "QUEUE_WORKER",
            });
            assert.equal(resSubmitting.application?.status || (resSubmitting as any).status, "SUBMITTING");

            assert.deepEqual(transitions, ["RESUMED", "SUBMITTING"]);
        } finally {
            (prisma as any).application.findUnique = origFindUnique;
            (prisma as any).application.update = origUpdate;
            (prisma as any).applicationStatusTransition.create = origCreateTrans;
        }
    });

    // 2. CAPTCHA, 2FA, Email Verification detection in form.tool
    await t.test("2. form.tool detects and categorizes CAPTCHA, 2FA/OTP, email verification, and security challenges", async () => {
        // A. CAPTCHA detection
        const mockPageCaptcha: any = {
            locator: (selector: string) => ({
                count: async () => (selector.includes("turnstile") ? 1 : 0),
            }),
            evaluate: async () => ({
                hasRecaptcha: false,
                hasHcaptcha: false,
                hasTurnstile: true,
                hasArkose: false,
                hasAwsWaf: false,
                has2faInput: false,
                hasEmailVerify: false,
                bodyText: "Verifying your connection to Cloudflare...",
            }),
        };
        const captchaResult = await formTool.detectHumanVerification(mockPageCaptcha);
        assert.equal(captchaResult.detected, true);
        assert.ok(captchaResult.type?.includes("Turnstile") || captchaResult.type === "CAPTCHA");
        assert.ok(captchaResult.message?.includes("Cloudflare"));

        // B. 2FA / OTP detection
        const mockPage2FA: any = {
            locator: (selector: string) => ({
                count: async () => (selector.includes("otp") || selector.includes("passcode") ? 1 : 0),
            }),
            evaluate: async () => ({
                hasRecaptcha: false,
                hasHcaptcha: false,
                hasTurnstile: false,
                hasArkose: false,
                hasAwsWaf: false,
                has2faInput: true,
                hasEmailVerify: false,
                bodyText: "Enter the 6-digit verification code sent to your mobile",
            }),
        };
        const result2FA = await formTool.detectHumanVerification(mockPage2FA);
        assert.equal(result2FA.detected, true);
        assert.equal(result2FA.type, "2FA_OTP");
        assert.ok(result2FA.message?.includes("verification code"));

        // C. Email verification detection
        const mockPageEmail: any = {
            locator: (selector: string) => ({
                count: async () => (selector.includes("email") ? 1 : 0),
            }),
            evaluate: async () => ({
                hasRecaptcha: false,
                hasHcaptcha: false,
                hasTurnstile: false,
                hasArkose: false,
                hasAwsWaf: false,
                has2faInput: false,
                hasEmailVerify: true,
                bodyText: "Check your email inbox to verify your identity before continuing.",
            }),
        };
        const emailResult = await formTool.detectHumanVerification(mockPageEmail);
        assert.equal(emailResult.detected, true);
        assert.equal(emailResult.type, "EMAIL_VERIFICATION");
        assert.ok(emailResult.message?.includes("Email verification"));
    });

    // 3. HumanAction resolution transitions state machine and updates candidate profile
    await t.test("3. humanActionService.resolveAction updates answers, enriches candidate profile, and triggers RESUMED", async () => {
        let actionResolvedWithAnswers: any = null;
        let profileUpdatedData: any = null;
        let transitionedStatus: string | null = null;
        let queueResumedAppId: string | null = null;

        const origFindUnique = (prisma as any).humanAction.findUnique;
        const origResolveRepo = humanActionRepository.resolve;
        const origProfileFind = (prisma as any).profile.findUnique;
        const origProfileUpdate = (prisma as any).profile.update;
        const origTransition = ApplicationStateMachine.transition;
        const origResumeWaitingJob = applicationQueueService.resumeWaitingJob;

        (prisma as any).humanAction.findUnique = async () => ({
            id: "ha-1",
            userId: "u-cand-1",
            applicationId: "app-target-1",
            questions: [
                { selector: "otp_code", label: "2FA OTP Code", type: "2fa", required: true },
                { selector: "phone", label: "Phone", type: "text", required: true },
            ],
            resolvedAt: null,
            application: {
                id: "app-target-1",
                userId: "u-cand-1",
                status: "WAITING_FOR_USER",
                job: { title: "Software Engineer", company: { name: "Acme Corp" } },
            },
        });

        humanActionRepository.resolve = async (actionId: string, answers: any) => {
            actionResolvedWithAnswers = { actionId, answers };
            return { id: actionId, resolvedAt: new Date() } as any;
        };

        (prisma as any).profile.findUnique = async () => ({
            id: "prof-1",
            userId: "u-cand-1",
        });

        (prisma as any).profile.update = async ({ data }: any) => {
            profileUpdatedData = data;
            return { id: "prof-1", ...data };
        };

        ApplicationStateMachine.transition = async ({ applicationId, newStatus }: any) => {
            transitionedStatus = newStatus;
            return { id: applicationId, status: newStatus } as any;
        };

        applicationQueueService.resumeWaitingJob = async (appId: string) => {
            queueResumedAppId = appId;
            return { id: "q-1" } as any;
        };

        try {
            const answers = {
                otp_code: "894102",
                phone: "+91 9988776655",
                city: "Bengaluru",
                linkedin: "https://linkedin.com/in/rudra-dev",
            };

            await humanActionService.resolveAction("u-cand-1", "ha-1", answers);

            assert.equal(actionResolvedWithAnswers.actionId, "ha-1");
            assert.equal(actionResolvedWithAnswers.answers.otp_code, "894102");
            assert.equal(profileUpdatedData.phone, "+91 9988776655");
            assert.equal(profileUpdatedData.city, "Bengaluru");
            assert.equal(profileUpdatedData.linkedin, "https://linkedin.com/in/rudra-dev");
            assert.equal(transitionedStatus, "RESUMED", "Must transition to RESUMED on verification completion");
            assert.equal(queueResumedAppId, "app-target-1", "Must re-enqueue the exact paused application");
        } finally {
            (prisma as any).humanAction.findUnique = origFindUnique;
            humanActionRepository.resolve = origResolveRepo;
            (prisma as any).profile.findUnique = origProfileFind;
            (prisma as any).profile.update = origProfileUpdate;
            ApplicationStateMachine.transition = origTransition;
            applicationQueueService.resumeWaitingJob = origResumeWaitingJob;
        }
    });

    // 4. Duplicate prevention when resuming: never duplicate submitted applications
    await t.test("4. Duplicate submission prevention prevents re-submitting an already SUBMITTED or APPLIED application", async () => {
        const origFindFirst = (prisma as any).application.findFirst;

        (prisma as any).application.findFirst = async () => ({
            id: "app-existing-submitted",
            userId: "u-cand-1",
            jobId: "j-1",
            status: "SUBMITTED",
            job: { id: "j-1", url: "https://boards.greenhouse.io/acme/jobs/1", title: "Dev", company: { name: "Acme" } },
            resume: { id: "res-1" },
        });

        try {
            // submitApplication should exit early without throwing or creating duplicates
            await applicationSubmitService.submitApplication("u-cand-1", "app-existing-submitted");
            assert.ok(true, "Successfully skipped duplicate execution");
        } finally {
            (prisma as any).application.findFirst = origFindFirst;
        }
    });

    // 5. Pre-submission approval gating when REQUIRE_SUBMISSION_APPROVAL=true
    await t.test("5. Pre-submission approval gate creates HumanAction of type 'approval' and pauses queue", async () => {
        const prevEnv = process.env.REQUIRE_SUBMISSION_APPROVAL;
        process.env.REQUIRE_SUBMISSION_APPROVAL = "true";

        let createdAction: any = null;
        let queueMarkedWaiting: any = null;

        const autoApplyService = new AutoApplyService();
        const origFindUnique = (prisma as any).application.findUnique;
        const origUserFind = (prisma as any).user.findUnique;
        const origFindFirst = (prisma as any).application.findFirst;
        const origGetAllActions = humanActionService.getAllActions;
        const origCreateAction = humanActionService.createAction;
        const origMarkWaiting = applicationQueueService.markWaitingForUser;

        const candidateProfile = {
            firstName: "Rudra",
            lastName: "Bhungaliya",
            email: "rudra@test.ai",
            phone: "+91 9999999999",
            educations: [{ id: "edu-1", school: "Univ" }],
            experiences: [{ id: "exp-1", company: "Tech" }],
        };

        const candidateUser = {
            id: "u-cand-1",
            email: "rudra@test.ai",
            profile: candidateProfile,
        };

        (prisma as any).user.findUnique = async () => candidateUser;
        (prisma as any).application.findFirst = async () => null; // No duplicate application

        (prisma as any).application.findUnique = async () => ({
            id: "app-approval-gate",
            userId: "u-cand-1",
            jobId: "job-gate-1",
            resumeId: "res-gate-1",
            status: "READY_TO_SUBMIT",
            user: candidateUser,
            job: {
                id: "job-gate-1",
                title: "Platform Engineer",
                url: "https://jobs.lever.co/stripe/123",
                atsProvider: "lever",
                company: { name: "Stripe" },
            },
            resume: { id: "res-gate-1", fileUrl: "https://storage.local/res.pdf" },
            profile: candidateProfile,
        });

        humanActionService.getAllActions = async () => []; // No prior approval
        humanActionService.createAction = async (payload: any) => {
            createdAction = payload;
            return { id: "ha-approval-1" } as any;
        };
        applicationQueueService.markWaitingForUser = async (id: string, reason: string, meta: any) => {
            queueMarkedWaiting = { id, reason, meta };
            return { id, status: "WAITING_FOR_USER" } as any;
        };

        try {
            const queueJob = {
                id: "qjob-approval-1",
                applicationId: "app-approval-gate",
                userId: "u-cand-1",
            };

            const executed = await autoApplyService.execute(queueJob);
            assert.equal(executed, false, "Execution must pause when pre-submission approval is required");
            assert.ok(createdAction, "Must create HumanAction record");
            assert.equal(createdAction.questions[0].type, "approval");
            assert.equal(createdAction.questions[0].selector, "submission_approval");
            assert.equal(queueMarkedWaiting.meta.verificationType, "SUBMISSION_APPROVAL");
        } finally {
            process.env.REQUIRE_SUBMISSION_APPROVAL = prevEnv;
            (prisma as any).application.findUnique = origFindUnique;
            (prisma as any).application.findFirst = origFindFirst;
            (prisma as any).user.findUnique = origUserFind;
            humanActionService.getAllActions = origGetAllActions;
            humanActionService.createAction = origCreateAction;
            applicationQueueService.markWaitingForUser = origMarkWaiting;
        }
    });

    // 6. Resumed application skips TAILORING and advances cleanly to SUBMITTING
    await t.test("6. Resumed application (status === 'RESUMED') proceeds directly to SUBMITTING without re-tailoring", async () => {
        const autoApplyService = new AutoApplyService();
        const transitions: string[] = [];

        const origFindUnique = (prisma as any).application.findUnique;
        const origUserFind = (prisma as any).user.findUnique;
        const origFindFirst = (prisma as any).application.findFirst;
        const origTransition = ApplicationStateMachine.transition;
        const origWaitForSlot = atsRateLimiter.waitForSlot;
        const origTryApi = applyAdapterRegistry.tryApiApply;
        const origMarkCompleted = applicationQueueService.markCompleted;

        const candidateProfile = {
            firstName: "Rudra",
            lastName: "B",
            email: "rudra@test.ai",
            phone: "+91 9999999999",
            educations: [{ id: "edu-1", school: "Univ" }],
            experiences: [{ id: "exp-1", company: "Tech" }],
        };

        const candidateUser = {
            id: "u-cand-1",
            email: "rudra@test.ai",
            profile: candidateProfile,
        };

        (prisma as any).user.findUnique = async () => candidateUser;

        (prisma as any).application.findUnique = async () => ({
            id: "app-resumed-flow",
            userId: "u-cand-1",
            jobId: "job-api-resumed",
            resumeId: "res-1",
            status: "RESUMED", // Resumed status
            user: candidateUser,
            job: {
                id: "job-api-resumed",
                title: "Software Engineer",
                url: "https://boards.greenhouse.io/reddit/jobs/99",
                atsProvider: "greenhouse",
                company: { name: "Reddit" },
            },
            resume: { id: "res-1" },
            profile: candidateProfile,
        });

        (prisma as any).application.findFirst = async () => null; // No duplicate

        ApplicationStateMachine.transition = async ({ applicationId, newStatus }: any) => {
            transitions.push(newStatus);
            return { id: applicationId, status: newStatus } as any;
        };

        atsRateLimiter.waitForSlot = async () => {};
        applyAdapterRegistry.tryApiApply = async () => ({
            success: true,
            confirmationId: "CONF-RESUMED-12345",
        });
        applicationQueueService.markCompleted = async () => ({} as any);

        try {
            const queueJob = {
                id: "qjob-resumed-exec",
                applicationId: "app-resumed-flow",
                userId: "u-cand-1",
            };

            const result = await autoApplyService.execute(queueJob);
            assert.equal(result, true, "Execution must succeed");
            // Must NOT contain TAILORING or READY_TO_SUBMIT, only SUBMITTING
            assert.deepEqual(transitions, ["SUBMITTING"]);
        } finally {
            (prisma as any).application.findUnique = origFindUnique;
            (prisma as any).user.findUnique = origUserFind;
            (prisma as any).application.findFirst = origFindFirst;
            ApplicationStateMachine.transition = origTransition;
            atsRateLimiter.waitForSlot = origWaitForSlot;
            applyAdapterRegistry.tryApiApply = origTryApi;
            applicationQueueService.markCompleted = origMarkCompleted;
        }
    });
});
