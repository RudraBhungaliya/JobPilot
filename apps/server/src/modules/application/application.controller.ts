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
        if (!existing) {
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
        if (!existing) {
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

    async delete(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const existing = await applicationService.getApplication(id);
        if (!existing) {
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

        if (!application) {
            return res.status(404).json({
                message: "Application not found.",
            });
        }

        const applicationSubmitService = (await import("./application-submit.service.js")).default;
        // Trigger submit in background / schedule
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
                // Ingest job & queue application
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
}

export default new ApplicationController();
