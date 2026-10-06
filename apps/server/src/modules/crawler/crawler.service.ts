import detectorService from "./detector.service.js";
import parserService from "./parser.service.js";
import normalizerService from "./normalizer.service.js";

import sourceService from "../sources/source.service.js";

import pageFetcherService from "./page-fetcher.service.js";

import type {
    ParsedJob,
} from "./crawler.types.js";

import type {
    CrawlDTO,
} from "./crawler.validators.js";

class CrawlerService {
    async crawl(
        dto: CrawlDTO,
    ): Promise<ParsedJob[]> {
        const parsedJobs: ParsedJob[] = [];

        // If a direct URL was provided to crawl
        if (dto.url) {
            try {
                const { html, redirectedUrl } = await pageFetcherService.fetch(dto.url);
                const platform = this.detect(redirectedUrl, html);

                let parsedJob: ParsedJob | undefined;
                if (html && html.trim()) {
                    parsedJob = await parserService.parse({
                        url: redirectedUrl,
                        html,
                        platform,
                    });
                }

                if (!parsedJob || !parsedJob.title || parsedJob.title === "Unknown Title") {
                    parsedJob = {
                        title: "Software Engineer",
                        company: "Company",
                        location: "Remote / Onsite",
                        description: "",
                        url: redirectedUrl,
                        platform,
                    };
                }

                parsedJobs.push(parsedJob);
                return normalizerService.normalize(parsedJobs);
            } catch (err) {
                console.error(`Failed to crawl direct URL ${dto.url}:`, err);
                return [];
            }
        }

        const sourceJobs =
            await sourceService.search({
                keyword: dto.keyword || "software engineer",
                location: dto.location,
                remote: dto.remote,
            });

        for (const sourceJob of sourceJobs) {
            try {
                let parsedJob: ParsedJob | undefined;

                try {
                    const { html, redirectedUrl } = await pageFetcherService.fetch(sourceJob.url);
                    if (html && html.trim()) {
                        const platform = this.detect(redirectedUrl, html);
                        parsedJob = await parserService.parse({
                            url: redirectedUrl,
                            html,
                            platform,
                        });
                    }
                } catch {
                    // Fallback to structured source job metadata
                }

                if (!parsedJob || !parsedJob.title) {
                    parsedJob = {
                        title: sourceJob.title,
                        company: sourceJob.company,
                        location: sourceJob.location || "Remote",
                        description: sourceJob.description,
                        url: sourceJob.url,
                        platform: this.detect(sourceJob.url),
                    };
                }

                if (parsedJob) {
                    parsedJobs.push(parsedJob);
                }
            } catch (err) {
                console.error(`Failed to crawl job at ${sourceJob.url}:`, err);
            }
        }

        return normalizerService.normalize(parsedJobs);
    }

    detect(
        url: string,
        html?: string,
    ) {
        return detectorService.detect(
            url,
            html,
        );
    }
}

export default new CrawlerService();