import atsRepository from "./ats.repository.js";
import {
    extractKeywords,
    findMissingKeywords,
} from "./ats.utils.js";

import type { ATSResult } from "./ats.types.js";

const REQUIRED_KEYWORDS = [
    "react",
    "typescript",
    "node",
    "express",
    "postgresql",
    "docker",
    "aws",
    "git",
];

class ATSService {
    async analyzeResume(
        resumeId: string,
    ): Promise<ATSResult> {

        const resume =
            await atsRepository.getResume(resumeId);

        if (!resume) {
            throw new Error("Resume not found.");
        }

        const text =
            resume.extractedText ?? "";

        const strengths =
            extractKeywords(text);

        const missing =
            findMissingKeywords(
                text,
                REQUIRED_KEYWORDS,
            );

        const score =
            Math.max(
                0,
                100 - missing.length * 8,
            );

        return {
            score,
            strengths,
            missingKeywords: missing,
            weaknesses: [],
            suggestions: missing.map(
                keyword =>
                    `Include "${keyword}" in your resume.`,
            ),
        };
    }
}

export default new ATSService();