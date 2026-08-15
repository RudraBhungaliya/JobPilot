import crawlerService from "../../crawler/crawler.service.js";

import type {
    CrawlDTO,
} from "../../crawler/crawler.validators.js";
class SearchTool {
    async search(
        dto : CrawlDTO,
    ) {
        return crawlerService.crawl(
            dto,
        );
    }
}

export default new SearchTool();