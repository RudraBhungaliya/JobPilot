import { prisma } from "@jobpilot/database";

import { Agent } from "../agent/agent.constants.js";
import browserTool from "../agent/tools/browser.tool.js";
import formTool from "../agent/tools/form.tool.js";
import resumeUploadTool from "../agent/tools/resume-upload.tool.js";
import submissionVerificationTool from "../agent/tools/submission-verification.tool.js";
import auditService from "../audit/audit.service.js";
import notificationService from "../notification/notification.service.js";
import applicationService from "./application.service.js";
import { AppError } from "../../core/errors/AppError.js";

class ApplicationSubmitService {
    async submitApplication(userId: string, applicationId: string): Promise<void> {
        const raw = await prisma.application.findFirst({
            where: { id: applicationId, userId },
            include: {
                job: { include: { company: true } },
                resume: true,
            },
        });

        if (!raw?.job?.url) {
            throw new AppError("Application or job URL not found.", 404);
        }

        if (!raw.resume) {
            throw new AppError("Resume is required before submitting.", 400);
        }

        const jobUrl = raw.job.url;
        const jobTitle = raw.job.title;
        const companyName = raw.job.company?.name || "Company";

        await applicationService.updateApplication(applicationId, {
            status: "RUNNING",
            attempts: (raw.attempts ?? 0) + 1,
        });

        await auditService.create(userId, {
            action: "APPLICATION_STARTED",
            description: `Automated submission started for ${jobTitle} at ${companyName}`,
            applicationId,
            jobId: raw.jobId,
        });

        const browser = await browserTool.launch();
        let finalStatus: "SUBMITTED" | "FAILED" | "WAITING_FOR_USER" = "FAILED";
        let failureReason: string | undefined;
        let confirmationCode: string | undefined;

        try {
            for (let attempt = 1; attempt <= Agent.MAX_APPLY_ATTEMPTS; attempt++) {
                const page = await browser.newPage();

                try {
                    await page.goto(jobUrl, {
                        waitUntil: "domcontentloaded",
                        timeout: Agent.PAGE_TIMEOUT_MS,
                    });

                    const humanVerification = await formTool.detectHumanVerification(page);
                    if (humanVerification.detected) {
                        finalStatus = "WAITING_FOR_USER";
                        failureReason = `Human verification required: ${humanVerification.message}`;
                        await page.close();
                        break;
                    }

                    const fields = await formTool.detectFields(page);
                    if (fields.length === 0) {
                        throw new Error("No application form fields detected on the career page.");
                    }

                    const fillResults = await formTool.fillFields(
                        page,
                        fields,
                        userId,
                        raw.resumeId,
                    );

                    const outsiderMissing = formTool.detectOutsiderRequiredFields(fields, fillResults);
                    if (outsiderMissing.length > 0) {
                        const missingNames = outsiderMissing
                            .map((item) => item.field.label || item.field.name || item.field.selector)
                            .join(", ");
                        finalStatus = "WAITING_FOR_USER";
                        failureReason = `Required candidate information not available: ${missingNames}`;
                        await page.close();
                        break;
                    }

                    await resumeUploadTool.upload(page, {
                        fileUrl: raw.resume.fileUrl,
                        originalName: raw.resume.originalName || "resume.pdf",
                    });

                    await formTool.submit(page);

                    const verification = await submissionVerificationTool.verify(page);
                    if (verification.verified) {
                        finalStatus = "SUBMITTED";
                        confirmationCode = verification.confirmationUrl
                            ? `REF-${Buffer.from(verification.confirmationUrl).toString("base64url").slice(0, 12)}`
                            : undefined;
                        await page.close();
                        break;
                    }

                    failureReason = verification.reason || "Submission could not be verified.";
                    if (attempt >= Agent.MAX_APPLY_ATTEMPTS) {
                        finalStatus = "FAILED";
                    }
                } catch (error) {
                    failureReason =
                        error instanceof Error ? error.message : "Application execution failed.";
                    if (attempt >= Agent.MAX_APPLY_ATTEMPTS) {
                        finalStatus = "FAILED";
                    }
                } finally {
                    try {
                        await page.close();
                    } catch {
                        // ignore
                    }
                }
            }
        } finally {
            await browserTool.close();
        }

        if (finalStatus === "SUBMITTED") {
            await applicationService.updateApplication(applicationId, {
                status: "SUBMITTED",
                appliedAt: new Date(),
                failureReason: null,
                confirmationCode: confirmationCode ?? null,
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

            return;
        }

        if (finalStatus === "WAITING_FOR_USER") {
            await applicationService.updateApplication(applicationId, {
                status: "WAITING_FOR_USER",
                failureReason: failureReason ?? null,
            });

            await auditService.create(userId, {
                action: "USER_ACTION_REQUIRED",
                description: failureReason || "User action required before submission.",
                applicationId,
                jobId: raw.jobId,
            });

            await notificationService.create(userId, {
                type: "APPLICATION_STATUS",
                title: `Action required: ${companyName}`,
                message: failureReason || "Complete verification or missing fields to continue.",
                applicationId,
            });

            return;
        }

        await applicationService.updateApplication(applicationId, {
            status: "FAILED",
            failureReason: failureReason ?? "Submission failed after retries.",
        });

        await auditService.create(userId, {
            action: "APPLICATION_FAILED",
            description: failureReason || "Submission failed.",
            applicationId,
            jobId: raw.jobId,
        });

        await notificationService.create(userId, {
            type: "APPLICATION_FAILED",
            title: "Application failed",
            message: failureReason || `Could not submit to ${companyName}.`,
            applicationId,
        });
    }
}

export default new ApplicationSubmitService();
