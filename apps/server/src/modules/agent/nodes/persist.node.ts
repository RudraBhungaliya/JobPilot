import applicationTool from "../tools/application.tool.js";

import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

class PersistNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        if (state.selectedJobs.length === 0) {
            return {
                history: [
                    ...state.history,
                    "Nothing to persist.",
                ],
            };
        }

        if (!state.application) {
            return {
                history: [
                    ...state.history,
                    "No application record available to persist.",
                ],
            };
        }

        try {
            await applicationTool.updateApplication(
                state.application.id,
                {
                    status: state.application.status,
                },
            );

            return {
                history: [
                    ...state.history,
                    `Application ${state.application.id} persisted.`,
                ],
            };
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to persist application.";

            return {
                errors: [
                    ...state.errors,
                    message,
                ],
                history: [
                    ...state.history,
                    "Application persistence failed.",
                ],
            };
        }
    }
}

export default new PersistNode();