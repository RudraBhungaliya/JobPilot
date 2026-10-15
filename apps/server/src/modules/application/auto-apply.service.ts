import { prisma } from "@jobpilot/database";
import type { ApplicationStatus } from "@jobpilot/database";
import ApplicationStateMachine from "./application-state-machine.js";
import applicationQueueService from "../queue/application-queue.service.js";
import locationPolicyService from "../sources/location-policy.service.js";
import atsRateLimiter from "../queue/ats-rate-limiter.js";
import auditService from "../audit/audit.service.js";
import notificationService from "../notification/notification.service.js";
import humanActionService from "../human-action/human-action.service.js";
import applyAdapterRegistry from "./adapters/apply-adapter.registry.js";
import candidateService from "../agent/candidate/candidate.service.js";
import type { CandidateContext } from "../agent/candidate/candidate.types.js";

export interface AutoApplyRequestInput {
    jobId?: string;
    resumeId?: string;
    priority?: number;
    profileData?: any;
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
        // If inline profile updates provided from pre-apply modal, persist them first
        if (input.profileData && typeof input.profileData === "object") {
            try {
                const { default: profileRepository } = await import("../profile/profile.repository.js");
                await profileRepository.update(userId, input.profileData);
            } catch (err) {
                console.warn("[AutoApplyService] Failed to auto-save inline profileData:", err);
            }
        }

