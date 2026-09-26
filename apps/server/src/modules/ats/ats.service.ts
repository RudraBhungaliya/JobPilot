import atsRepository from "./ats.repository.js";
import {
    extractKeywords,
    findMissingKeywords,
} from "./ats.utils.js";
import { prisma } from "@jobpilot/database";
import type { ATSResult } from "./ats.types.js";

const DEFAULT_REQUIRED_KEYWORDS = [
    "react",
    "typescript",
    "node",
    "express",
    "postgresql",
    "docker",
    "aws",
    "git",
];

export interface AnalyzeResumeOptions {
    jobId?: string;
    applicationId?: string;
    jobDescription?: string;
    requiredKeywords?: string[];
}

class ATSService {
    async analyzeResume(
        resumeId: string,
        options?: AnalyzeResumeOptions
    ): Promise<ATSResult & { scorecard?: any; matchedKeywords?: string[] }> {
        const resume = await atsRepository.getResume(resumeId);

        if (!resume) {
            throw new Error("Resume not found.");
        }

        const text = resume.extractedText ?? "";
        const strengths = extractKeywords(text);

        // Derive required keywords from JD or defaults
        let targetKeywords = options?.requiredKeywords || DEFAULT_REQUIRED_KEYWORDS;
        if (options?.jobDescription) {
            const jdKeywords = extractKeywords(options.jobDescription);
            if (jdKeywords.length > 0) {
                targetKeywords = jdKeywords;
            }
        } else if (options?.jobId) {
            const job = await prisma.job.findUnique({ where: { id: options.jobId } });
            if (job?.description) {
                const jdKeywords = extractKeywords(job.description);
                if (jdKeywords.length > 0) {
                    targetKeywords = jdKeywords;
                }
            }
        }

        const missing = findMissingKeywords(text, targetKeywords);
        const matched = targetKeywords.filter((k) => !missing.includes(k));

        const matchRatio = targetKeywords.length > 0 ? matched.length / targetKeywords.length : 0.8;
        const score = Math.min(100, Math.max(10, Math.round(matchRatio * 100)));

        const scorecard = {
            score,
            overallRecommendation: score >= 85 ? "Strong Yes" : score >= 70 ? "Yes" : score >= 50 ? "No" : "Definitely Not",
            matchedKeywords: matched,
            missingKeywords: missing,
            strengths: strengths.slice(0, 10),
            areasOfConcern: missing.slice(0, 5).map((m) => `Missing skill/keyword: ${m}`),
            notes: `Resume scored ${score}/100 match against target job description.`,
        };

        // If applicationId is provided, persist matchScore and scorecard
        if (options?.applicationId) {
            await prisma.application.update({
                where: { id: options.applicationId },
                data: {
                    matchScore: score,
                    scorecard: scorecard as any,
                },
            }).catch(() => {});
        }

        return {
            score,
            strengths,
            matchedKeywords: matched,
            missingKeywords: missing,
            weaknesses: missing.slice(0, 5).map((k) => `Lack of explicit "${k}" reference`),
            suggestions: missing.map(
                (keyword) => `Include "${keyword}" in your resume work history or skills section.`
            ),
            scorecard,
        };
    }
}

const atsService = new ATSService();
export default atsService;
export { atsService };