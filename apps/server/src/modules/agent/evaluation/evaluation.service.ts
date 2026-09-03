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
        candidateSkills: string[] = [],
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

            let score =
                await scoringService.score(
                    matchesTerms.length,
                    queryTerms.length,
                );

            // Boost score if job matches candidate's extracted resume skills
            const jobText = `${job.title} ${job.company} ${job.description || ""} ${job.location || ""}`.toLowerCase();
            const matchedSkills = candidateSkills.filter((s) => {
                if (!s || s.length < 2) return false;
                const lowerSkill = s.toLowerCase();
                // Check word boundary or substring match
                return jobText.includes(lowerSkill);
            });

            if (matchedSkills.length > 0) {
                score = Math.min(100, score + matchedSkills.length * 15);
            }

            const reason =
                score >= 35
                    ? `Strong match with terms: ${matchesTerms.join(", ")}${
                          matchedSkills.length
                              ? ` (Matched resume skills: ${matchedSkills.slice(0, 5).join(", ")})`
                              : ""
                      }`
                    : "Weak match with query terms.";

            evaluations.push({
                jobId: job.id,
                score,
                matchesTerms,
                reason,
            });

            if (score >= 35) {
                selectedJobIds.push(job.id);
            }
        }

        // If no job scored >= 35, select top job to ensure auto-apply pipeline proceeds
        if (selectedJobIds.length === 0 && jobs.length > 0) {
            const highest = [...evaluations].sort((a, b) => b.score - a.score)[0];
            if (highest) {
                selectedJobIds.push(highest.jobId);
            }
        }

        return {
            evaluations: evaluations,
            selectedJobIds,
        };
    }
}

export default new EvaluationService();
