import webScraperSource from "../sources/web-scraper.source.js";
import type { SourceJob } from "../sources/source.types.js";
import logger from "../../core/logger/logger.js";

export interface SearchFilters {
    keywords: string[];
    location?: string;
    experienceLevel?: string;
    remote?: boolean;
}

export interface CrawledJobOpening {
    id: string;
    title: string;
    company: string;
    url: string;
    location: string;
    description: string;
    tags: string[];
    source: string;
}

export class CrawlerService {
    /**
     * Crawl real web openings matching user search filters
     */
    async crawl(filters: SearchFilters): Promise<CrawledJobOpening[]> {
        try {
            const keyword = (filters.keywords || []).join(" ");
            const jobs = await webScraperSource.search({
                keyword,
                location: filters.location,
                remote: filters.remote,
            });

            return jobs.map((j: SourceJob) => ({
                id: j.externalId,
                title: j.title,
                company: j.company,
                url: j.url,
                location: j.location || "Remote",
                description: j.description,
                tags: (filters.keywords || []).concat(["Web Opening", j.company]),
                source: j.source,
            }));
        } catch (err) {
            logger.warn({ err }, "CrawlerService.crawl encountered error");
            return [];
        }
    }
}

export default new CrawlerService();