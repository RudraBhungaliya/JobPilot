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
        const body =
            createApplicationSchema.parse(req.body);

        const application =
            await applicationService.createApplication(
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
        const applications =
            await applicationService.getApplications(
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

        const application =
            await applicationService.getApplication(id);

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

        const body =
            updateApplicationSchema.parse(req.body);

        const application =
            await applicationService.updateApplication(
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

        await auditService.create(req.user.id, {
            action: "USER_ACTION_COMPLETED",
            description: `User action completed for application ${id}.`,
            applicationId: id,
            jobId: existing.jobId,
        });

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
        if (!existing || existing.userId !== req.user.id) {
            return res.status(404).json({
                message: "Application not found.",
            });
        }

        await applicationService.deleteApplication(id);

        return res.sendStatus(204);
    }
}

export default new ApplicationController();