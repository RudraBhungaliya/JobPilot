import crypto from "crypto";
import searchTool from "../tools/search.tool.js";
import applicationRepository from "../../application/application.repository.js";

import type { AgentStateType, AgentStateUpdate } from "../graph/state.js";

class DiscoverNode {
    async execute(state: AgentStateType): Promise<AgentStateUpdate> {
        const rawJobs = await searchTool.search({ keyword: state.query });

        const allJobs = rawJobs.map((job) => ({
            id: crypto.createHash("sha256").update(job.url).digest("hex").slice(0, 12),
            title: job.title,
            company: job.company,
            url: job.url,
        }));

        // Filter out jobs the user already has a submitted application for
        const filtered = await Promise.all(
            allJobs.map(async (job) => {
                const existing = await applicationRepository.findByUserAndJob(
                    state.userId,
                    job.id,
                );

                if (existing && existing.status === "SUBMITTED") {
                    return null;
                }

                return job;
            }),
        );

        const jobs = filtered.filter((j): j is NonNullable<typeof j> => j !== null);

        return {
            jobs,
            selectedJobs: [],
            evaluated: false,
            history: [
                ...state.history,
                `Discovered ${jobs.length} new jobs (${allJobs.length - jobs.length} already applied, skipped).`,
            ],
        };
    }
}

export default new DiscoverNode();