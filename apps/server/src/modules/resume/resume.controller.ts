import type { Request, Response } from "express";
import fs from "node:fs/promises";
import { prisma } from "@jobpilot/database";
import resumeService from "./resume.service.js";
import resumeParserService from "./resume-parser.service.js";
import { uploadResumeSchema } from "./resume.validators.js";

function getParamId(req: Request): string | null {
    const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

    return id ?? null;
}

class ResumeController {
    async preview(req: Request, res: Response) {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: "Resume file is required" });
        }

        try {
            const result = await resumeService.parseFile(file.path, file.originalname);
            return res.status(200).json({ success: true, data: result });
        } catch (err: any) {
            return res.status(500).json({ success: false, message: err.message || "Failed to parse resume file." });
        } finally {
            await fs.unlink(file.path).catch(() => undefined);
        }
    }

    async create(req: Request, res: Response) {
        const body = uploadResumeSchema.parse(req.body);
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "Resume file is required",
            });
        }

        // 1. Extract text from uploaded resume
        const extractedText = await resumeParserService.extractTextFromFile(file.path);
        const parsedData = await resumeParserService.parseText(extractedText);

        // 2. Create resume in DB
        const resume = await resumeService.createResume(
            req.user.id,
            body,
            file.path,
            file.originalname,
            file.path
        );

        // 3. Update resume extracted text & status
        await prisma.resume.update({
            where: { id: resume.id },
            data: {
                extractedText: extractedText.slice(0, 10000),
                status: "READY",
            },
        });

        return res.status(201).json({
            success: true,
            data: {
                resume,
                extracted: parsedData,
            },
        });
    }

    async parseTextDirect(req: Request, res: Response) {
        try {
            const { text } = req.body;
            if (!text || typeof text !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Valid text is required for parsing",
                });
            }

            const parsedData = await resumeParserService.parseText(text);

            return res.status(200).json({
                success: true,
                data: parsedData,
            });
        } catch (err: any) {
            return res.status(500).json({
                success: false,
                message: err.message || "Failed to parse resume text.",
            });
        }
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
