import applicationTool from "../tools/application.tool.js";
import submissionVerificationTool from "../tools/submission-verification.tool.js";

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

    if (application.status !== "SUBMITTED") {
      return {
        application: {
          id: application.id,
          status: application.status,
        },
        errors: [
          ...state.errors,
          `Application ${application.id} is not submitted. Current status: ${application.status}.`,
        ],
        history: [
          ...state.history,
          `Application ${application.id} verification stopped because status is ${application.status}.`,
        ],
      };
    }

    return {
      application: {
        id: application.id,
        status: application.status,
      },
      history: [
        ...state.history,
        `Application ${application.id} verified with status ${application.status}.`,
      ],
    };
  }
}

export default new VerifyNode();