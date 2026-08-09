import executorService from "./executor.service.js";

import type { AgentState } from "./state.js";

class AgentGraph {
    async execute(
        state: AgentState,
    ): Promise<AgentState> {
        return executorService.execute(
            state,
        );
    }
}

export default new AgentGraph();