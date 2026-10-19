import crawlerService from "../../crawler/crawler.service.js";
import pageFetcherService from "../../crawler/page-fetcher.service.js";
import parserService from "../../crawler/parser.service.js";
import detectorService from "../../crawler/detector.service.js";
import logger from "../../../core/logger/logger.js";
import type { AgentStateType, AgentStateUpdate } from "../graph/state.js";
import type { AgentJob } from "../agent.types.js";

class FetchNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        logger.info(
            { query: state.query, existingJobsCount: state.jobs.length, userId: state.userId },
            "FetchNode: executing job fetch and detail extraction",
        );

        // Case 1: If no jobs currently exist in state, crawl matching jobs using the candidate's query
        if (state.jobs.length === 0) {
            if (!state.query?.trim()) {
                return {
                    history: [
                        ...state.history,
                        "FetchNode: No jobs in state and no query provided to crawl.",
                    ],
                };
            }

            try {
                const crawled = await crawlerService.crawl({
                    keyword: state.query,
                });

                const mappedJobs: AgentJob[] = crawled.map((c, index) => ({
                    id: `job-crawled-${Date.now()}-${index}`,
                    title: c.title,
                    company: c.company,
                    location: c.location || "Remote / Various",
                    url: c.url,
                    description: c.description || "",
                    source: "web_scraper",
                    platform: c.platform || "web",
                }));

                return {
                    jobs: mappedJobs,
                    history: [
                        ...state.history,
                        `FetchNode: Crawled ${mappedJobs.length} live job requisitions for query "${state.query}".`,
                    ],
                };
            } catch (crawlErr: any) {
                logger.warn(
                    { error: crawlErr?.message || crawlErr },
                    "FetchNode: Crawling failed for query, proceeding with empty jobs",
                );
                return {
                    history: [
                        ...state.history,
                        `FetchNode: Failed to crawl jobs: ${crawlErr?.message || "Unknown error"}.`,
                    ],
                };
            }
        }

        // Case 2: Deep-fetch details for existing jobs with missing or brief descriptions
        const updatedJobs = [...state.jobs];
        let fetchedCount = 0;

        for (let i = 0; i < updatedJobs.length; i++) {
            const job = updatedJobs[i];
            const needsDeepFetch = !job.description || job.description.trim().length < 100;

            if (needsDeepFetch && job.url) {
                try {
                    const { html, redirectedUrl } = await pageFetcherService.fetch(job.url);
                    if (html && html.trim().length > 0) {
                        const platform = detectorService.detect(redirectedUrl || job.url, html);
                        const parsed = await parserService.parse({
                            url: redirectedUrl || job.url,
                            html,
                            platform,
                        });

                        if (parsed.description && parsed.description.trim().length > (job.description?.length || 0)) {
                            updatedJobs[i] = {
                                ...job,
                                description: parsed.description,
                                title: parsed.title || job.title,
                                company: parsed.company || job.company,
                                location: parsed.location || job.location,
                                platform: platform || job.platform || "web",
                            };
                            fetchedCount++;
                        }
                    }
                } catch (fetchErr: any) {
                    logger.debug(
                        { url: job.url, error: fetchErr?.message },
                        "FetchNode: Non-fatal error deep-fetching job page details",
                    );
                }
            }
        }

        return {
            jobs: updatedJobs,
            history: [
                ...state.history,
                `FetchNode: Evaluated ${updatedJobs.length} jobs, deep-fetched detailed descriptions for ${fetchedCount} job(s).`,
            ],
        };
    }
}

export default new FetchNode();