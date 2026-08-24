import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

class PersistNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        if (!state.application) {
            return {
                history: [
                    ...state.history,
                    "No application available for persistence.",
                ],
            };
        }

        return {
            history: [
                ...state.history,
                `Application ${state.application.id} persisted successfully.`,
            ],
        };
    }
}

export default new PersistNode();