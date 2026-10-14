import browserService from "../browser/browser.service.js";

class PageFetcherService {
    private readonly allowedDomains = ["greenhouse.io", "lever.co", "ashbyhq.com", "myworkdayjobs.com"];

    private isAllowedUrl(value: string, domain: string): boolean {
        try {
            const parsed = new URL(value);
            const host = parsed.hostname.toLowerCase();
            return parsed.protocol === "https:" && (host === domain || host.endsWith(`.${domain}`)) &&
                !host.includes("localhost") && !/^\d+(?:\.\d+){3}$/.test(host);
        } catch {
            return false;
        }
    }

    async fetch(url: string): Promise<{ html: string; redirectedUrl: string }> {
        let parsedUrl: URL;
        try { parsedUrl = new URL(url); } catch { throw new Error("A valid HTTPS ATS URL is required."); }
        const domain = this.allowedDomains.find((candidate) => parsedUrl.hostname === candidate || parsedUrl.hostname.endsWith(`.${candidate}`));
        if (!domain || !this.isAllowedUrl(url, domain)) throw new Error("Only supported public ATS job URLs can be fetched.");
        const page = await browserService.newPage();
        try {
            await page.route("**/*", async (route) => {
                if (this.isAllowedUrl(route.request().url(), domain)) await route.continue();
                else await route.abort("blockedbyclient");
            });
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
            await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
            const html = await page.content();
            const redirectedUrl = page.url();
            if (!this.isAllowedUrl(redirectedUrl, domain)) throw new Error("The ATS redirected to an unsupported host.");
            return { html, redirectedUrl };
        } catch (error) {
            throw error;
        } finally {
            await page.close();
        }
    }
}

export default new PageFetcherService();
