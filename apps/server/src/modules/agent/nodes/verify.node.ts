import applicationTool from "../tools/application.tool.js";

import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

class VerifyNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        if (state.applications.length === 0) {
            return {
                errors: [
                    ...state.errors,
                    "No applications available for verification.",
                ],
                history: [
                    ...state.history,
                    "Application verification skipped.",
                ],
            };
        }

        const verified = [];
        const errors: string[] = [];

        for (const application of state.applications) {
            const current =
                await applicationTool.getApplication(
                    application.id,
                );

            if (!current) {
                errors.push(
                    `Application ${application.id} could not be found.`,
                );
                continue;
            }

            if (current.status !== "SUBMITTED") {
                errors.push(
                    `Application ${current.id} has status ${current.status}.`,
                );
                continue;
            }

            verified.push({
                id: current.id,
                status: current.status,
            });
        }

        return {
            applications: verified,

            application: verified[0],

            errors: [
                ...state.errors,
                ...errors,
            ],

            history: [
                ...state.history,
                `Verified ${verified.length}/${state.applications.length} applications.`,
            ],
        };
    }
}

export default new VerifyNode();