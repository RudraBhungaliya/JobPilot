export interface SearchFilters{
    keywords : string[];
    location? : string;
    experienceLevel? : string;
    remote? : boolean;
}

class CrawlerService {
    async crawl(
        filters: SearchFilters,
    ) {
        return [];
    }
}

export default new CrawlerService();