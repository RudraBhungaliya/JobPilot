import {
    agentGraph,
} from "./graph.js";

import type {
    AgentStateType,
} from "./state.js";

class ExecutorService {
    async execute(
        state: AgentStateType,
    ) {
        return agentGraph.invoke(
            state,
        );
    }
}

export default new ExecutorService();