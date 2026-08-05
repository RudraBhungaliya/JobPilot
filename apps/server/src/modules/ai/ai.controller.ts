import type {
    Request,
    Response,
} from "express";

import aiService from "./ai.service.js";

import {
    coverLetterSchema,
    formAnalysisSchema,
    rankJobSchema,
    tailorResumeSchema,
} from "./ai.validators.js";

class AIController {

    async rank(
        req: Request,
        res: Response,
    ) {

        const body =
            rankJobSchema.parse(
                req.body,
            );

        const result =
            await aiService.rankJob(
                body,
            );

        return res.status(200).json({
            success: true,
            data: result,
        });
    }

    async tailor(
        req: Request,
        res: Response,
    ) {

        const body =
            tailorResumeSchema.parse(
                req.body,
            );

        const result =
            await aiService.tailorResume(
                body,
            );

        return res.status(200).json({
            success: true,
            data: result,
        });
    }

    async coverLetter(
        req: Request,
        res: Response,
    ) {

        const body =
            coverLetterSchema.parse(
                req.body,
            );

        const result =
            await aiService.generateCoverLetter(
                body,
            );

        return res.status(200).json({
            success: true,
            data: result,
        });
    }

    async form(
        req: Request,
        res: Response,
    ) {

        const html =
            req.body.html;

        const result =
            await aiService.analyzeForm(
                html,
            );

        return res.status(200).json({
            success: true,
            data: result,
        });
    }
}

export default new AIController();