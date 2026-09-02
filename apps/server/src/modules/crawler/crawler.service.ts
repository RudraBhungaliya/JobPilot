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
        const sourceJobs =
            await sourceService.search({
                keyword: dto.keyword,
                location: dto.location,
                remote: dto.remote,
            });

        const parsedJobs: ParsedJob[] = [];

        for (const sourceJob of sourceJobs) {
            try {
                let parsedJob: ParsedJob | undefined;

                try {
                    const html = await pageFetcherService.fetch(sourceJob.url);
                    if (html && html.trim()) {
                        const platform = this.detect(sourceJob.url);
                        parsedJob = await parserService.parse({
                            url: sourceJob.url,
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
    ) {
        return detectorService.detect(
            url,
        );
    }
}

export default new CrawlerService();