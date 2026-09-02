import type { Request, Response } from "express";

import resumeService from "./resume.service.js";
import { uploadResumeSchema } from "./resume.validators.js";

function getParamId(req: Request): string | null {
    const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

    return id ?? null;
}

class ResumeController {
    async create(req: Request, res: Response) {
        const body = uploadResumeSchema.parse(req.body);

        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "Resume file is required",
            });
        }

        const resume = await resumeService.createResume(
            req.user.id,
            body,
            file.path,
            file.originalname
        );

        return res.status(201).json({
            success: true,
            data: resume,
        });
    }

    async getAll(req: Request, res: Response) {
        const resumes = await resumeService.getUserResumes(
            req.user.id
        );

        return res.status(200).json({
            success: true,
            data: resumes,
        });
    }

    async getById(req: Request, res: Response) {
        const id = getParamId(req);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Resume id is required",
            });
        }

        const resume = await resumeService.getResume(id);

        if (!resume || resume.userId !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: "Resume not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: resume,
        });
    }

    async delete(req: Request, res: Response) {
        const id = getParamId(req);

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Resume id is required",
            });
        }

        const resume = await resumeService.getResume(id);

        if (!resume || resume.userId !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: "Resume not found",
            });
        }

        await resumeService.deleteResume(id);

        return res.sendStatus(204);
    }
}

export default new ResumeController();