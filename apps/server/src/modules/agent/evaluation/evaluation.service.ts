import matchingService from "./matching.service.js";
import scoringService from "./scoring.service.js";

import type {
    AgentJob,
} from "../agent.types.js";

import type {
    EvaluationResult,
    JobEvaluation,
} from "./evaluation.types.js";

class EvaluationService {
    async evaluate(
        query: string,
        jobs: AgentJob[],
    ): Promise<EvaluationResult> {
        const queryTerms = query
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);

        const evaluations: JobEvaluation[] = [];
        const selectedJobIds: string[] = [];

        for (const job of jobs) {
            const matchesTerms =
                await matchingService.match(
                    query,
                    job.title,
                    job.company,
                );

            const score =
                await scoringService.score(
                    matchesTerms.length,
                    queryTerms.length,
                );

            const reason =
                score > 50
                    ? `Strong match with terms: ${matchesTerms.join(
                          ", ",
                      )}`
                    : "Weak match with query terms.";

            evaluations.push({
                jobId: job.id,
                score,
                matchesTerms,
                reason,
            });

            if (score > 50) {
                selectedJobIds.push(job.id);
            }
        }

        return {
            evaluations: evaluations,
            selectedJobIds,
        };
    }
}

export default new EvaluationService();
