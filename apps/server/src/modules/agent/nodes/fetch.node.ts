import crawlerService from "../../crawler/crawler.service.js";
import logger from "../../../core/logger/logger.js";
import { isCanonicalJobUrl } from "../../sources/web-scraper.source.js";
import type { AgentStateType, AgentStateUpdate } from "../graph/state.js";
import type { AgentJob } from "../agent.types.js";

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

            let normalizedUrl: string;
            try {
                normalizedUrl = new URL(url).toString().replace(/\/$/, "").toLowerCase();
            } catch {
                skipped++;
                continue;
            }

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
                url: normalizedUrl,
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
        let rawJobs = state.jobs || [];

        // If no jobs exist in state but query is provided, crawl live openings
        if (rawJobs.length === 0 && state.query?.trim()) {
            try {
                const crawled = await crawlerService.crawl({
                    keyword: state.query,
                });
                rawJobs = crawled.map((c, index) => ({
                    id: `job-crawled-${Date.now()}-${index}`,
                    title: c.title,
                    company: c.company,
                    location: c.location || "Remote / Various",
                    url: c.url,
                    description: c.description || undefined,
                    source: "web_scraper",
                    platform: c.platform || "web",
                }));
            } catch (err: any) {
                logger.warn(
                    { error: err?.message || err },
                    "FetchNode: Crawl error for query",
                );
            }
        }

        const { jobs, skipped } = this.normalizeJobs(rawJobs);
        const validJobIds = new Set(jobs.map((job) => job.id));
        const selectedJobs = (state.selectedJobs || []).filter((job) => validJobIds.has(job.id));

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