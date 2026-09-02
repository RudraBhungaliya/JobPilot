import crypto from "crypto";
import searchTool from "../tools/search.tool.js";
import candidateTool from "../candidate/candidate.tool.js";

import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

class DiscoverNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        const queries: string[] = [state.query];
        let remoteOnly = false;
        const candidateSkills: string[] = [];

        // 1. Analyze candidate resume and profile skills
        try {
            const context = await candidateTool.getContext(
                state.userId,
                state.resumeId || state.resume?.id,
            );

            if (context.remoteOnly) {
                remoteOnly = true;
            }

            if (Array.isArray(context.skills)) {
                candidateSkills.push(...context.skills);
            }

            // Extract technical keywords from resume text
            if (context.resumeText) {
                const text = context.resumeText.toLowerCase();
                const techKeywords = [
                    "react", "typescript", "javascript", "node", "python", "go",
                    "golang", "rust", "java", "c++", "docker", "kubernetes", "aws",
                    "graphql", "sql", "postgresql", "mongodb", "next.js", "tailwind",
                ];
                for (const kw of techKeywords) {
                    if (text.includes(kw) && !candidateSkills.includes(kw)) {
                        candidateSkills.push(kw);
                    }
                }
            }

            // Formulate targeted queries from resume skills
            if (candidateSkills.length > 0) {
                const topSkill = candidateSkills[0];
                const combined = `${topSkill} ${state.query}`.trim();
                if (!queries.includes(combined)) {
                    queries.push(combined);
                }
            }
        } catch {
            // Gracefully proceed with base query
        }

        // 2. Perform live search across queries
        const searchResults = await Promise.allSettled(
            queries.map((q) =>
                searchTool.search({
                    keyword: q,
                    remote: remoteOnly ? true : undefined,
                }),
            ),
        );

        const seenUrls = new Set<string>();
        const jobs = [];

        for (const res of searchResults) {
            if (res.status !== "fulfilled") continue;
            for (const rawJob of res.value) {
                if (!rawJob.url || seenUrls.has(rawJob.url)) continue;
                seenUrls.add(rawJob.url);

                jobs.push({
                    id: crypto
                        .createHash("sha256")
                        .update(rawJob.url)
                        .digest("hex")
                        .slice(0, 12),
                    title: rawJob.title,
                    company: rawJob.company,
                    url: rawJob.url,
                });
            }
        }

        return {
            jobs,
            selectedJobs: [],
            evaluated: false,
            history: [
                ...state.history,
                `Discovered ${jobs.length} live job openings across startups & MNCs for: ${queries.join(" | ")}`,
            ],
        };
    }
}

export default new DiscoverNode();