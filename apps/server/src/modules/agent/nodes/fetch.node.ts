import type { AgentStateType, AgentStateUpdate } from "../graph/state.js";
import type { AgentJob } from "../agent.types.js";
import { isCanonicalJobUrl } from "../../sources/web-scraper.source.js";

export class FetchNode {
    private normalizeJobs(jobs: AgentJob[]): {
        jobs: AgentJob[];
        skipped: number;
    } {
        const seenIds = new Set<string>();
        const seenUrls = new Set<string>();
        const normalizedJobs: AgentJob[] = [];
        let skipped = 0;

        for (const job of jobs) {
            const title = job.title?.trim();
            const company = job.company?.trim();
            const url = job.url?.trim();

            if (!job.id?.trim() || !title || !company || !url || !isCanonicalJobUrl(url)) {
                skipped++;
                continue;
            }

            const normalizedUrl = new URL(url).toString().replace(/\/$/, "").toLowerCase();
            const normalizedId = job.id.trim();
            if (seenIds.has(normalizedId) || seenUrls.has(normalizedUrl)) {
                skipped++;
                continue;
            }

            seenIds.add(normalizedId);
            seenUrls.add(normalizedUrl);
            normalizedJobs.push({
                ...job,
                id: normalizedId,
                title,
                company,
                url,
                description: job.description?.trim() || undefined,
                location: job.location?.trim() || undefined,
                source: job.source?.trim() || undefined,
                platform: job.platform?.trim() || undefined,
            });
        }

        return { jobs: normalizedJobs, skipped };
    }

    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        const { jobs, skipped } = this.normalizeJobs(state.jobs);
        const validJobIds = new Set(jobs.map((job) => job.id));
        const selectedJobs = state.selectedJobs.filter((job) => validJobIds.has(job.id));

        if (jobs.length === 0) {
            return {
                jobs: [],
                selectedJobs: [],
                history: [
                    ...state.history,
                    skipped > 0
                        ? `Fetch completed with no valid jobs; skipped ${skipped} invalid or duplicate records.`
                        : "No jobs found to fetch.",
                ],
            };
        }

        return {
            jobs,
            selectedJobs,
            history: [
                ...state.history,
                `Fetched ${jobs.length} valid jobs${skipped > 0 ? ` and skipped ${skipped} invalid or duplicate records` : ""}.`,
            ],
        };
    }
}

export default new FetchNode();