import type {
    Request,
    Response,
} from "express";

import crawlerService from "./crawler.service.js";
import {
    crawlSchema,
} from "./crawler.validators.js";

class CrawlerController {
    async crawl(
        req: Request,
        res: Response,
    ) {
        const body =
            crawlSchema.parse(req.body);

        const jobs =
            await crawlerService.crawl(body);

        return res.status(200).json({
            success: true,
            data: jobs,
        });
    }
}

export default new CrawlerController();