import applicationTool from "../tools/application.tool.js";

import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

class PersistNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        const appsToPersist =
            state.applications.length > 0
                ? state.applications
                : state.application
                  ? [state.application]
                  : [];

        if (appsToPersist.length === 0) {
            return {
                history: [
                    ...state.history,
                    "No applications available for persistence.",
                ],
            };
        }

        const persisted = [];

        for (const application of appsToPersist) {
            const current =
                await applicationTool.getApplication(
                    application.id,
                );

            if (!current) {
                continue;
            }

            persisted.push({
                id: current.id,
                status: current.status,
            });
        }

        return {
            applications: persisted,

            application: persisted[0],

            history: [
                ...state.history,
                `Persisted ${persisted.length} application records.`,
            ],
        };
    }
}

export default new PersistNode();