import applicationTool from "../tools/application.tool.js";

import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

class VerifyNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        if (!state.application) {
            return {
                errors: [
                    ...state.errors,
                    "No application available for verification.",
                ],
                history: [
                    ...state.history,
                    "Application verification skipped.",
                ],
            };
        }

        const application =
            await applicationTool.getApplication(
                state.application.id,
            );

        if (!application) {
            return {
                errors: [
                    ...state.errors,
                    `Application ${state.application.id} could not be found.`,
                ],
                history: [
                    ...state.history,
                    "Application verification failed.",
                ],
            };
        }

        if (
            application.status !==
            "SUBMITTED"
        ) {
            return {
                errors: [
                    ...state.errors,
                    `Application ${application.id} was not submitted. Current status: ${application.status}.`,
                ],
                history: [
                    ...state.history,
                    `Application ${application.id} verification failed.`,
                ],
            };
        }

        return {
            application: {
                id: application.id,
                status: "SUBMITTED",
            },
            history: [
                ...state.history,
                `Application ${application.id} successfully verified as SUBMITTED.`,
            ],
        };
    }
}

export default new VerifyNode();