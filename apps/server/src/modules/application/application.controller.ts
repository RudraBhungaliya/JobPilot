import type { Request, Response } from "express";

import applicationService from "./application.service.js";
import {
    createApplicationSchema,
    updateApplicationSchema,
} from "./application.validators.js";
import auditService from "../audit/audit.service.js";

class ApplicationController {
    async create(
        req: Request,
        res: Response,
    ) {
        const body = createApplicationSchema.parse(req.body);

        const application = await applicationService.createApplication(
            req.user.id,
            body,
        );

        return res.status(201).json({
            success: true,
            data: application,
        });
    }

    async getAll(
        req: Request,
        res: Response,
    ) {
        const applications = await applicationService.getApplications(
            req.user.id,
        );

        return res.status(200).json({
            success: true,
            data: applications,
        });
    }

    async getOne(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const application = await applicationService.getApplication(id);

        if (!application) {
            return res.status(404).json({
                message: "Application not found.",
            });
        }

        const token = (req.query?.token as string) || (req.headers["x-checkpoint-token"] as string);
        let authorized = req.user?.id && application.userId === req.user.id;

        if (!authorized && token) {
            try {
                const { verifyCheckpointToken } = await import("../auth/auth.tokens.js");
                const verified = verifyCheckpointToken(token);
                if (verified.applicationId === id && verified.userId === application.userId) {
                    authorized = true;
                }
            } catch {
                // Token invalid
            }
        }

        if (!authorized) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Valid session or valid scoped checkpoint token required.",
            });
        }

        return res.status(200).json({
            success: true,
            data: application,
        });
    }

    async update(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const existing = await applicationService.getApplication(id);
        if (!existing || existing.userId !== req.user.id) {
            return res.status(404).json({
                message: "Application not found.",
            });
        }

        const body = updateApplicationSchema.parse(req.body);

        const application = await applicationService.updateApplication(
            id,
            body,
        );

        return res.status(200).json({
            success: true,
            data: application,
        });
    }

    async resume(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const existing = await applicationService.getApplication(id);
        if (!existing || existing.userId !== req.user.id) {
            return res.status(404).json({
                message: "Application not found.",
            });
        }

        const answers = req.body?.answers || req.body?.metadata || {};
        let resolvedAction = null;

        // 1. Resolve pending HumanAction if present
        try {
            const { default: humanActionService } = await import("../human-action/human-action.service.js");
            const pending = await humanActionService.getPendingActions(req.user.id, id);
            if (pending.length > 0) {
                const latest = pending[0]!;
                resolvedAction = await humanActionService.resolveAction(req.user.id, latest.id, answers);
            }
        } catch (err: any) {
            // If human action resolution fails with error, report it
            if (err.message && !err.message.includes("not found")) {
                return res.status(400).json({
                    success: false,
                    message: err.message,
                });
            }
        }

        // 2. Transition state machine WAITING_FOR_USER -> RESUMED
        try {
            const { default: ApplicationStateMachine } = await import("./application-state-machine.js");
            await ApplicationStateMachine.transition({
                applicationId: id,
                newStatus: "RESUMED",
                reason: "Application resumed by candidate.",
                metadata: { answers },
                actor: "USER",
            });
        } catch (stateErr) {
            await applicationService.updateApplication(id, {
                status: "RESUMED",
            }).catch(() => {
                return applicationService.updateApplication(id, { status: "QUEUED" });
            });
        }

        // 3. Resume ApplicationQueue job
        try {
            const { applicationQueueService } = await import("../queue/application-queue.service.js");
            await applicationQueueService.resumeWaitingJob(id, answers);
        } catch {
            // Queue record may not exist
        }

        try {
            await auditService.create(req.user.id, {
                action: "USER_ACTION_COMPLETED",
                description: `User action completed for application ${id}.`,
                applicationId: id,
                jobId: existing.jobId,
            });
        } catch {
            // Ignore audit log failure
        }

        const updated = await applicationService.getApplication(id);

        return res.status(200).json({
            success: true,
            message: "Application resumed.",
            data: updated || existing,
            resolvedAction,
        });
    }

    async autoApply(
        req: Request,
        res: Response,
    ) {
        try {
            const { autoApplyService } = await import("./auto-apply.service.js");
            const result = await autoApplyService.initiateAutoApply(
                req.user.id,
                req.body,
            );

            return res.status(202).json({
                success: true,
                message: "Application queued successfully for real-time auto-apply execution.",
                data: result,
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message || "Failed to initiate auto-apply.",
            });
        }
    }

    async resolveCheckpoint(
        req: Request,
        res: Response,
    ) {
        try {
            const id = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;

            const existing = await applicationService.getApplication(id);
            if (!existing) {
                return res.status(404).json({
                    message: "Application not found.",
                });
            }

            const token = (req.query?.token as string) || (req.headers["x-checkpoint-token"] as string) || req.body?.token;
            let authorized = req.user?.id && existing.userId === req.user.id;

            if (!authorized && token) {
                try {
                    const { verifyCheckpointToken } = await import("../auth/auth.tokens.js");
                    const verified = verifyCheckpointToken(token);
                    if (verified.applicationId === id && verified.userId === existing.userId) {
                        authorized = true;
                    }
                } catch {
                    // Token invalid
                }
            }

            if (!authorized) {
                return res.status(403).json({
                    success: false,
                    message: "Unauthorized: Valid session or scoped checkpoint token required to resolve this checkpoint.",
                });
            }

            // Token Replay & Idempotency Guard:
            // If application is already SUBMITTED or APPLIED, reject replay attempts with 409 Conflict
            if (existing.status === "SUBMITTED" || existing.status === "APPLIED") {
                return res.status(409).json({
                    success: false,
                    message: "Checkpoint replay rejected: Application has already been submitted to the employer.",
                    status: existing.status,
                    confirmationCode: existing.confirmationCode,
                });
            }

            const targetUserId = existing.userId;

            // Check if there are any active pending human actions to resolve
            const { default: humanActionService } = await import("../human-action/human-action.service.js");
            const pendingActions = await humanActionService.getPendingActions(targetUserId, id);

            if (pendingActions.length === 0 && existing.status !== "WAITING_FOR_USER" && existing.status !== "REVIEW_REQUIRED") {
                return res.status(409).json({
                    success: false,
                    message: "Checkpoint replay rejected: This checkpoint action has already been resolved.",
                    status: existing.status,
                });
            }

            const answers = req.body?.answers || req.body?.metadata || { checkpoint: "RESOLVED" };

            // 1. Resolve pending human action if present
            try {
                const { default: humanActionService } = await import("../human-action/human-action.service.js");
                const pending = await humanActionService.getPendingActions(targetUserId, id);
                if (pending.length > 0) {
                    const latest = pending[0]!;
                    await humanActionService.resolveAction(targetUserId, latest.id, answers);
                }
            } catch {
                // Ignore if no action
            }

            // 2. State transition to RESUMED
            try {
                const { default: ApplicationStateMachine } = await import("./application-state-machine.js");
                await ApplicationStateMachine.transition({
                    applicationId: id,
                    newStatus: "RESUMED",
                    reason: "Verification checkpoint resolved by user.",
                    metadata: answers,
                    actor: "USER",
                });
            } catch {
                // Fallback
            }

            // 2.5 Auto-sync user responses (Education, Experience, Contact info) to candidate profile in PostgreSQL
            try {
                const { prisma } = await import("@jobpilot/database");
                const profile = await prisma.profile.findUnique({
                    where: { userId: targetUserId },
                    include: { educations: true, experiences: true },
                });
                if (profile) {
                    const profileUpdates: any = {};

                    // Education History
                    const eduVal =
                        answers["missing-field-education-history"] ||
                        answers["Education History"] ||
                        answers["education"] ||
                        answers["highestDegree"];
                    if (eduVal && typeof eduVal === "string" && eduVal.trim()) {
                        let inst = eduVal.trim();
                        let deg = "Undergraduate Degree";
                        let field = "Computer Science & Engineering";
                        if (inst.includes(".")) {
                            const parts = inst.split(".");
                            inst = parts[0]?.trim() || inst;
                            deg = parts.slice(1).join(".").trim() || deg;
                        } else if (inst.includes(",")) {
                            const parts = inst.split(",");
                            inst = parts[0]?.trim() || inst;
                            deg = parts.slice(1).join(",").trim() || deg;
                        }
                        if (profile.educations.length === 0) {
                            await prisma.profileEducation.create({
                                data: {
                                    profileId: profile.id,
                                    institution: inst,
                                    degree: deg,
                                    fieldOfStudy: field,
                                    currentlyStudying: true,
                                },
                            });
                        } else {
                            await prisma.profileEducation.update({
                                where: { id: profile.educations[0]!.id },
                                data: { institution: inst, degree: deg },
                            });
                        }
                    }

                    // Work Experience
                    const expVal =
                        answers["missing-field-work-experience"] ||
                        answers["Work Experience"] ||
                        answers["experience"];
                    if (expVal && typeof expVal === "string" && expVal.trim()) {
                        let comp = expVal.trim();
                        let title = profile.currentTitle || "Software Engineer";
                        if (comp.includes("@")) {
                            const parts = comp.split("@");
                            title = parts[0]?.trim() || title;
                            comp = parts[1]?.trim() || comp;
                        } else if (comp.includes(" at ")) {
                            const parts = comp.split(" at ");
                            title = parts[0]?.trim() || title;
                            comp = parts[1]?.trim() || comp;
                        }
                        if (profile.experiences.length === 0) {
                            await prisma.profileExperience.create({
                                data: {
                                    profileId: profile.id,
                                    company: comp,
                                    title: title,
                                    description: expVal.trim(),
                                    currentlyWorking: true,
                                },
                            });
                        } else {
                            await prisma.profileExperience.update({
                                where: { id: profile.experiences[0]!.id },
                                data: { company: comp, title: title, description: expVal.trim() },
                            });
                        }
                        profileUpdates.currentCompany = comp;
                        profileUpdates.currentTitle = title;
                    }

                    if (answers["Phone Number"] || answers["phone"]) {
                        profileUpdates.phone = answers["Phone Number"] || answers["phone"];
                    }
                    if (answers["First Name"] || answers["firstName"]) {
                        profileUpdates.firstName = answers["First Name"] || answers["firstName"];
                    }
                    if (answers["Last Name"] || answers["lastName"]) {
                        profileUpdates.lastName = answers["Last Name"] || answers["lastName"];
                    }
                    if (answers["Email Address"] || answers["email"]) {
                        profileUpdates.email = answers["Email Address"] || answers["email"];
                    }

                    if (Object.keys(profileUpdates).length > 0) {
                        await prisma.profile.update({
                            where: { id: profile.id },
                            data: profileUpdates,
                        });
                    }
                }
            } catch (syncErr) {
                console.warn("[ApplicationController] Failed to auto-sync checkpoint answers to candidate profile:", syncErr);
            }

            const { applicationQueueService } = await import("../queue/application-queue.service.js");
            const updatedQueue = await applicationQueueService.resumeWaitingJob(
                id,
                answers,
            );

            // DIRECTLY SUBMIT THE FORM AFTER FINAL AGREEMENT
            try {
                const { default: applicationSubmitService } = await import("./application-submit.service.js");
                await applicationSubmitService.submitApplication(targetUserId, id);
            } catch (submitErr: any) {
                console.warn("[ApplicationController] Direct submitApplication run:", submitErr.message);
            }

            const updatedApp = await applicationService.getApplication(id);
            const currentStatus = updatedApp?.status || "RESUMED";

            return res.status(200).json({
                success: true,
                message: currentStatus === "SUBMITTED"
                    ? "Verification checkpoint resolved. Application submitted and verified by employer."
                    : `Verification checkpoint resolved. Application status: ${currentStatus}.`,
                data: updatedApp || updatedQueue,
                status: currentStatus,
                confirmationCode: updatedApp?.confirmationCode,
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message || "Failed to resolve checkpoint.",
            });
        }
    }

    async delete(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const existing = await applicationService.getApplication(id);
        if (!existing || existing.userId !== req.user.id) {
            return res.status(404).json({
                message: "Application not found.",
            });
        }

        await applicationService.deleteApplication(id);

        return res.sendStatus(204);
    }

    async submit(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const application = await applicationService.getApplication(id);

        if (!application || application.userId !== req.user.id) {
            return res.status(404).json({
                message: "Application not found.",
            });
        }

        const applicationSubmitService = (await import("./application-submit.service.js")).default;
        applicationSubmitService.submitApplication(req.user.id, id).catch(() => {});

        return res.status(202).json({
            success: true,
            message: "Application submission initiated",
            applicationId: id,
        });
    }

    async discoverAndApply(
        req: Request,
        res: Response,
    ) {
        const { keyword, location, limit = 5 } = req.body || {};
        if (typeof keyword !== "string" || !keyword.trim()) {
            return res.status(400).json({ success: false, message: "A search keyword is required." });
        }
        if (location !== undefined && typeof location !== "string") {
            return res.status(400).json({ success: false, message: "Location must be text when provided." });
        }
        const requestedLimit = Number(limit);
        if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 25) {
            return res.status(400).json({ success: false, message: "Limit must be an integer between 1 and 25." });
        }
        const { sourceService } = await import("../sources/index.js");

        const jobs = await sourceService.search({ keyword: keyword.trim(), location: location?.trim() || undefined });
        const selectedJobs = jobs.slice(0, requestedLimit);

        const enqueued: any[] = [];
        const failures: Array<{ url?: string; reason: string }> = [];
        for (const job of selectedJobs) {
            try {
                const parsedUrl = new URL(job.url);
                if (parsedUrl.protocol !== "https:" || !job.title?.trim() || !job.company?.trim()) {
                    throw new Error("Source job is missing a verified HTTPS URL, title, or company.");
                }
                const { prisma } = await import("@jobpilot/database");
                const savedJob = await prisma.$transaction(async (tx) => {
                    const company = await tx.company.upsert({
                        where: { userId_name: { userId: req.user.id, name: job.company } },
                        update: {},
                        create: { userId: req.user.id, name: job.company, domain: parsedUrl.hostname, website: `${parsedUrl.protocol}//${parsedUrl.host}` },
                    });
                    const existing = await tx.job.findFirst({ where: { userId: req.user.id, url: job.url } });
                    if (existing) return existing;
                    return tx.job.create({
                        data: {
                            userId: req.user.id,
                            companyId: company.id,
                            title: job.title,
                            location: job.location || "",
                            url: job.url,
                            description: job.description || null,
                            atsProvider: job.source,
                        },
                    });
                });
                const app = await applicationService.createApplication(req.user.id, {
                    jobId: savedJob.id,
                    status: "QUEUED",
                });
                const { default: applicationQueueService } = await import("../queue/application-queue.service.js");
                const queueRecord = await applicationQueueService.enqueue({ applicationId: app.id, userId: req.user.id });
                if (!queueRecord) throw new Error("Persistent application queue is unavailable.");
                const { default: queueWorker } = await import("../queue/queue.worker.js");
                void queueWorker.processBatch();
                enqueued.push({ applicationId: app.id, jobId: savedJob.id, title: job.title, company: job.company, queueJobId: queueRecord.id });
            } catch (error) {
                failures.push({ url: job.url, reason: error instanceof Error ? error.message : String(error) });
            }
        }

        return res.status(enqueued.length > 0 ? 202 : 422).json({
            success: enqueued.length > 0,
            enqueuedCount: enqueued.length,
            discoveredCount: selectedJobs.length,
            failures,
            data: enqueued,
        });
    }

    async syncJobs(req: Request, res: Response) {
        try {
            const { pipelineSyncService } = await import("./pipeline-sync.service.js");
            const { jobId, loopId, resumeId, autoApply, priority, jobs } = req.body || {};

            if (Array.isArray(jobs) && jobs.length > 0) {
                const results = [];
                for (const item of jobs) {
                    const result = await pipelineSyncService.syncJobToApplication({
                        userId: req.user.id,
                        jobId: item.jobId,
                        loopId: item.loopId || loopId,
                        resumeId: item.resumeId || resumeId,
                        autoApply: item.autoApply ?? autoApply,
                        priority: item.priority ?? priority,
                    });
                    results.push(result);
                }
                return res.status(200).json({
                    success: true,
                    count: results.length,
                    data: results,
                });
            }

            if (loopId && !jobId && (!jobs || !Array.isArray(jobs) || jobs.length === 0)) {
                const result = await pipelineSyncService.syncLoop(loopId, req.user.id, {
                    forceQueue: autoApply === true,
                });
                return res.status(200).json({
                    success: true,
                    data: result,
                });
            }

            if (!jobId) {
                return res.status(400).json({
                    success: false,
                    message: "jobId, loopId, or array of jobs is required.",
                });
            }

            const result = await pipelineSyncService.syncJobToApplication({
                userId: req.user.id,
                jobId,
                loopId,
                resumeId,
                autoApply: autoApply ?? false,
                priority: priority ?? 0,
            });

            return res.status(200).json({
                success: true,
                data: result,
            });
        } catch (err: any) {
            return res.status(400).json({
                success: false,
                message: err.message || "Failed to sync jobs into application pipeline.",
            });
        }
    }

    async getPipelineStats(req: Request, res: Response) {
        try {
            const { pipelineSyncService } = await import("./pipeline-sync.service.js");
            const loopId = req.query.loopId as string | undefined;
            const stats = await pipelineSyncService.getPipelineStats(req.user.id, loopId);
            return res.status(200).json({
                success: true,
                data: stats,
            });
        } catch (err: any) {
            return res.status(400).json({
                success: false,
                message: err.message || "Failed to get pipeline stats.",
            });
        }
    }
}

export default new ApplicationController();
