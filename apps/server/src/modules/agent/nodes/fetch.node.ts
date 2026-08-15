import type { AgentStateType, AgentStateUpdate } from "../state.js";

class FetchNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {

        /*
            Crawl jobs
            later.
        */

        if (state.jobs.length === 0) {
            return {
                history: [
                    ...state.history,
                    "No jobs found to fetch.",
                ],
            };
        }

        return {
            jobs: state.jobs,
            history: [
                ...state.history,
                `Fetched ${state.jobs.length} discovered jobs.`,
            ],
        };
    }
}

export default new FetchNode();