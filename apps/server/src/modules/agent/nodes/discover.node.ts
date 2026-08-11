import type { AgentStateType } from "../state.js";

class DiscoverNode {
    async execute(
        state: AgentStateType,
    ): Promise<Partial<AgentStateType>> {
        /*
            Search sources
        */

        return {
            jobs: [],
        };
    }
}

export default new DiscoverNode();