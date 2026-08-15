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
                const html = await pageFetcherService.fetch(sourceJob.url);
                const platform = this.detect(sourceJob.url);
                const rawJob = {
                    url: sourceJob.url,
                    html,
                    platform,
                };
                const parsedJob = await parserService.parse(rawJob);
                parsedJobs.push(parsedJob);
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