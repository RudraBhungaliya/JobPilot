import { prisma } from "@jobpilot/database";
import applyAdapterRegistry from "./adapters/apply-adapter.registry.js";
import browserPool from "../browser/browser.manager.js";
import domAtsDetector from "../browser/dom-adapter.detector.js";
import auditService from "../audit/audit.service.js";
import notificationService from "../notification/notification.service.js";
import applicationService from "./application.service.js";
import resumeUploadTool from "../agent/tools/resume-upload.tool.js";
import submissionVerificationTool from "../agent/tools/submission-verification.tool.js";
import formTool from "../agent/tools/form.tool.js";
import { AppError } from "../../core/errors/AppError.js";
import logger from "../../core/logger/logger.js";
import { getEnv } from "../../config/env.js";
import type { CandidateContext } from "../agent/candidate/candidate.types.js";
import candidateService from "../agent/candidate/candidate.service.js";

class ApplicationSubmitService {
    async submitApplication(userId: string, applicationId: string): Promise<void> {
        const raw = await prisma.application.findFirst({
            where: { id: applicationId, userId },
            include: {
                job: { include: { company: true } },
                resume: true,
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
        });

        if (!raw) {
            throw new AppError("Application not found.", 404);
        }
        if (!raw.job?.url) {
            throw new AppError("Application or job URL not found.", 404);
        }
        if (!raw.resume) {
            throw new AppError("Resume is required before submitting.", 400);
        }

        // Duplicate prevention: already submitted check
        if (raw.status === "SUBMITTED" || raw.status === "APPLIED") {
            logger.info("Application already submitted; skipping duplicate execution", { applicationId });
            return;
        }

        const existingSubmitted = await prisma.application.findFirst({
            where: {
                userId,
                jobId: raw.jobId,
                id: { not: applicationId },
                status: { in: ["SUBMITTED", "APPLIED"] },
            },
        });
        if (existingSubmitted && existingSubmitted.id !== applicationId) {
            logger.info("Duplicate application prevented for opening", { applicationId, existingId: existingSubmitted.id });
            return;
        }

        const jobUrl = raw.job.url;
        const jobTitle = raw.job.title;
        const companyName = raw.job.company?.name || "Company";
        const atsProvider = raw.job.atsProvider || undefined;

        const profile = raw.profile;
        const missingCritical: string[] = [];
        if (!profile?.firstName) missingCritical.push("First name");
        if (!profile?.lastName) missingCritical.push("Last name");
        if (!profile?.email) missingCritical.push("Email");
        if (!profile?.phone) missingCritical.push("Phone number");
        if (!profile?.educations || profile.educations.length === 0) {
            missingCritical.push("At least one education entry");
        }
        if (!profile?.experiences || profile.experiences.length === 0) {
            missingCritical.push("At least one work experience entry");
        }

        if (missingCritical.length > 0) {
            await this._transitionWaitingForUserMissingFields(
                userId,
                applicationId,
                raw,
                missingCritical,
                jobTitle,
                companyName,
            );
            return;
        }

        // Pre-submission Approval Gate (when configured)
        const requireApproval = process.env.REQUIRE_SUBMISSION_APPROVAL === "true";
        if (requireApproval) {
            const { default: humanActionRepository } = await import("../human-action/human-action.repository.js");
            const existingActions = await humanActionRepository.findByApplication(applicationId, userId).catch(() => []);
            const alreadyApproved = existingActions.some((a) =>
                a.resolvedAt !== null &&
                Array.isArray(a.questions) &&
                (a.questions as any[]).some((q: any) => q.type === "approval" || q.selector === "submission_approval" || q.selector === "submission-approval")
            );

            if (!alreadyApproved) {
                const { default: humanActionService } = await import("../human-action/human-action.service.js");
                await humanActionService.createAction({
                    userId,
                    applicationId,
                    questions: [{
                        selector: "submission_approval",
                        label: `Final Submission Review: Ready to submit application for ${jobTitle} at ${companyName}. Approve submission?`,
                        type: "approval",
                        required: true,
                        hint: "Confirm approval in JobPilot to authorize final submission.",
                    }],
                });

                await applicationService.updateApplication(applicationId, {
                    status: "WAITING_FOR_USER",
                    failureReason: "User approval required before final submission.",
                });

                await auditService.create(userId, {
                    action: "USER_ACTION_REQUIRED",
                    description: `Submission approval required for ${jobTitle} at ${companyName}`,
                    applicationId,
                    jobId: raw.jobId,
                    metadata: { type: "SUBMISSION_APPROVAL" },
                });

                return;
            }
        }

        // Transition: WAITING_FOR_USER -> RESUMED -> SUBMITTING
        try {
            const { default: ApplicationStateMachine } = await import("./application-state-machine.js");
            await ApplicationStateMachine.transition({
                applicationId,
                newStatus: "SUBMITTING",
                reason: `Automated submission started for ${jobTitle} at ${companyName}`,
                actor: "QUEUE_WORKER",
            });
        } catch {
            await applicationService.updateApplication(applicationId, {
                status: "RUNNING",
                attempts: (raw.attempts ?? 0) + 1,
            });
        }

        await auditService.create(userId, {
            action: "APPLICATION_STARTED",
            description: `Automated submission started for ${jobTitle} at ${companyName}`,
            applicationId,
            jobId: raw.jobId,
        });

        const candidateContext = (await candidateService
            .buildContext(userId, raw.resumeId)
            .catch(() => null)) as CandidateContext | null;

        const adapterInput = {
            jobUrl,
            userId,
            applicationId,
            profile: candidateContext,
            resume: raw.resume,
            atsProvider,
            job: {
                id: raw.jobId,
                description: raw.job.description,
                title: jobTitle,
            },
        };

        const apiResult = await applyAdapterRegistry.tryApiApply(adapterInput);
        if (apiResult.success === true) {
            await this._transitionSubmitted(
                userId,
                applicationId,
                raw,
                jobTitle,
                companyName,
                apiResult.confirmationId,
            );
            return;
        }

        logger.debug("API fallback -> browser path", { applicationId, jobUrl });

        const browserAcq = await browserPool.acquire();
        let page: any = null;

        try {
            page = await browserAcq.context.newPage();
            await page
                .goto(jobUrl, {
                    waitUntil: "domcontentloaded",
                    timeout: getEnv().AGENT_PAGE_TIMEOUT_MS,
                })
                .catch((e: Error) =>
                    logger.warn("browser goto partial", { error: e.message }),
                );

            const earlyHV = await formTool
                .detectHumanVerification(page)
                .catch(() => ({ detected: false, message: "" }));
            if (earlyHV.detected) {
                await this._transitionCaptcha(
                    userId,
                    applicationId,
                    raw,
                    jobTitle,
                    companyName,
                    earlyHV.message || "CAPTCHA detected",
                );
                return;
            }

            const detected = await domAtsDetector.detect(page).catch(() => null);
            let browserResult: any = null;

            if (detected) {
                logger.debug("Browser using DOM adapter", {
                    applicationId,
                    ats: detected.name,
                });
                try {
                    browserResult = await detected.adapter.apply(page, adapterInput);
                } catch (err) {
                    logger.warn("DOM adapter failed, trying generic fill", {
                        applicationId,
                        error: err instanceof Error ? err.message : String(err),
                    });
                }
            }

            if (!browserResult || browserResult.success === false) {
                browserResult = await this._genericFormFill(
                    page,
                    adapterInput,
                    raw,
                );
            }

            if (browserResult?.success === true) {
                await this._transitionSubmitted(
                    userId,
                    applicationId,
                    raw,
                    jobTitle,
                    companyName,
                    browserResult.confirmationId,
                );
                return;
            }

            const verification = await submissionVerificationTool
                .verify(page)
                .catch(() => ({
                    verified: false,
                    reason: "verification error",
                    confirmationUrl: "",
                }));
            if (verification.verified) {
                const confId = verification.confirmationUrl
                    ? `REF-${Buffer.from(verification.confirmationUrl)
                          .toString("base64url")
                          .slice(0, 12)}`
                    : browserResult?.confirmationId;
                await this._transitionSubmitted(
                    userId,
                    applicationId,
                    raw,
                    jobTitle,
                    companyName,
                    confId,
                );
                return;
            }

            const failReason =
                browserResult?.reason ||
                verification.reason ||
                "Browser fallback submit did not verify.";
            await this._transitionFailed(
                userId,
                applicationId,
                raw,
                jobTitle,
                companyName,
                failReason,
            );
        } finally {
            if (page) {
                try {
                    await page.close();
                } catch {
                    // ignore
                }
            }
            await browserAcq.release().catch(() => {});
        }
    }

    private async _genericFormFill(
        page: any,
        adapterInput: any,
        raw: any,
    ): Promise<{
        success: boolean;
        confirmationId?: string;
        requiresBrowserFallback?: boolean;
        reason?: string;
    }> {
        try {
            const hv = await formTool
                .detectHumanVerification(page)
                .catch(() => ({ detected: false, message: "" }));
            if (hv.detected) {
                throw new Error(`Human verification required: ${hv.message}`);
            }

            const fields = await formTool.detectFields(page).catch(() => []);
            if (fields.length === 0) {
                return {
                    success: false,
                    requiresBrowserFallback: false,
                    reason: "No form fields detected on career page.",
                };
            }

            const fillResults = await formTool
                .fillFields(page, fields, adapterInput.userId, raw.resumeId)
                .catch(() => []);

            const missing = formTool.detectOutsiderRequiredFields(
                fields,
                fillResults,
            );
            if (missing.length > 0) {
                const missingNames = missing
                    .map(
                        (m: any) =>
                            m.field.label || m.field.name || m.field.selector,
                    )
                    .join(", ");
                await this._transitionWaitingForUserMissingFields(
                    adapterInput.userId,
                    adapterInput.applicationId,
                    raw,
                    missingNames
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    raw.job.title,
                    raw.job.company?.name || "Company",
                ).catch(() => {});
                return {
                    success: false,
                    requiresBrowserFallback: false,
                    reason: `Missing candidate info: ${missingNames}`,
                };
            }

            await resumeUploadTool
                .upload(page, {
                    fileUrl: raw.resume.fileUrl,
                    originalName: raw.resume.originalName || "resume.pdf",
                })
                .catch((e: Error) =>
                    logger.debug("resume upload skipped", { error: e.message }),
                );

            await formTool.submit(page).catch(() => {});
            return { success: true, requiresBrowserFallback: false };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (
                /captcha|recaptcha|hcaptcha|human.*verification|verification.*required/i.test(
                    msg,
                )
            ) {
                await this._transitionCaptcha(
                    adapterInput.userId,
                    adapterInput.applicationId,
                    raw,
                    raw.job.title,
                    raw.job.company?.name || "Company",
                    msg,
                ).catch(() => {});
            }
            return {
                success: false,
                requiresBrowserFallback: false,
                reason: msg,
            };
        }
    }

    private async _transitionSubmitted(
        userId: string,
        applicationId: string,
        raw: any,
        jobTitle: string,
        companyName: string,
        confirmationId?: string,
    ): Promise<void> {
        await applicationService.updateApplication(applicationId, {
            status: "SUBMITTED",
            appliedAt: new Date(),
            failureReason: null,
            confirmationCode: confirmationId ?? null,
        });
        await auditService.create(userId, {
            action: "APPLICATION_SUBMITTED",
            description: `Application submitted for ${jobTitle} at ${companyName}`,
            applicationId,
            jobId: raw.jobId,
        });
        await notificationService.create(userId, {
            type: "APPLICATION_SUBMITTED",
            title: "Application submitted",
            message: `Your application for ${jobTitle} at ${companyName} was submitted.`,
            applicationId,
        });
    }

    private async _transitionFailed(
        userId: string,
        applicationId: string,
        raw: any,
        jobTitle: string,
        companyName: string,
        reason: string,
    ): Promise<void> {
        await applicationService.updateApplication(applicationId, {
            status: "FAILED",
            failureReason: reason,
        });
        await auditService.create(userId, {
            action: "APPLICATION_FAILED",
            description: `Application failed: ${reason}`,
            applicationId,
            jobId: raw.jobId,
        });
        await notificationService.create(userId, {
            type: "APPLICATION_FAILED",
            title: "Application failed",
            message: `Could not submit to ${companyName} for ${jobTitle}: ${reason}`,
            applicationId,
        });
    }

    private async _transitionWaitingForUserMissingFields(
        userId: string,
        applicationId: string,
        raw: any,
        missingCritical: string[],
        jobTitle: string,
        companyName: string,
    ): Promise<void> {
        const questions = missingCritical.map((label) => ({
            selector: `missing-field-${label
                .toLowerCase()
                .replace(/\s+/g, "-")}`,
            label,
            type: "text",
            required: true,
        }));
        await applicationService.updateApplication(applicationId, {
            status: "WAITING_FOR_USER",
            failureReason: `Missing candidate info: ${missingCritical.join(", ")}`,
        });
        await prisma.humanAction
            .create({
                data: {
                    applicationId,
                    userId,
                    questions,
                    agentRunId: raw.agentRunId ?? undefined,
                },
            })
            .catch((e) =>
                logger.warn("HumanAction create failed", { error: e.message }),
            );
        await auditService.create(userId, {
            action: "USER_ACTION_REQUIRED",
            description: `Missing information: ${missingCritical.join(", ")}`,
            applicationId,
            jobId: raw.jobId,
        });
        await notificationService.create(userId, {
            type: "HUMAN_ACTION_REQUIRED",
            title: `Action required: ${companyName}`,
            message: `Please provide the following missing details for your ${jobTitle} application: ${missingCritical.join(", ")}.`,
            applicationId,
        });
    }

    private async _transitionCaptcha(
        userId: string,
        applicationId: string,
        raw: any,
        jobTitle: string,
        companyName: string,
        captchaMsg: string,
        challengeType = "CAPTCHA",
    ): Promise<void> {
        let qType = "captcha";
        let qHint = "Please solve the security challenge on the application portal.";
        if (/2fa|otp|passcode/i.test(challengeType) || /2fa|otp|passcode|6-digit/i.test(captchaMsg)) {
            qType = "2fa";
            qHint = "Enter the 2FA / OTP verification code sent to your mobile or email.";
        } else if (/email/i.test(challengeType) || /email.*verif/i.test(captchaMsg)) {
            qType = "email_verification";
            qHint = "Check your email for the verification link or code, then confirm.";
        } else if (/auth|account|sign.?in/i.test(challengeType)) {
            qType = "security_challenge";
            qHint = "Complete employer portal login / authentication challenge.";
        }

        await applicationService.updateApplication(applicationId, {
            status: "WAITING_FOR_USER",
            failureReason: `${challengeType} or human verification required: ${captchaMsg}`,
        });

        await prisma.humanAction
            .create({
                data: {
                    applicationId,
                    userId,
                    questions: [{
                        selector: "security-challenge",
                        label: `${challengeType}: ${captchaMsg}`,
                        type: qType,
                        required: true,
                        hint: qHint,
                    }],
                    agentRunId: raw.agentRunId ?? undefined,
                },
            })
            .catch((e) =>
                logger.warn("HumanAction create failed", { error: e.message }),
            );

        await auditService.create(userId, {
            action: "USER_ACTION_REQUIRED",
            description: `${challengeType} detected: ${captchaMsg}`,
            applicationId,
            jobId: raw.jobId,
            metadata: { type: challengeType, message: captchaMsg },
        });

        await notificationService.create(userId, {
            type: "HUMAN_ACTION_REQUIRED",
            title: `${challengeType} encountered: ${companyName}`,
            message: `A human verification step was encountered while applying for ${jobTitle} at ${companyName}: ${captchaMsg}. Please assist.`,
            applicationId,
        });

        // Trigger real email alert to candidate
        try {
            const { default: emailService } = await import("../notification/email.service.js");
            const candidateEmail = raw.profile?.email || raw.user?.email;
            if (candidateEmail) {
                await emailService.sendHumanInterventionAlert({
                    to: candidateEmail,
                    candidateName: raw.profile?.firstName ? `${raw.profile.firstName} ${raw.profile.lastName || ""}` : "Candidate",
                    jobTitle,
                    companyName,
                    actionUrl: raw.job?.url || "http://localhost:3000",
                    reason: captchaMsg,
                    verificationType: challengeType,
                });
            }
        } catch {
            // Non-blocking email alert dispatch
        }
    }
}

export default new ApplicationSubmitService();
