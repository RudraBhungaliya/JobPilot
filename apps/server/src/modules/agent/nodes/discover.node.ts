import searchTool from "../tools/search.tool.js";

import type {
    AgentStateType,
    AgentStateUpdate,
} from "../state.js";

class DiscoverNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        const jobs = await searchTool.search(
            state.query,
        );

        return {
            jobs,
            history: [
                ...state.history,
                `Discovered jobs for: ${state.query}`,
            ],
        };
    }
}

export default new DiscoverNode();