import type { AgentState } from "../state.js";

class RankNode {
    async execute(
        state: AgentState,
    ): Promise<Partial<AgentState>> {

        /*
            ATS +
            AI ranking.
        */

        return {
            selectedJobs: state.jobs,
        };
    }
}

export default new RankNode();