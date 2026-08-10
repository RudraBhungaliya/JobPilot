import crawlerService from "../../crawler/crawler.service.js";

class SearchTool {
    async search(
        ...args: Parameters<
            typeof crawlerService.crawl
        >
    ) {
        return crawlerService.crawl(
            ...args,
        );
    }
}

export default new SearchTool();