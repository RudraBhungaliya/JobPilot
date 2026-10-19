import embeddingService from "./embedding.service.js";

import type {
    JobRankingInput,
    JobRankingResult,
} from "./ai.types.js";

class RankingService {
    async rank(
        input: JobRankingInput,
    ): Promise<JobRankingResult> {
        const score = await embeddingService.similarity(input);

        let reason = "Candidate qualifications align with job requirements.";
        if (score >= 80) {
            reason = `Exceptional alignment (${score}%): Core skills and domain experience strongly match requisition requirements.`;
        } else if (score >= 65) {
            reason = `Strong match (${score}%): Candidate exhibits the majority of required competencies and technical background.`;
        } else if (score >= 45) {
            reason = `Moderate match (${score}%): Partial overlap with job qualifications; some transferable experience detected.`;
        } else {
            reason = `Low alignment (${score}%): Few required skills or qualifications identified in candidate background.`;
        }

        return {
            score,
            reason,
        };
    }
}

export default new RankingService();