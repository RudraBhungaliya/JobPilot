import type { AgentStateType, AgentStateUpdate } from "../graph/state.js";

class VerifyNode {
  async execute(state: AgentStateType): Promise<AgentStateUpdate> {
    if (state.selectedJobs.length === 0) {
      return {
        errors: [...state.errors, "No jobs were selected for application."],
        history: [...state.history, "Application verification skipped."],
      };
    }

    if (!state.browser) {
      return {
        errors: [
          ...state.errors,
          "No browser session is available for verification.",
        ],
        history: [
          ...state.history,
          "Application verification failed: browser session unavailable.",
        ],
      };
    }

    return {
      history: [
        ...state.history,
        `Verification stage reached for ${state.selectedJobs.length} jobs.`,
      ],
    };
  }
}

export default new VerifyNode();
