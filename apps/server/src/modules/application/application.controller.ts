import type { Request, Response } from "express";

import applicationService from "./application.service.js";

import {
    createApplicationSchema,
    updateApplicationSchema,
} from "./application.validators.js";

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

    async delete(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        await applicationService.deleteApplication(id);

        return res.sendStatus(204);
    }
}

export default new ApplicationController();