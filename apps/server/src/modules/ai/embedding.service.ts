import type {
    JobRankingInput,
} from "./ai.types.js";

class EmbeddingService {
    async similarity(
        input: JobRankingInput,
    ) {
        /*
            Gemini/OpenAI
            embeddings later
        */

        return 0;
    }
}

export default new EmbeddingService();