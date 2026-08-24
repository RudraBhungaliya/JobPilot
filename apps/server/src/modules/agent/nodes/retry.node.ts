import applicationTool from "../tools/application.tool.js";

import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

class RetryNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        if (!state.application) {
            return {
                history: [
                    ...state.history,
                    "Retry skipped because no application exists.",
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
                    "Retry failed because application was not found.",
                ],
                history: [
                    ...state.history,
                    "Retry failed: application not found.",
                ],
            };
        }

        const attempts =
            application.attempts;

        if (attempts >= 3) {
            await applicationTool.updateApplication(
                application.id,
                {
                    status: "FAILED",
                    failureReason:
                        "Maximum retry attempts exceeded.",
                },
            );

            return {
                errors: [
                    ...state.errors,
                    "Maximum application retry attempts exceeded.",
                ],
                history: [
                    ...state.history,
                    `Application ${application.id} permanently failed after ${attempts} attempts.`,
                ],
            };
        }

        await applicationTool.updateApplication(
            application.id,
            {
                status: "QUEUED",
                attempts: attempts + 1,
                failureReason: undefined,
            },
        );

        return {
            application: {
                id: application.id,
                status: "QUEUED",
            },
            history: [
                ...state.history,
                `Application ${application.id} queued for retry ${attempts + 1}/3.`,
            ],
        };
    }
}

export default new RetryNode();