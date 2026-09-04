import crypto from "crypto";
import searchTool from "../tools/search.tool.js";
<<<<<<< HEAD
import candidateTool from "../candidate/candidate.tool.js";
=======
import applicationRepository from "../../application/application.repository.js";
>>>>>>> 75ce97492af7e4d89d96cb0094053166cd490656

import type { AgentStateType, AgentStateUpdate } from "../graph/state.js";

class DiscoverNode {
<<<<<<< HEAD
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        const queries: string[] = state.query ? [state.query] : [];
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

            // Extract technical keywords and title from resume text
            if (context.resumeText) {
                const resumeParser = (await import("../../resume/resume.parser.js")).default;
                const keywords = resumeParser.extractKeywords(context.resumeText);
                for (const kw of keywords) {
                    if (!candidateSkills.includes(kw)) {
                        candidateSkills.push(kw);
                    }
                }
            }

            // If base query was empty or generic, use currentTitle or top skill
            if (queries.length === 0) {
                if (context.currentTitle) {
                    queries.push(context.currentTitle);
                } else if (candidateSkills.length > 0) {
                    queries.push(`${candidateSkills[0]} developer`);
                } else {
                    queries.push("software engineer");
                }
            }

            // Formulate targeted queries from top resume skills
            const topSkills = candidateSkills.slice(0, 3);
            for (const skill of topSkills) {
                const combined = state.query ? `${skill} ${state.query}`.trim() : `${skill} developer`;
                if (!queries.includes(combined) && queries.length < 3) {
                    queries.push(combined);
                }
            }
        } catch {
            // Gracefully proceed with base query
            if (queries.length === 0) {
                queries.push(state.query || "software engineer");
            }
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
                    description: rawJob.description,
                    location: rawJob.location,
                });
            }
        }
=======
    async execute(state: AgentStateType): Promise<AgentStateUpdate> {
        const rawJobs = await searchTool.search({ keyword: state.query });

        const allJobs = rawJobs.map((job) => ({
            id: crypto.createHash("sha256").update(job.url).digest("hex").slice(0, 12),
            title: job.title,
            company: job.company,
            url: job.url,
        }));
>>>>>>> 75ce97492af7e4d89d96cb0094053166cd490656

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
<<<<<<< HEAD
                `Discovered ${jobs.length} live job openings across startups & MNCs for: ${queries.join(" | ")}`,
=======
                `Discovered ${jobs.length} new jobs (${allJobs.length - jobs.length} already applied, skipped).`,
>>>>>>> 75ce97492af7e4d89d96cb0094053166cd490656
            ],
        };
    }
}

export default new DiscoverNode();