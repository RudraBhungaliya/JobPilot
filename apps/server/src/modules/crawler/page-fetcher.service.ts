import browserService from "../browser/browser.service.js";

class PageFetcherService {
    async fetch(url: string): Promise<string> {
        const page = await browserService.newPage();
        try {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
            return await page.content();
        } catch (error) {
            console.error(`PageFetcher failed to fetch URL ${url}:`, error);
            return "";
        } finally {
            await page.close();
        }
    }
}

export default new PageFetcherService();
