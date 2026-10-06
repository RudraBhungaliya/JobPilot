import browserService from "../browser/browser.service.js";

class PageFetcherService {
    async fetch(url: string): Promise<{ html: string; redirectedUrl: string }> {
        const page = await browserService.newPage();
        try {
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
            await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
            const html = await page.content();
            const redirectedUrl = page.url();
            return { html, redirectedUrl };
        } catch (error) {
            console.error(`PageFetcher failed to fetch URL ${url}:`, error);
            return { html: "", redirectedUrl: url };
        } finally {
            await page.close();
        }
    }
}

export default new PageFetcherService();
