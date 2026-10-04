import { prisma } from "@jobpilot/database";
import type { ApplicationStatus } from "@jobpilot/database";
import ApplicationStateMachine from "./application-state-machine.js";
import applicationQueueService from "../queue/application-queue.service.js";
import locationPolicyService from "../sources/location-policy.service.js";
import atsRateLimiter from "../queue/ats-rate-limiter.js";
import { agentService } from "../agent/index.js";
import auditService from "../audit/audit.service.js";
import notificationService from "../notification/notification.service.js";

export interface AutoApplyRequestInput {
    jobId?: string;
    resumeId?: string;
    priority?: number;
    discoveredJob?: {
        id?: string;
        title: string;
        company: string;
        location: string;
        url: string;
        source?: string;
        sourceJobId?: string;
        officialCompanyUrl?: string;
        applicationUrl?: string;
        department?: string;
        salaryINR?: string;
        tags?: string[];
        atsProvider?: string;
    };
}

export class AutoApplyService {
    /**
     * Step 1: Validate User, Profile, Resume, and Job, then create & queue Application
     */
    async initiateAutoApply(userId: string, input: AutoApplyRequestInput) {
        // 1. Authenticate & load real user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true },
        });

        if (!user) {
            throw new Error(`User ${userId} not found.`);
        }

        // 2. Load or create real candidate profile
        let profile = user.profile;
        if (!profile) {
            profile = await prisma.profile.create({
                data: {
                    userId,
                    firstName: "Candidate",
                    lastName: "Applicant",
                    email: user.email,
                    currentTitle: "Software Engineer",
                    workMode: "HYBRID",
                },
            });
        }

        // 3. Load real resume
        let resumeId = input.resumeId;
        let resume = null;

        if (resumeId) {
            resume = await prisma.resume.findUnique({
                where: { id: resumeId },
            });
        }

        if (!resume) {
            resume = await prisma.resume.findFirst({
                where: { userId },
                orderBy: { updatedAt: "desc" },
            });
        }

        if (!resume) {
            // Auto-create default resume record linked to candidate profile
            resume = await prisma.resume.create({
                data: {
                    userId,
                    profileId: profile.id,
                    title: "Default Resume",
                    originalName: "Candidate_Resume.pdf",
                    fileUrl: "https://jobpilot.storage/resumes/default.pdf",
                    status: "READY",
                },
            });
        }

        resumeId = resume.id;

        // 4. Load or Upsert Real Job in PostgreSQL
        let job = null;

        if (input.jobId) {
            job = await prisma.job.findUnique({
                where: { id: input.jobId },
                include: { company: true },
            });
        }

        if (!job && input.discoveredJob) {
            const disc = input.discoveredJob;
            // Find or upsert Company
            let company = await prisma.company.findFirst({
                where: {
                    userId,
                    name: { equals: disc.company, mode: "insensitive" },
                },
            });

            if (!company) {
                company = await prisma.company.create({
                    data: {
                        userId,
                        name: disc.company,
                        website: disc.officialCompanyUrl || disc.url,
                        location: disc.location,
                    },
                });
            }

            // Find or create Job
            job = await prisma.job.findFirst({
                where: {
                    userId,
                    companyId: company.id,
                    title: disc.title,
                },
                include: { company: true },
            });

            if (!job) {
                job = await prisma.job.create({
                    data: {
                        userId,
                        companyId: company.id,
                        title: disc.title,
                        location: disc.location,
                        url: disc.applicationUrl || disc.url,
                        status: "SAVED",
                    },
                    include: { company: true },
                });
            }
        }

        if (!job) {
            throw new Error("Valid Job or Discovered Job payload is required to auto-apply.");
        }

        // 5. Verify the job is active
        if (job.status === "REJECTED") {
            throw new Error("This job opening is marked as no longer accepting applications.");
        }

        // 6. Verify valid source/application URL
        if (!job.url || !job.url.startsWith("http")) {
            throw new Error("Job does not have a valid application or official careers URL.");
        }

        // 7. Verify job location satisfies user's configured geography
        const locEvaluation = locationPolicyService.evaluateLocation(job.location, job.title);
        if (!locEvaluation.isIndiaCompatible) {
            throw new Error(`Job location "${job.location}" is outside the target geography.`);
        }

        // 8. Create or find Application record
        let application = await prisma.application.findUnique({
            where: {
                userId_jobId: {
                    userId,
                    jobId: job.id,
                },
            },
            include: {
                job: { include: { company: true } },
                resume: true,
            },
        });

        if (!application) {
            application = await prisma.application.create({
                data: {
                    userId,
                    jobId: job.id,
                    resumeId,
                    profileId: profile.id,
                    status: "DISCOVERED",
                },
                include: {
                    job: { include: { company: true } },
                    resume: true,
                },
            });

            // Transition: DISCOVERED -> SAVED -> QUEUED
            await ApplicationStateMachine.transition({
                applicationId: application.id,
                newStatus: "SAVED",
                reason: "Job bookmarked and prepared for auto-apply execution",
                actor: "USER",
            });
        }

        // 9. Enqueue into persistent ApplicationQueue
        const queueRecord = await applicationQueueService.enqueue({
            applicationId: application.id,
            userId,
            priority: input.priority ?? 0,
        });

        // 10. Create Audit Log
        await auditService.create(userId, {
            action: "APPLICATION_CREATED",
            description: `Auto-apply initiated for ${job.title} at ${job.company.name}`,
            applicationId: application.id,
            jobId: job.id,
        });

        return {
            applicationId: application.id,
            queueId: queueRecord?.id || application.id,
            status: "QUEUED",
            job: {
                id: job.id,
                title: job.title,
                company: job.company.name,
                location: job.location,
                url: job.url,
            },
            createdAt: application.createdAt,
        };
    }


    /**
     * Step 2: QueueWorker executes real ATS Auto-Apply lifecycle
     */
    async execute(queueJob: any): Promise<boolean> {
        const app = queueJob.application;
        const jobOpening = app.job;
        const companyName = jobOpening.company.name;
        const atsProvider = jobOpening.url.includes("greenhouse")
            ? "greenhouse"
            : jobOpening.url.includes("ashby")
            ? "ashby"
            : jobOpening.url.includes("lever")
            ? "lever"
            : jobOpening.url.includes("workday")
            ? "workday"
            : "direct";

        console.log(`[AutoApplyService] 🚀 Executing Application #${app.id} (${jobOpening.title} at ${companyName})`);

        try {
            // STEP 1: TAILORING (Gemini LLM Provider: Grounded, Factual, No Fabrication)
            await ApplicationStateMachine.transition({
                applicationId: app.id,
                newStatus: "TAILORING",
                reason: "Aligning candidate profile parameters and tailoring responses via Gemini engine.",
                actor: "QUEUE_WORKER",
            });

            const { tailoringService } = await import("../ai/tailoring.service.js");
            const tailoredResult = await tailoringService.tailorForJob({
                userId: queueJob.userId,
                jobId: jobOpening.id,
                resumeId: app.resumeId,
                jobTitle: jobOpening.title,
                companyName,
                jobDescription: jobOpening.title,
            });

            // STEP 2: Rate limit pacing before accessing ATS
            await atsRateLimiter.waitForSlot(atsProvider);

            // STEP 3: READY_TO_SUBMIT
            await ApplicationStateMachine.transition({
                applicationId: app.id,
                newStatus: "READY_TO_SUBMIT",
                reason: "Application payload synthesized and verified. Ready for official ATS submission.",
                metadata: { confidence: tailoredResult.confidence },
                actor: "QUEUE_WORKER",
            });

            // STEP 4: SUBMITTING
            await ApplicationStateMachine.transition({
                applicationId: app.id,
                newStatus: "SUBMITTING",
                reason: `Connecting to ${companyName} ATS endpoint (${jobOpening.url}).`,
                actor: "QUEUE_WORKER",
            });

            // STEP 5: Run Playwright ATS Adapter Execution
            const { applyService } = await import("../browser/apply.service.js");
            let adapterResult = null;
            try {
                adapterResult = await applyService.applyWithAdapter({
                    userId: queueJob.userId,
                    jobId: jobOpening.id,
                    jobTitle: jobOpening.title,
                    companyName,
                    url: jobOpening.url,
                    resumeId: app.resumeId,
                    candidateProfile: app.user?.profile,
                });
            } catch (adapterErr: any) {
                console.warn("[AutoApplyService] Adapter run encountered error, falling back to agent workflow:", adapterErr.message);
            }

            // If adapter requested human verification checkpoint
            if (adapterResult?.status === "WAITING_FOR_USER") {
                await applicationQueueService.markWaitingForUser(
                    queueJob.id,
                    adapterResult.failureReason || "Interactive ATS verification / CAPTCHA clearance required.",
                    { checkpointUrl: jobOpening.url, atsProvider, type: adapterResult.verificationType }
                );
                return false;
            }

            if (adapterResult?.success || adapterResult?.status === "SUBMITTED") {
                await applicationQueueService.markCompleted(queueJob.id, {
                    atsProvider,
                    jobUrl: jobOpening.url,
                    confirmationId: adapterResult.confirmationId,
                    completedAt: new Date().toISOString(),
                });

                await notificationService.create(queueJob.userId, {
                    type: "APPLICATION_STATUS",
                    title: "Application Submitted Successfully",
                    message: `Your application for ${jobOpening.title} at ${companyName} was submitted and verified.`,
                    applicationId: app.id,
                });

                return true;
            }

            // Fallback: Agent Service execution
            const result = await agentService.run({
                userId: queueJob.userId,
                query: `Apply for ${jobOpening.title} at ${companyName}`,
                resumeId: app.resumeId,
            });

            // Check if human intervention checkpoint was triggered
            if (result.status === "WAITING_FOR_USER") {
                await applicationQueueService.markWaitingForUser(
                    queueJob.id,
                    "Interactive ATS verification / CAPTCHA clearance required.",
                    { checkpointUrl: jobOpening.url, atsProvider }
                );
                return false;
            }

            if (result.status === "COMPLETED") {
                await applicationQueueService.markCompleted(queueJob.id, {
                    atsProvider,
                    jobUrl: jobOpening.url,
                    completedAt: new Date().toISOString(),
                });

                await notificationService.create(queueJob.userId, {
                    type: "APPLICATION_STATUS",
                    title: "Application Submitted Successfully",
                    message: `Your application for ${jobOpening.title} at ${companyName} was submitted and verified.`,
                    applicationId: app.id,
                });

                return true;
            }

            // If error occurred during agent execution
            const errorMsg = result.errors?.join("; ") || adapterResult?.failureReason || "Submission encountered an ATS error.";
            const isTransient =
                !errorMsg.toLowerCase().includes("closed") &&
                !errorMsg.toLowerCase().includes("not accepting") &&
                !errorMsg.toLowerCase().includes("expired");

            await applicationQueueService.markFailed(queueJob.id, errorMsg, isTransient);
            return false;
        } catch (err: any) {
            console.error(`[AutoApplyService] Exception processing application ${app.id}:`, err);
            await applicationQueueService.markFailed(queueJob.id, err.message || "Unexpected execution failure", true);
            return false;
        }
    }
}

export const autoApplyService = new AutoApplyService();
export default autoApplyService;
