import aiTool from "../tools/ai.tool.js";

import type { AgentStateType, AgentStateUpdate } from "../graph/state.js";

class TailorNode {
  async execute(state: AgentStateType): Promise<AgentStateUpdate> {
    if (state.selectedJobs.length === 0) {
      return {
        history: [
          ...state.history,
          "No selected jobs available for tailoring.",
        ],
      };
    }

    if (!state.resume) {
      return {
        history: [...state.history, "No resume available for tailoring."],
      };
    }

    const prompt = `
Prepare application tailoring instructions for these jobs.

Candidate resume:
${JSON.stringify(state.resume)}

Selected jobs:
${JSON.stringify(state.selectedJobs)}

Return concise, job-specific tailoring instructions.
Do not invent candidate experience, skills, or achievements.
`;

    const result = await aiTool.generate(prompt);

    return {
      history: [
        ...state.history,
        `Generated tailoring instructions for ${state.selectedJobs.length} jobs.`,
        result,
      ],
    };
  }
}

export default new TailorNode();
