import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@jobpilot/database";
import ApplicationStateMachine from "../modules/application/application-state-machine.js";
import emailService from "../modules/notification/email.service.js";
import { ResendEmailProvider } from "../modules/notification/providers/resend.provider.js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

test("Submission Email Hook & Idempotency Final Audit Suite", async (t) => {
    let testUser: any = null;
    let testJob: any = null;
    let testResume: any = null;
    let testApp: any = null;

    t.before(async () => {
        // Find or create test user, job, resume
        testUser = await prisma.user.findFirst({
            where: { email: "rud28b@gmail.com" },
            include: { profile: true },
        });

        if (!testUser) {
            testUser = await prisma.user.create({
                data: {
                    email: "rud28b@gmail.com",
                    password: "dummyhash",
                    profile: {
                        create: {
                            firstName: "Rudra",
                            lastName: "Bhungaliya",
                            email: "rud28b@gmail.com",
                            phone: "+91 9876543210",
                            city: "Bengaluru",
                        },
                    },
                },
                include: { profile: true },
            });
        }

        testJob = await prisma.job.findFirst({
            include: { company: true },
        });

        if (!testJob) {
            let company = await prisma.company.findFirst();
            if (!company) {
                company = await prisma.company.create({
                    data: {
                        userId: testUser.id,
                        name: "Audit Tech Corp",
                        domain: "audittech.example.com",
                    },
                });
            }
            testJob = await prisma.job.create({
                data: {
                    userId: testUser.id,
                    title: "Senior Full Stack Engineer",
                    companyId: company.id,
                    url: "https://careers.audittech.example.com/jobs/101",
                    location: "Bengaluru, Karnataka, India",
                },
                include: { company: true },
            });
        }

        testResume = await prisma.resume.findFirst({
            where: { userId: testUser.id },
        });

        if (!testResume) {
            testResume = await prisma.resume.create({
                data: {
                    userId: testUser.id,
                    title: "Staff Engineer ATS Resume",
                    originalName: "staff_engineer_ats.pdf",
                    fileUrl: "https://example.com/resumes/staff_engineer_ats.pdf",
                },
            });
        }
    });

    t.beforeEach(async () => {
        // Create fresh application in SUBMITTING status for each test
        // Remove any previous conflicting application for this user + job
        await prisma.notification.deleteMany({
            where: { userId: testUser.id },
        });
        await prisma.applicationStatusTransition.deleteMany({
            where: { application: { userId: testUser.id } },
        });
        await prisma.applicationQueue.deleteMany({
            where: { userId: testUser.id },
        });
        await prisma.application.deleteMany({
            where: { userId: testUser.id, jobId: testJob.id },
        });

        testApp = await prisma.application.create({
            data: {
                userId: testUser.id,
                jobId: testJob.id,
                resumeId: testResume.id,
                status: "SUBMITTING",
            },
            include: {
                user: { include: { profile: true } },
                job: { include: { company: true } },
                resume: true,
            },
        });

        await prisma.applicationQueue.create({
            data: {
                applicationId: testApp.id,
                userId: testUser.id,
                status: "PROCESSING",
            },
        });
    });

    t.after(async () => {
        if (testApp) {
            await prisma.notification.deleteMany({ where: { applicationId: testApp.id } }).catch(() => {});
            await prisma.applicationStatusTransition.deleteMany({ where: { applicationId: testApp.id } }).catch(() => {});
            await prisma.applicationQueue.deleteMany({ where: { applicationId: testApp.id } }).catch(() => {});
            await prisma.application.deleteMany({ where: { id: testApp.id } }).catch(() => {});
        }
        await prisma.$disconnect();
    });

    await t.test("1. Idempotency: Duplicate transitions & queue retries do NOT send duplicate notification emails", async () => {
        let emailCallCount = 0;
        let lastInput: any = null;

        const origAlert = emailService.sendApplicationStatusAlert.bind(emailService);
        emailService.sendApplicationStatusAlert = async (input: any) => {
            emailCallCount++;
            lastInput = input;
            return { success: true };
        };

        try {
            // First transition: SUBMITTING -> SUBMITTED (official submission confirmed)
            const confirmationCode = "AUDIT-CONF-88910-REAL";
            const firstResult = await ApplicationStateMachine.transition({
                applicationId: testApp.id,
                newStatus: "SUBMITTED",
                reason: "Official employer submission verified on portal",
                metadata: { confirmationCode, verifiedSubmission: true },
                actor: "ATS_AGENT",
            });

            assert.equal(firstResult.application.status, "SUBMITTED");
            assert.equal(emailCallCount, 1, "Email must be dispatched exactly once on initial SUBMITTED transition");
            assert.equal(lastInput.confirmationCode, confirmationCode);

            // Verify Notification record was persisted in database
            const savedNotif = await prisma.notification.findFirst({
                where: { applicationId: testApp.id, type: "APPLICATION_SUBMITTED" },
            });
            assert.ok(savedNotif, "APPLICATION_SUBMITTED notification record must be persisted");

            // Second transition: Duplicate transition to SUBMITTED (e.g. queue retry or webhook re-delivery)
            await ApplicationStateMachine.transition({
                applicationId: testApp.id,
                newStatus: "SUBMITTED",
                reason: "Worker retry / duplicate event",
                metadata: { confirmationCode, verifiedSubmission: true },
                actor: "QUEUE_WORKER",
            });

            assert.equal(emailCallCount, 1, "Duplicate SUBMITTED transition MUST NOT send a second notification email");

            // Third transition: Natural progression from SUBMITTED to APPLIED
            await ApplicationStateMachine.transition({
                applicationId: testApp.id,
                newStatus: "APPLIED",
                reason: "Application queue marked completed",
                metadata: { confirmationCode, verifiedSubmission: true },
                actor: "QUEUE_WORKER",
            });

            assert.equal(emailCallCount, 1, "Progression from SUBMITTED to APPLIED MUST NOT send a duplicate email");
        } finally {
            emailService.sendApplicationStatusAlert = origAlert;
        }
    });

    await t.test("2. Provider failure resiliency: Email failures do NOT corrupt application state or cause duplicate submissions", async () => {
        const origAlert = emailService.sendApplicationStatusAlert.bind(emailService);
        // Force provider to throw an unexpected network / delivery error
        emailService.sendApplicationStatusAlert = async () => {
            throw new Error("Resend API 503 Service Unavailable: Remote mail gateway down");
        };

        try {
            const confirmationCode = "AUDIT-CONF-FAILSAFE-99";
            const result = await ApplicationStateMachine.transition({
                applicationId: testApp.id,
                newStatus: "SUBMITTED",
                reason: "Verified submission receipt",
                metadata: { confirmationCode, verifiedSubmission: true },
                actor: "ATS_AGENT",
            });

            // Transition must complete successfully without crashing
            assert.equal(result.application.status, "SUBMITTED");

            // Verify database state: Application must be SUBMITTED, not corrupted or reverted to FAILED
            const persistedApp = await prisma.application.findUnique({
                where: { id: testApp.id },
            });
            assert.equal(persistedApp?.status, "SUBMITTED", "Application status must remain SUBMITTED in DB");
            assert.equal(persistedApp?.confirmationCode, confirmationCode, "Confirmation code must be saved");

            // Verify queue state: Must be COMPLETED so the worker does not retry and cause duplicate submissions
            const queueRecord = await prisma.applicationQueue.findUnique({
                where: { applicationId: testApp.id },
            });
            assert.equal(queueRecord?.status, "COMPLETED", "Queue job must be marked COMPLETED to prevent duplicate submission");
        } finally {
            emailService.sendApplicationStatusAlert = origAlert;
        }
    });

    await t.test("3. False-success prevention & Valid state transition enforcement", async () => {
        // A. Attempt to transition to SUBMITTED without evidence or confirmation code
        await assert.rejects(
            async () => {
                await ApplicationStateMachine.transition({
                    applicationId: testApp.id,
                    newStatus: "SUBMITTED",
                    reason: "Automated claim without proof",
                    metadata: {}, // Missing confirmationCode and verifiedSubmission
                    actor: "ATS_AGENT",
                });
            },
            /False-success prevention: Cannot transition application.*without verified employer confirmation evidence/,
            "Should strictly reject transitions to SUBMITTED lacking verified evidence"
        );

        // Verify status in DB was NOT modified
        const appAfterRejected = await prisma.application.findUnique({ where: { id: testApp.id } });
        assert.equal(appAfterRejected?.status, "SUBMITTING", "Application status must remain untouched after rejection");

        // B. Attempt to jump to SUBMITTED from an invalid state (e.g. WAITING_FOR_USER)
        await prisma.application.update({
            where: { id: testApp.id },
            data: { status: "WAITING_FOR_USER" },
        });

        await assert.rejects(
            async () => {
                await ApplicationStateMachine.transition({
                    applicationId: testApp.id,
                    newStatus: "SUBMITTED",
                    reason: "Illegal jump from checkpoint",
                    metadata: { confirmationCode: "LEAP-CODE" },
                    actor: "ATS_AGENT",
                });
            },
            /Invalid state transition: Cannot transition application.*from WAITING_FOR_USER/,
            "Should strictly reject transitions to SUBMITTED directly from WAITING_FOR_USER"
        );
    });

    await t.test("4. Persisted data accuracy: Email fields strictly match persisted database records", async () => {
        let sentInput: any = null;
        const origAlert = emailService.sendApplicationStatusAlert.bind(emailService);
        emailService.sendApplicationStatusAlert = async (input: any) => {
            sentInput = input;
            return { success: true };
        };

        try {
            const expectedCode = "OFFICIAL-RECEIPT-GH-77124";
            await ApplicationStateMachine.transition({
                applicationId: testApp.id,
                newStatus: "SUBMITTED",
                reason: "Confirmed via Employer Careers Portal",
                metadata: { confirmationCode: expectedCode, verifiedSubmission: true },
                actor: "ATS_AGENT",
            });

            const refreshedApp = await prisma.application.findUnique({
                where: { id: testApp.id },
                include: { user: { include: { profile: true } }, resume: true, job: { include: { company: true } } },
            });

            assert.ok(sentInput, "Notification payload must have been sent");
            assert.equal(sentInput.to, refreshedApp?.user.profile?.email || refreshedApp?.user.email, "Candidate email in email must match persisted profile email");
            assert.equal(sentInput.confirmationCode, expectedCode, "Confirmation code in email must match persisted application code");
            assert.equal(sentInput.resumeTitle, refreshedApp?.resume.title, "Resume title in email must match persisted resume title");
            assert.ok(sentInput.appliedAt, "Timestamp must be present in email payload");
            assert.equal(new Date(sentInput.appliedAt).getTime(), new Date(refreshedApp?.appliedAt!).getTime(), "Timestamp in email must match persisted appliedAt");
            assert.equal(sentInput.companyName, refreshedApp?.job.company.name, "Company name must match persisted job company");
            assert.equal(sentInput.jobTitle, refreshedApp?.job.title, "Job title must match persisted job title");
        } finally {
            emailService.sendApplicationStatusAlert = origAlert;
        }
    });

    await t.test("5. Sandbox Routing Security: Production strictly prevents redirection; Development routing is explicit", async () => {
        const provider = new ResendEmailProvider();

        // Simulate Resend sandbox error
        const mockClient = {
            emails: {
                send: async (payload: any) => {
                    if (payload.to.includes("someone_else@example.com")) {
                        return {
                            data: null,
                            error: { message: "You can only send testing emails to your own email address (rud28b@gmail.com)" },
                        };
                    }
                    return { data: { id: "resend_msg_sandbox_redirected" }, error: null };
                },
            },
        };
        (provider as any).client = mockClient;

        // In production: redirection MUST NEVER occur
        const prevEnv = process.env.NODE_ENV;
        try {
            process.env.NODE_ENV = "production";
            process.env.RESEND_SANDBOX_REDIRECT_EMAIL = "rud28b@gmail.com";

            const prodResult = await provider.send({
                to: "someone_else@example.com",
                subject: "Production Alert",
                text: "Should never redirect in production",
            });

            assert.equal(prodResult.success, false, "Must fail in production when restricted; cannot silently redirect");
            assert.match(prodResult.error || "", /testing email/, "Must report actual error rather than redirecting");

            // In development: redirection occurs ONLY when RESEND_SANDBOX_REDIRECT_EMAIL is set
            process.env.NODE_ENV = "development";
            const devResult = await provider.send({
                to: "someone_else@example.com",
                subject: "Development Alert",
                text: "Should redirect safely in dev",
            });

            assert.equal(devResult.success, true, "Should redirect in development when explicitly configured");
            assert.equal(devResult.id, "resend_msg_sandbox_redirected");

            // In development without RESEND_SANDBOX_REDIRECT_EMAIL: must NOT redirect
            delete process.env.RESEND_SANDBOX_REDIRECT_EMAIL;
            const noRedirectResult = await provider.send({
                to: "someone_else@example.com",
                subject: "Dev Alert Without Configured Sandbox",
                text: "Should fail safely",
            });

            assert.equal(noRedirectResult.success, false, "Must not redirect when RESEND_SANDBOX_REDIRECT_EMAIL is not configured");
        } finally {
            process.env.NODE_ENV = prevEnv;
            process.env.RESEND_SANDBOX_REDIRECT_EMAIL = "rud28b@gmail.com";
        }
    });
});
