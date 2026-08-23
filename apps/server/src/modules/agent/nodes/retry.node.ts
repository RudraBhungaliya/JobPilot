import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

class RetryNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        if (state.errors.length === 0) {
            return {
                history: [
                    ...state.history,
                    "No retry required.",
                ],
            };
        }

        return {
            errors: [],
            history: [
                ...state.history,
                "Retry state prepared.",
            ],
        };
    }
}

export default new RetryNode();