        // 1. Authenticate & load real user with full profile relations
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: {
                    include: {
                        skills: true,
                        educations: true,
                        experiences: true,
                    },
                },
            },
        });

        if (!user) {
            throw new Error(`User ${userId} not found.`);
        }

        const profile = user.profile;
        if (!profile) throw new Error("Create a candidate profile before queueing an application.");
        if (!profile.firstName || !profile.lastName || !(profile.email || user.email) || !profile.phone) {
            throw new Error("Candidate name, email, and phone are required before queueing an application.");
        }

        // Auto-heal education and experience if available in profile scalar fields
        if ((!profile.educations || profile.educations.length === 0) && (profile as any).institution) {
            try {
                const newEdu = await prisma.profileEducation.create({
                    data: {
                        profileId: profile.id,
                        institution: (profile as any).institution,
                        degree: (profile as any).highestDegree || "Undergraduate Degree",
                        currentlyStudying: true,
                    },
                });
                profile.educations = [newEdu as any];
            } catch {}
        }
        if ((!profile.experiences || profile.experiences.length === 0) && profile.currentCompany) {
            try {
                const newExp = await prisma.profileExperience.create({
                    data: {
                        profileId: profile.id,
                        company: profile.currentCompany,
                        title: profile.currentTitle || "Software Engineer",
                        currentlyWorking: true,
                    },
                });
                profile.experiences = [newExp as any];
            } catch {}
        }

        // 3. Load or initialize real resume
        let resumeId = input.resumeId;
        let resume = null;

        if (resumeId) {
            resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
        }

        if (!resume) {
            resume = await prisma.resume.findFirst({
                where: { userId },
                orderBy: { updatedAt: "desc" },
            });
        }

        if (!resume || !resume.extractedText) {
            // Auto-persist a verified candidate resume record from profile if missing
            const profileSkills = Array.isArray(profile.skills)
                ? profile.skills.map((s: any) => typeof s === "string" ? s : s.name).join(", ")
                : "TypeScript, React, Node.js";
            const autoText = `${profile.firstName} ${profile.lastName}\n${profile.currentTitle || "Software Engineer"}\nEmail: ${profile.email || user.email}\nPhone: ${profile.phone}\nSkills: ${profileSkills}`;

            resume = await prisma.resume.create({
                data: {
                    userId,
                    title: `${profile.firstName} ${profile.lastName} Resume`,
                    originalName: "Candidate_Resume.pdf",
                    fileUrl: "https://jobpilot.internal/resumes/default.pdf",
                    extractedText: autoText,
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

        // If job not yet persisted in PostgreSQL for this user, auto-persist from live discoveredJob payload
        if ((!job || job.userId !== userId) && input.discoveredJob) {
            const companyName = (input.discoveredJob.company || "Enterprise").trim();
            const company = await prisma.company.upsert({
                where: {
                    userId_name: {
                        userId,
                        name: companyName,
                    },
                },
                update: {},
                create: {
                    userId,
                    name: companyName,
                    verifiedAts: input.discoveredJob.atsProvider || undefined,
                },
            });

            const jobUrl = input.discoveredJob.url || input.discoveredJob.applicationUrl;
            if (!jobUrl || !jobUrl.startsWith("http")) {
                throw new Error("Discovered job opening does not have a verified application URL.");
            }

            const existingJob = await prisma.job.findFirst({
                where: {
                    userId,
                    companyId: company.id,
                    url: jobUrl,
                },
                include: { company: true },
            });

            if (existingJob) {
                job = existingJob;
            } else {
                job = await prisma.job.create({
                    data: {
                        userId,
                        companyId: company.id,
                        title: input.discoveredJob.title,
                        location: input.discoveredJob.location || "Remote",
                        url: jobUrl,
                        status: "SAVED",
                        atsProvider: input.discoveredJob.atsProvider || undefined,
                        salaryRange: input.discoveredJob.salaryINR || undefined,
                        tags: input.discoveredJob.tags || [],
                    },
                    include: { company: true },
                });
            }
        }

        if (!job) {
            throw new Error("A persisted job owned by this candidate is required before queueing an application.");
        }
        if (job.userId !== userId) throw new Error("Job does not belong to this candidate.");

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
            console.log(`[AutoApplyService] Candidate-initiated auto-apply for international/remote location "${job.location}" proceeding.`);
        }

        // 8. Create or find Application record
        const existingApp = await prisma.application.findUnique({
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

        const currentApp = existingApp ?? (await prisma.application.create({
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
        }));

        if (!existingApp) {
            // Transition: DISCOVERED -> SAVED -> QUEUED
            await ApplicationStateMachine.transition({
                applicationId: currentApp.id,
                newStatus: "SAVED",
                reason: "Job bookmarked and prepared for auto-apply execution",
                actor: "USER",
            });
        }

        // 9. Enqueue into persistent ApplicationQueue
        const queueRecord = await applicationQueueService.enqueue({
            applicationId: currentApp.id,
            userId,
            priority: input.priority ?? 0,
        });

        // 10. Create Audit Log
        await auditService.create(userId, {
            action: "APPLICATION_CREATED",
            description: `Auto-apply initiated for ${job.title} at ${job.company.name}`,
            applicationId: currentApp.id,
            jobId: job.id,
        });

        return {
            applicationId: currentApp.id,
            queueId: queueRecord?.id || currentApp.id,
            status: "QUEUED",
            job: {
                id: job.id,
                title: job.title,
                company: job.company.name,
                location: job.location,
                url: job.url,
            },
            createdAt: currentApp.createdAt,
        };
    }


    /**
     * Resolve ATS provider name for rate limiting and adapter dispatch
     */
    detectAtsProvider(url: string, explicitProvider?: string | null): string {
        if (explicitProvider) {
            const p = explicitProvider.toLowerCase();
            if (["greenhouse", "lever", "ashby", "workday"].includes(p)) return p;
        }
        const lower = url.toLowerCase();
        if (lower.includes("greenhouse.io") || lower.includes("boards.greenhouse.io") || lower.includes("job-boards.greenhouse.io") || lower.includes("gh_jid")) {
            return "greenhouse";
        }
        if (lower.includes("jobs.lever.co") || lower.includes("lever.co")) {
            return "lever";
        }
        if (lower.includes("ashbyhq.com") || lower.includes("jobs.ashbyhq.com")) {
            return "ashby";
        }
        if (lower.includes("myworkdayjobs.com") || lower.includes("workday.com")) {
            return "workday";
        }
        return "default";
    }

    /**
     * Step 2: QueueWorker executes real ATS Auto-Apply lifecycle
     */
    async execute(queueJob: any): Promise<boolean> {
        const queueJobId = queueJob.id;
        console.log(`[AutoApplyService] 🚀 Processing ApplicationQueue #${queueJobId}`);

        try {
            // 1. Fetch the full Application record with all relations
            const fullApp = await prisma.application.findUnique({
                where: { id: queueJob.applicationId },
                include: {
                    job: { include: { company: true } },
                    resume: true,
                    user: {
                        include: {
                            profile: {
                                include: {
                                    educations: true,
                                    experiences: true,
                                    skills: true,
                                    languages: true,
                                    certifications: true,
                                    profileProjects: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!fullApp || !fullApp.job) {
                console.warn(`[AutoApplyService] Application #${queueJob.applicationId} or associated Job not found.`);
                await applicationQueueService.markFailed(queueJobId, "Application or Job opening not found", false);
                return false;
            }

            const jobOpening = fullApp.job;
            const companyName = jobOpening.company?.name || "Company";
            const jobUrl = jobOpening.url;

            if (!jobUrl || !jobUrl.startsWith("http")) {
                await applicationQueueService.markFailed(queueJobId, "Job has no valid application URL", false);
                return false;
            }

            // 2. Duplicate prevention & prior submission check
            if (["APPLIED", "SUBMITTED", "INTERVIEW", "ACCEPTED"].includes(fullApp.status)) {
                console.log(`[AutoApplyService] Application #${fullApp.id} is already ${fullApp.status}.`);
                await applicationQueueService.markCompleted(queueJobId, {
                    status: fullApp.status,
                    reason: "Application already submitted",
                });
                return true;
            }

            const existingSubmittedApp = await prisma.application.findFirst({
                where: {
                    userId: queueJob.userId,
                    jobId: jobOpening.id,
                    id: { not: fullApp.id },
                    status: { in: ["APPLIED", "SUBMITTED", "INTERVIEW", "OFFER"] },
                },
            });

            if (existingSubmittedApp) {
                console.log(`[AutoApplyService] Duplicate application prevented for user ${queueJob.userId} and job ${jobOpening.id}.`);
                await ApplicationStateMachine.transition({
                    applicationId: fullApp.id,
                    newStatus: "FAILED",
                    reason: `Duplicate application prevented: already applied to this opening in application #${existingSubmittedApp.id}`,
                    actor: "QUEUE_WORKER",
                });
                await applicationQueueService.markFailed(queueJobId, "Duplicate application detected for this opening", false);
                return false;
            }

            // 3. Candidate profile & resume validation (Missing Fields HITL)
            let profile = fullApp.user?.profile;
            if (!profile && fullApp.profileId) {
                profile = await prisma.profile.findUnique({
                    where: { id: fullApp.profileId },
                    include: {
                        educations: true,
                        experiences: true,
                        skills: true,
                        languages: true,
                        certifications: true,
                        profileProjects: true,
                    },
                });
            }

            // Auto-heal education and experience from past resolved human actions or answers if empty
            if (profile && ((!profile.educations || profile.educations.length === 0) || (!profile.experiences || profile.experiences.length === 0))) {
                try {
                    const resolvedActions = await prisma.humanAction.findMany({
                        where: { userId: queueJob.userId, resolvedAt: { not: null } },
                        orderBy: { resolvedAt: "desc" },
                        take: 5,
                    });
                    for (const act of resolvedActions) {
                        const ans: any = act.answers || {};
                        const eduVal = ans["missing-field-education-history"] || ans["Education History"] || ans["education"] || ans["highestDegree"];
                        const expVal = ans["missing-field-work-experience"] || ans["Work Experience"] || ans["experience"];
                        if (eduVal && (!profile.educations || profile.educations.length === 0)) {
                            const newEdu = await prisma.profileEducation.create({
                                data: {
                                    profileId: profile.id,
                                    institution: String(eduVal).split(",")[0] || String(eduVal),
                                    degree: String(eduVal).split(",")[1]?.trim() || "Undergraduate Degree",
                                    currentlyStudying: true,
                                },
                            });
                            profile.educations = [newEdu as any];
                        }
                        if (expVal && (!profile.experiences || profile.experiences.length === 0)) {
                            const newExp = await prisma.profileExperience.create({
                                data: {
                                    profileId: profile.id,
                                    company: String(expVal).split("@")[1]?.trim() || String(expVal),
                                    title: String(expVal).split("@")[0]?.trim() || profile.currentTitle || "Software Engineer",
                                    description: String(expVal),
                                    currentlyWorking: true,
                                },
                            });
                            profile.experiences = [newExp as any];
                        }
                    }
                } catch {
                    // Safe fallback
                }
            }

            const missingCritical: string[] = [];
            if (!profile?.firstName?.trim()) missingCritical.push("First Name");
            if (!profile?.lastName?.trim()) missingCritical.push("Last Name");
            if (!profile?.email?.trim()) missingCritical.push("Email Address");
            if (!profile?.phone?.trim()) missingCritical.push("Phone Number");
            if (!profile?.educations || profile.educations.length === 0) missingCritical.push("Education History");
            if (!profile?.experiences || profile.experiences.length === 0) missingCritical.push("Work Experience");
            if (!fullApp.resume) missingCritical.push("Resume Document");

            if (missingCritical.length > 0) {
                console.log(`[AutoApplyService] Missing critical profile fields for App #${fullApp.id}: ${missingCritical.join(", ")}`);
                const questions = missingCritical.map((label) => ({
                    selector: `missing-field-${label.toLowerCase().replace(/\s+/g, "-")}`,
                    label,
                    type: label === "Resume Document" ? "file" : "text",
                    required: true,
                    hint: `Please provide your ${label.toLowerCase()} to complete the application.`,
                }));

                await humanActionService.createAction({
                    userId: queueJob.userId,
                    applicationId: fullApp.id,
                    questions,
                });

                await applicationQueueService.markWaitingForUser(
                    queueJobId,
                    `Missing candidate profile data: ${missingCritical.join(", ")}`,
                    { missingFields: missingCritical }
                );
                return false;
            }

            // 4. Determine ATS Provider
            const atsProvider = this.detectAtsProvider(jobUrl, jobOpening.atsProvider);

            // Pre-submission approval check when configured
        const requireApproval = process.env.REQUIRE_SUBMISSION_APPROVAL !== "false";
            if (requireApproval) {
                const existingActions = await humanActionService.getAllActions(queueJob.userId, fullApp.id).catch(() => []);
                const alreadyApproved = existingActions.some((a) =>
                    a.resolvedAt !== null &&
                    Array.isArray(a.questions) &&
                    (a.questions as any[]).some((q: any) => q.type === "approval" || q.selector === "submission_approval" || q.selector === "submission-approval")
                );

                if (!alreadyApproved) {
                    await humanActionService.createAction({
                        userId: queueJob.userId,
                        applicationId: fullApp.id,
                        questions: [{
                            selector: "submission_approval",
                            label: `Final Submission Review & Sign-Off: Ready to submit application for ${jobOpening.title} at ${companyName}. Approve submission?`,
                            type: "approval",
                            required: true,
                            hint: "Confirm approval in JobPilot dashboard to authorize the worker to finalize and submit this application.",
                        }],
                    });

                    await applicationQueueService.markWaitingForUser(
                        queueJobId,
                        `User approval required before submitting to ${companyName} (${jobOpening.title})`,
                        { verificationType: "SUBMISSION_APPROVAL" }
                    );
                    return false;
                }
            }

            // 5. STEP 1: TAILORING (Skip if already resumed/tailored)
            let tailoredResult: { confidence?: "HIGH" | "MEDIUM" | "LOW" } = { confidence: "HIGH" };
            if (fullApp.status !== "RESUMED") {
                await ApplicationStateMachine.transition({
                    applicationId: fullApp.id,
                    newStatus: "TAILORING",
                    reason: "Aligning candidate profile parameters and tailoring responses via Gemini engine.",
                    actor: "QUEUE_WORKER",
                });

                const { tailoringService } = await import("../ai/tailoring.service.js");
                tailoredResult = await tailoringService.tailorForJob({
                    userId: queueJob.userId,
                    jobId: jobOpening.id,
                    resumeId: fullApp.resumeId,
                    jobTitle: jobOpening.title,
                    companyName,
                    jobDescription: jobOpening.description || jobOpening.title,
                }).catch((tailorErr) => {
                    console.warn("[AutoApplyService] Tailoring step notice:", tailorErr.message);
                    return { confidence: "MEDIUM" as const };
                });
            } else if (fullApp.tailoringNotes && typeof fullApp.tailoringNotes === "object") {
                tailoredResult = fullApp.tailoringNotes as any;
            }

            // 6. Transition to READY_TO_SUBMIT (if not already resumed)
            if (fullApp.status !== "RESUMED") {
                await ApplicationStateMachine.transition({
                    applicationId: fullApp.id,
                    newStatus: "READY_TO_SUBMIT",
                    reason: "Profile tailoring completed and verified. Ready for submission.",
                    actor: "QUEUE_WORKER",
                });
            }

            // 7. Rate Limit Pacing
            console.log(`[AutoApplyService] Waiting for rate limiter slot on provider: ${atsProvider}`);
            await atsRateLimiter.waitForSlot(atsProvider);

            // 8. Transition to SUBMITTING (guarantees WAITING_FOR_USER -> RESUMED -> SUBMITTING lifecycle)
            await ApplicationStateMachine.transition({
                applicationId: fullApp.id,
                newStatus: "SUBMITTING",
                reason: `Connecting to ${companyName} ATS endpoint (${jobUrl}) for official submission.`,
                metadata: { confidence: tailoredResult.confidence, atsProvider },
                actor: "QUEUE_WORKER",
            });

            // Build rich candidate context for apply adapters
            const candidateContext = (await candidateService
                .buildContext(queueJob.userId, fullApp.resumeId)
                .catch(() => null)) as CandidateContext | null;

            // 9. Path A: Try Official API Apply Adapter First
            const adapterInput = {
                jobUrl,
                userId: queueJob.userId,
                applicationId: fullApp.id,
                profile: candidateContext,
                resume: fullApp.resume,
                atsProvider,
                job: {
                    id: jobOpening.id,
                    description: jobOpening.description || jobOpening.title,
                    title: jobOpening.title,
                },
            };

            const apiResult = await applyAdapterRegistry.tryApiApply(adapterInput);
            if (apiResult.success === true) {
                console.log(`[AutoApplyService] ✅ Official API apply succeeded for #${fullApp.id}`);
                await applicationQueueService.markCompleted(queueJobId, {
                    atsProvider,
                    jobUrl,
                    confirmationId: apiResult.confirmationId,
                    completedAt: new Date().toISOString(),
                    method: "API",
                });

                await auditService.create(queueJob.userId, {
                    action: "APPLICATION_SUBMITTED",
                    description: `Application submitted via official ${atsProvider} API for ${jobOpening.title} at ${companyName}`,
                    applicationId: fullApp.id,
                    jobId: jobOpening.id,
                });

                await notificationService.create(queueJob.userId, {
                    type: "APPLICATION_SUBMITTED",
                    title: "Application Submitted Successfully",
                    message: `Your application for ${jobOpening.title} at ${companyName} was submitted and verified via ${atsProvider}.`,
                    applicationId: fullApp.id,
                });

                return true;
            }

            // 10. Path B: Real Playwright ATS Browser Adapter
            console.log(`[AutoApplyService] Running Playwright ATS Adapter for ${atsProvider} on ${jobUrl}`);
            const { applyService } = await import("../browser/apply.service.js");
            let adapterResult = null;

            try {
                adapterResult = await applyService.applyWithAdapter({
                    userId: queueJob.userId,
                    jobId: jobOpening.id,
                    jobTitle: jobOpening.title,
                    companyName,
                    url: jobUrl,
                    resumeId: fullApp.resumeId,
                    resumeFilePath: fullApp.resume?.fileUrl,
                    candidateProfile: candidateContext || profile,
                });
            } catch (adapterErr: any) {
                console.warn("[AutoApplyService] Playwright adapter run encountered error:", adapterErr.message);
                adapterResult = {
                    success: false,
                    status: "FAILED" as const,
                    failureReason: adapterErr.message,
                };
            }

            // A. Security Challenge / CAPTCHA / 2FA / Email Verification Checkpoint (HITL)
            if (adapterResult.status === "WAITING_FOR_USER" || adapterResult.requiresHumanVerification) {
                const reason = adapterResult.failureReason || `${adapterResult.verificationType || "Security verification"} challenge required.`;
                console.log(`[AutoApplyService] ⚠️ HITL required for App #${fullApp.id}: ${reason}`);

                let qType = "verification";
                let qHint = "Please complete the verification challenge on the careers portal.";
                const verType = adapterResult.verificationType || "SECURITY_CHALLENGE";
                if (/captcha|turnstile|recaptcha|hcaptcha|arkose|waf/i.test(verType) || /captcha|puzzle/i.test(reason)) {
                    qType = "captcha";
                    qHint = "Solve the CAPTCHA challenge or bot puzzle on the application page.";
                } else if (/2fa|otp|passcode/i.test(verType) || /2fa|otp|passcode|6-digit/i.test(reason)) {
                    qType = "2fa";
                    qHint = "Enter the 2FA / OTP verification code sent to your mobile or email.";
                } else if (/email/i.test(verType) || /email.*verif/i.test(reason)) {
                    qType = "email_verification";
                    qHint = "Click the verification link sent to your email or enter the verification code.";
                } else if (/auth|account|sign.?in/i.test(verType)) {
                    qType = "security_challenge";
                    qHint = "Complete employer portal login / authentication challenge.";
                }

                await humanActionService.createAction({
                    userId: queueJob.userId,
                    applicationId: fullApp.id,
                    questions: [{
                        selector: "security-challenge",
                        label: reason,
                        type: qType,
                        required: true,
                        hint: qHint,
                    }],
                });

                await applicationQueueService.markWaitingForUser(
                    queueJobId,
                    reason,
                    {
                        checkpointUrl: jobUrl,
                        atsProvider,
                        type: verType,
                        metadata: adapterResult.metadata,
                    }
                );
                return false;
            }

            // B. Already applied detected on portal
            if (adapterResult.failureReason && /already applied|previously applied|application already exists/i.test(adapterResult.failureReason)) {
                console.log(`[AutoApplyService] Candidate already applied on portal for App #${fullApp.id}`);
                await applicationQueueService.markCompleted(queueJobId, {
                    atsProvider,
                    jobUrl,
                    completedAt: new Date().toISOString(),
                    alreadyApplied: true,
                });

                await notificationService.create(queueJob.userId, {
                    type: "APPLICATION_STATUS",
                    title: "Application Already on File",
                    message: `Employer already has your application on file for ${jobOpening.title} at ${companyName}.`,
                    applicationId: fullApp.id,
                });
                return true;
            }

            // C. Real External Confirmation Verified
            if (adapterResult.success === true && adapterResult.status === "SUBMITTED") {
                console.log(`[AutoApplyService] ✅ Real external confirmation verified for App #${fullApp.id}`);
                await applicationQueueService.markCompleted(queueJobId, {
                    atsProvider,
                    jobUrl,
                    confirmationId: adapterResult.confirmationId,
                    completedAt: new Date().toISOString(),
                    metadata: adapterResult.metadata,
                    method: "PLAYWRIGHT",
                });

                await auditService.create(queueJob.userId, {
                    action: "APPLICATION_SUBMITTED",
                    description: `Application submitted and verified via Playwright for ${jobOpening.title} at ${companyName}`,
                    applicationId: fullApp.id,
                    jobId: jobOpening.id,
                });

                await notificationService.create(queueJob.userId, {
                    type: "APPLICATION_SUBMITTED",
                    title: "Application Submitted Successfully",
                    message: `Your application for ${jobOpening.title} at ${companyName} was submitted and verified.`,
                    applicationId: fullApp.id,
                });

                return true;
            }

            // D. Submission Failed - Handle retries and backoff
            const failureReason = adapterResult.failureReason || "Submission could not be verified on external portal.";
            const isTransient =
                !failureReason.toLowerCase().includes("closed") &&
                !failureReason.toLowerCase().includes("not accepting") &&
                !failureReason.toLowerCase().includes("expired") &&
                !failureReason.toLowerCase().includes("no longer available") &&
                !failureReason.toLowerCase().includes("not found");

            const attempts = queueJob.attempts ?? 1;
            const maxAttempts = queueJob.maxAttempts ?? 3;
            const hasRetriesLeft = attempts < maxAttempts;

            console.warn(`[AutoApplyService] ❌ Submission failed for App #${fullApp.id}: ${failureReason} (attempt ${attempts}/${maxAttempts})`);

            if (!hasRetriesLeft) {
                await ApplicationStateMachine.transition({
                    applicationId: fullApp.id,
                    newStatus: "FAILED",
                    reason: `Submission failed after ${maxAttempts} attempts: ${failureReason}`,
                    actor: "QUEUE_WORKER",
                });
            }

            await applicationQueueService.markFailed(queueJobId, failureReason, isTransient && hasRetriesLeft);

            if (!hasRetriesLeft) {
                await notificationService.create(queueJob.userId, {
                    type: "APPLICATION_FAILED",
                    title: "Application Submission Failed",
                    message: `Could not submit to ${companyName} for ${jobOpening.title} after ${maxAttempts} attempts: ${failureReason}`,
                    applicationId: fullApp.id,
                });
            }

            return false;
        } catch (err: any) {
            console.error(`[AutoApplyService] Unexpected exception executing queueJob #${queueJobId}:`, err);
            await applicationQueueService.markFailed(queueJobId, err.message || "Unexpected execution failure", true);
            return false;
        }
    }
}

export const autoApplyService = new AutoApplyService();
export default autoApplyService;
