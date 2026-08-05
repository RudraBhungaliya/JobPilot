import embeddingService from "./embedding.service.js";

import type {
    JobRankingInput,
    JobRankingResult,
} from "./ai.types.js";

class RankingService {
    async rank(
        input: JobRankingInput,
    ): Promise<JobRankingResult> {

        const score =
            await embeddingService.similarity(
                input,
            );

        return {
            score,

            reason:
                "Ranking provider not integrated yet.",
        };
    }
}

export default new RankingService();