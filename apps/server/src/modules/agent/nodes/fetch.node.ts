import type { AgentState } from "../state.js";

class FetchNode {
    async execute(
        state: AgentState,
    ): Promise<Partial<AgentState>> {

        /*
            Crawl jobs
            later.
        */

        return {
            jobs: state.jobs,
        };
    }
}

export default new FetchNode();