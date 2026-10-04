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

        // 4. Upsert candidate master profile with extracted data in Rupees
        try {
            await prisma.profile.upsert({
                where: { userId: req.user.id },
                create: {
                    userId: req.user.id,
                    firstName: parsedData.firstName || "",
                    lastName: parsedData.lastName || "",
                    email: parsedData.email || req.user.email,
                    phone: parsedData.phone || "",
                    currentTitle: parsedData.currentTitle || "",
                    currentCompany: parsedData.currentCompany || "",
                    yearsOfExperience: parsedData.yearsOfExperience || 0,
                    expectedSalary: parsedData.expectedSalaryLPA || 0,
                    currentSalary: parsedData.currentSalaryLPA || 0,
                    city: parsedData.city || "",
                    country: parsedData.country || "India",
                    github: parsedData.github || "",
                    linkedin: parsedData.linkedin || "",
                    portfolio: parsedData.portfolio || "",
                    website: parsedData.website || "",
                    leetcode: parsedData.leetcode || "",
                    summary: parsedData.summary || "",
                    workMode: "HYBRID",
                    employmentType: "FULL_TIME",
                },
                update: {
                    firstName: parsedData.firstName || undefined,
                    lastName: parsedData.lastName || undefined,
                    email: parsedData.email || req.user.email,
                    phone: parsedData.phone || undefined,
                    currentTitle: parsedData.currentTitle || undefined,
                    currentCompany: parsedData.currentCompany || undefined,
                    yearsOfExperience: parsedData.yearsOfExperience || undefined,
                    expectedSalary: parsedData.expectedSalaryLPA || undefined,
                    currentSalary: parsedData.currentSalaryLPA || undefined,
                    city: parsedData.city || undefined,
                    github: parsedData.github || undefined,
                    linkedin: parsedData.linkedin || undefined,
                    portfolio: parsedData.portfolio || undefined,
                    summary: parsedData.summary || undefined,
                },
            });

            // Update skills if parsed
            const profile = await prisma.profile.findUnique({ where: { userId: req.user.id } });
            if (profile && parsedData.skills && parsedData.skills.length > 0) {
                await prisma.profileSkill.deleteMany({ where: { profileId: profile.id } });
                await prisma.profileSkill.createMany({
                    data: parsedData.skills.map((s) => ({
                        profileId: profile.id,
                        name: s.name,
                        category: s.category || "TECHNICAL",
                        level: s.level || "INTERMEDIATE",
                    })),
                });
            }
        } catch (profileErr) {
            console.warn("[ResumeController] Auto profile upsert notice:", profileErr);
        }

        return res.status(201).json({
            success: true,
            data: {
                resume,
                extracted: parsedData,
            },
        });
    }

    async parseTextDirect(req: Request, res: Response) {
        const { text } = req.body;
        if (!text || typeof text !== "string") {
            return res.status(400).json({
                success: false,
                message: "Valid text is required for parsing",
            });
        }

        const parsedData = await resumeParserService.parseText(text);

        // Optional auto profile sync if user logged in
        if (req.user?.id) {
            try {
                await prisma.profile.upsert({
                    where: { userId: req.user.id },
                    create: {
                        userId: req.user.id,
                        firstName: parsedData.firstName || "",
                        lastName: parsedData.lastName || "",
                        email: parsedData.email || req.user.email,
                        phone: parsedData.phone || "",
                        currentTitle: parsedData.currentTitle || "",
                        yearsOfExperience: parsedData.yearsOfExperience || 0,
                        expectedSalary: parsedData.expectedSalaryLPA || 0,
                        currentSalary: parsedData.currentSalaryLPA || 0,
                        city: parsedData.city || "",
                        country: "India",
                        github: parsedData.github || "",
                        linkedin: parsedData.linkedin || "",
                        summary: parsedData.summary || "",
                    },
                    update: {
                        firstName: parsedData.firstName || undefined,
                        lastName: parsedData.lastName || undefined,
                        phone: parsedData.phone || undefined,
                        currentTitle: parsedData.currentTitle || undefined,
                        yearsOfExperience: parsedData.yearsOfExperience || undefined,
                        expectedSalary: parsedData.expectedSalaryLPA || undefined,
                        city: parsedData.city || undefined,
                        summary: parsedData.summary || undefined,
                    },
                });
            } catch (err) {
                // Ignore profile sync errors on text parse
            }
        }

        return res.status(200).json({
            success: true,
            data: parsedData,
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
