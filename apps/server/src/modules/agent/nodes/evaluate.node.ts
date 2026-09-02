import evaluationService from "../evaluation/evaluation.service.js";

import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

class EvaluateNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        if (state.jobs.length === 0) {
            return {
                selectedJobs: [],
                evaluated: true,
                history: [
                    ...state.history,
                    "No jobs available for evaluation.",
                ],
            };
        }

        const candidateSkills: string[] = [];
        try {
            const candidateTool = (await import("../candidate/candidate.tool.js")).default;
            const context = await candidateTool.getContext(
                state.userId,
                state.resumeId || state.resume?.id,
            );
            if (Array.isArray(context.skills)) {
                candidateSkills.push(...context.skills);
            }
        } catch {
            // Ignore
        }

        const result =
            await evaluationService.evaluate(
                state.query,
                state.jobs,
                candidateSkills,
            );

        const scoreMap = new Map(
            result.evaluations.map(
                (evaluation) => [
                    evaluation.jobId,
                    evaluation.score,
                ],
            ),
        );

        const evaluatedJobs =
            state.jobs.map((job) => ({
                ...job,
                score:
                    scoreMap.get(job.id) ?? 0,
            }));

        const selectedJobs =
            evaluatedJobs.filter(
                (job) =>
                    result.selectedJobIds.includes(
                        job.id,
                    ),
            );

        return {
            jobs: evaluatedJobs,
            selectedJobs,
            evaluated: true,
            history: [
                ...state.history,
                `Evaluated ${state.jobs.length} jobs and selected ${selectedJobs.length}.`,
            ],
        };
    }
}

export default new EvaluateNode();