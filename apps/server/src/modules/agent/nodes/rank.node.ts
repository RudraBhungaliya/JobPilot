import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

class RankNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        if (state.jobs.length === 0) {
            return {
                selectedJobs: [],
                history: [
                    ...state.history,
                    "No jobs available for ranking.",
                ],
            };
        }

        if (!state.evaluated) {
            return {
                history: [
                    ...state.history,
                    "Ranking skipped because jobs have not been evaluated.",
                ],
            };
        }

        const rankedJobs = [
            ...state.jobs,
        ].sort(
            (a, b) =>
                (b.score ?? 0) -
                (a.score ?? 0),
        );

        return {
            jobs: rankedJobs,
            selectedJobs:
                rankedJobs.filter(
                    (job) =>
                        (job.score ?? 0) > 50,
                ),
            history: [
                ...state.history,
                `Ranked ${rankedJobs.length} evaluated jobs.`,
            ],
        };
    }
}

export default new RankNode();