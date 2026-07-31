import type { Request, Response } from "express";

import jobService from "./job.service.js";
import {
    createJobSchema,
    updateJobSchema,
} from "./job.validators.js";

class JobController {
    async create(
        req: Request,
        res: Response,
    ) {
        const data = createJobSchema.parse(req.body);

        const job = await jobService.createJob(
            req.user.id,
            data,
        );

        return res.status(201).json({
            success: true,
            data: job,
        });
    }

    async getAll(
        req: Request,
        res: Response,
    ) {
        const jobs = await jobService.getJobs(req.user.id);

        return res.status(200).json({
            success: true,
            data: jobs,
        });
    }

    async getOne(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const job = await jobService.getJob(id);

        return res.status(200).json({
            success: true,
            data: job,
        });
    }

    async update(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const body = updateJobSchema.parse(req.body);

        const job = await jobService.updateJob(
            id,
            body,
        );

        return res.status(200).json({
            success: true,
            data: job,
        });
    }

    async delete(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        await jobService.deleteJob(id);

        return res.sendStatus(204);
    }
}

export default new JobController();