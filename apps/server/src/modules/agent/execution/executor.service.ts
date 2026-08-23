import {
    agentGraph,
} from "../graph/graph.js";

import type {
    AgentStateType,
} from "../graph/state.js";

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
