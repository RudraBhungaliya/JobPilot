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

        if (!application || application.userId !== req.user.id) {
            return res.status(404).json({
                message: "Application not found.",
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

        const application = await applicationService.updateApplication(id, {
            status: "QUEUED",
        });

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

        return res.status(200).json({
            success: true,
            message: "Application resumed.",
            data: application,
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
            if (!existing || existing.userId !== req.user.id) {
                return res.status(404).json({
                    message: "Application not found.",
                });
            }

            const { applicationQueueService } = await import("../queue/application-queue.service.js");
            const updatedQueue = await applicationQueueService.resumeWaitingJob(
                id,
                req.body?.metadata,
            );

            return res.status(200).json({
                success: true,
                message: "Verification checkpoint resolved. Application resumed.",
                data: updatedQueue,
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
        const { keyword = "software engineer", location = "Bengaluru", limit = 5 } = req.body || {};
        const { sourceService } = await import("../sources/index.js");

        const jobs = await sourceService.search({ keyword, location });
        const selectedJobs = jobs.slice(0, Number(limit) || 5);

        const enqueued: any[] = [];
        for (const job of selectedJobs) {
            try {
                const app = await applicationService.createApplication(req.user.id, {
                    jobTitle: job.title,
                    companyName: job.company,
                    companyDomain: `${job.company.toLowerCase().replace(/\s+/g, "")}.com`,
                    jobUrl: job.url,
                    location: job.location || location,
                    workMode: "Remote",
                    atsProvider: "Greenhouse",
                    status: "QUEUED",
                });
                enqueued.push(app);
            } catch {
                // Ignore duplicate ingest
            }
        }

        return res.status(200).json({
            success: true,
            enqueuedCount: Math.max(enqueued.length, selectedJobs.length),
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

            if (!jobId) {
                return res.status(400).json({
                    success: false,
                    message: "jobId or array of jobs is required.",
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
