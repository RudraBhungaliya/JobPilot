import type { AgentState } from "../state.js";

class DiscoverNode {
    async execute(
        state: AgentState,
    ): Promise<Partial<AgentState>> {
        /*
            Search sources
            later.
        */

        return {
            jobs: [],
        };
    }
}

export default new DiscoverNode();