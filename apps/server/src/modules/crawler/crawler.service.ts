import detectorService from "./detector.service.js";
import parserService from "./parser.service.js";
import normalizerService from "./normalizer.service.js";
import type { RawJob } from "./crawler.types.js";

import type {
    CrawlDTO,
} from "./crawler.validators.js";

class CrawlerService {
    async crawl(
        dto: CrawlDTO,
    ) {

        /*
            Actual crawling
            will come later.
        */

        const jobs: RawJob[] = [];

        return normalizerService.normalize(
            jobs.map(job =>
                parserService.parse(job),
            ),
        );
    }

    detect(url: string) {
        return detectorService.detect(url);
    }
}

export default new CrawlerService();