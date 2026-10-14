import resumeRepository from "./resume.repository.js";
import resumeExtractor from "./resume.extractor.js";
import resumeParser from "./resume.parser.js";
import resumeParserService from "./resume-parser.service.js";

import type { UploadResumeDTO } from "./resume.validators.js";
import path from "node:path";

class ResumeService {
    async parseFile(filePath: string, originalName: string) {
        const extractedText = await resumeExtractor.extract(filePath, originalName);
        let aiParsed = null;
        try {
            aiParsed = await resumeParserService.parseText(extractedText);
        } catch {
            // Keep deterministic fallback if AI encounters issue
        }
        return {
            extractedText,
            parsed: resumeParser.parse(extractedText),
            aiParsed,
        };
    }

    async createResume(
        userId: string,
        dto: UploadResumeDTO,
        fileUrl: string,
        originalName: string,
        filePath?: string,
    ) {
        const targetPath = filePath || fileUrl;
        const extractedText = targetPath ? await resumeExtractor.extract(targetPath, originalName) : "";
        if (!extractedText.trim()) throw new Error("Resume parser returned no readable text.");

        return resumeRepository.create({
            title: dto.title || path.parse(originalName).name,
            user: {
                connect: {
                    id: userId,
                },
            },
            fileUrl,
            originalName,
            extractedText:
                extractedText || null,
            status: "READY",
        });
    }

    async getResume(id: string) {
        return resumeRepository.findById(id);
    }

    async getUserResumes(userId: string) {
        return resumeRepository.findByUserId(userId);
    }

    async deleteResume(id: string) {
        return resumeRepository.delete(id);
    }
}

export default new ResumeService();
