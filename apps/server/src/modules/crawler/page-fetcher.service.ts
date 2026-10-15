import browserService from "../browser/browser.service.js";

class PageFetcherService {
    private readonly allowedDomains = ["greenhouse.io", "lever.co", "ashbyhq.com", "myworkdayjobs.com"];

    private isAllowedUrl(value: string, domain?: string): boolean {
        try {
            const parsed = new URL(value);
            const host = parsed.hostname.toLowerCase();
            if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
            // Prevent SSRF to local/internal network
            if (
                host === "localhost" ||
                host.includes("127.0.0.1") ||
                host === "0.0.0.0" ||
                host.includes("169.254.169.254") ||
                /^(?:10|127|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168)\./.test(host)
            ) {
                return false;
            }
            if (domain) {
                return host === domain || host.endsWith(`.${domain}`);
            }
            return true;
        } catch {
            return false;
        }
    }

    async fetch(url: string): Promise<{ html: string; redirectedUrl: string }> {
        let parsedUrl: URL;
        try { parsedUrl = new URL(url); } catch { throw new Error("A valid HTTPS ATS URL is required."); }
        const host = parsedUrl.hostname.toLowerCase();
        const domain = this.allowedDomains.find((candidate) => host === candidate || host.endsWith(`.${candidate}`));
        if (!this.isAllowedUrl(url, domain)) throw new Error("Only supported public job URLs can be fetched.");
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
            if (!this.isAllowedUrl(redirectedUrl, domain)) throw new Error("The job page redirected to an unsupported host.");
            return { html, redirectedUrl };
        } catch (error) {
            throw error;
        } finally {
            await page.close();
        }
    }
}

export default new PageFetcherService();
