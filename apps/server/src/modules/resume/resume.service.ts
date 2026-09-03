import resumeRepository from "./resume.repository.js";
import resumeExtractor from "./resume.extractor.js";
import resumeParser from "./resume.parser.js";

import type { UploadResumeDTO } from "./resume.validators.js";

class ResumeService {
    async createResume(
        userId: string,
        dto: UploadResumeDTO,
        fileUrl: string,
        originalName: string,
        filePath?: string,
    ) {
        let extractedText = "";
        const targetPath = filePath || fileUrl;

        if (targetPath) {
            try {
                extractedText =
                    await resumeExtractor.extract(
                        targetPath,
                        originalName,
                    );
            } catch (err) {
                console.error(`Resume text extraction warning for ${originalName}:`, err);
            }
        }

        return resumeRepository.create({
            title: dto.title,
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
        return resumeRepository.findByUserId(
            userId,
        );
    }

    async deleteResume(id: string) {
        return resumeRepository.delete(id);
    }
}

export default new ResumeService();