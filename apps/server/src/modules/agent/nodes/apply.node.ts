import browserTool from "../tools/browser.tool.js";

import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

class ApplyNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        if (state.selectedJobs.length === 0) {
            return {
                history: [
                    ...state.history,
                    "No selected jobs available for application.",
                ],
            };
        }

        const browser =
            browserTool.getBrowser();

        if (!browser) {
            await browserTool.launch();
        }

        return {
            history: [
                ...state.history,
                `Application stage started for ${state.selectedJobs.length} jobs.`,
            ],
        };
    }
}

export default new ApplyNode();