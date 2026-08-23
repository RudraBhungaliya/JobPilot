import crypto from "crypto";
import searchTool from "../tools/search.tool.js";

import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

class DiscoverNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        const rawJobs =
            await searchTool.search({
                keyword: state.query,
            });

        const jobs = rawJobs.map((job) => ({
            id: crypto
                .createHash("sha256")
                .update(job.url)
                .digest("hex")
                .slice(0, 12),
            title: job.title,
            company: job.company,
            url: job.url,
        }));

        return {
            jobs,
            selectedJobs: [],
            evaluated: false,
            history: [
                ...state.history,
                `Discovered ${jobs.length} jobs for: ${state.query}`,
            ],
        };
    }
}

export default new DiscoverNode();