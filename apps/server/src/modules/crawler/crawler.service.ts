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
            const { html, redirectedUrl } = await pageFetcherService.fetch(dto.url);
            const platform = this.detect(redirectedUrl, html);
            if (!html.trim()) throw new Error("The job page returned an empty response.");
            const parsedJob = await parserService.parse({ url: redirectedUrl, html, platform });
            if (!parsedJob?.title?.trim() || !parsedJob.company?.trim() || !parsedJob.url) {
                throw new Error("The job page did not contain enough verified information to create a job record.");
            }
            parsedJobs.push(parsedJob);
            return normalizerService.normalize(parsedJobs);
        }

        const sourceJobs =
            await sourceService.search({
                keyword: dto.keyword || "",
                location: dto.location,
                remote: dto.remote,
            });

        for (const sourceJob of sourceJobs) {
            try {
                if (sourceJob?.title?.trim() && sourceJob?.company?.trim() && sourceJob?.url) {
                    parsedJobs.push({
                        title: sourceJob.title.trim(),
                        company: sourceJob.company.trim(),
                        location: sourceJob.location || "",
                        description: sourceJob.description || "",
                        url: sourceJob.url,
                        platform: this.detect(sourceJob.url),
                    });
                }
            } catch (err) {
                console.error(`Failed to process job at ${sourceJob.url}:`, err);
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
