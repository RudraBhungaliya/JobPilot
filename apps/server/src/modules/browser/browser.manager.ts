import type { Browser } from "playwright";

class BrowserManager {
    private browser: Browser | null = null;

    getBrowser() {
        return this.browser;
    }

    setBrowser(browser: Browser) {
        this.browser = browser;
    }

    async close() {
        if (!this.browser) return;

        await this.browser.close();

        this.browser = null;
    }
}

export default new BrowserManager();