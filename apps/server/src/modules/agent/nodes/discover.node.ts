import discoveryService from "../discovery.service.js";

import type {
    AgentStateType,
    AgentStateUpdate,
} from "../state.js";

class DiscoverNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        const jobs = await discoveryService.discover(
            state.query,
        );

        return {
            jobs,
            selectedJobs: [],
            history: [
                ...state.history,
                `Discovered ${jobs.length} jobs for: ${state.query}`,
            ],
        };
    }
}

export default new DiscoverNode();