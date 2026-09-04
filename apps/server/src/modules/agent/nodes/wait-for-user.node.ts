import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

/**
 * Terminal node that halts graph execution when human input is required.
 * The apply node will have already created the HumanAction record and
 * set the application status to WAITING_FOR_USER before routing here.
 * This node is a no-op — it just logs the pause and lets the graph end.
 */
class WaitForUserNode {
    execute(
        state: AgentStateType,
    ): AgentStateUpdate {
        return {
            history: [
                ...state.history,
                "Graph paused: waiting for user input before continuing.",
            ],
        };
    }
}

export default new WaitForUserNode();
