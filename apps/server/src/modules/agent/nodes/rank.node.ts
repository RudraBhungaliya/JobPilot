import type { AgentStateType, AgentStateUpdate } from "../state.js";

import aiTool from "../tools/ai.tool.js";
class RankNode {
  async execute(state: AgentStateType): Promise<Partial<AgentStateUpdate>> {
    /*
            ATS +
            AI ranking.
        */

    if (state.jobs.length === 0) {
      return {
        selectedJobs: [],
        history: [...state.history, "No jobs available for ranking."],
      };
    }

    const prompt = `
    Rank these job openings for the candidate.

    Candidate query:
    ${state.query}

    Jobs:
    ${JSON.stringify(state.jobs)}

    Return only the job IDs that are relevant to the candidate,
    ordered from most relevant to least relevant.
    `;

    const result = await aiTool.generate(prompt);

    const rankedIds = result
      .split(/[\s,\n]+/)
      .map((id) => id.trim())
      .filter(Boolean);

    const selectedJobs = rankedIds
      .map((id) => state.jobs.find((job) => job.id === id))
      .filter((job): job is NonNullable<typeof job> => Boolean(job));

    return {
      selectedJobs,
      history: [
        ...state.history,
        `Ranked ${state.jobs.length} jobs and selected ${selectedJobs.length}.`,
      ],
    };
  }
}

export default new RankNode();
