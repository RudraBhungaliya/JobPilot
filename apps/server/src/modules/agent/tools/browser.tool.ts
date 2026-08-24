import type { Page } from "playwright";

import playwrightService from "../../browser/playwright.service.js";
import browserManager from "../../browser/browser.manager.js";

class BrowserTool {
    async launch() {
        return playwrightService.launch();
    }

    getBrowser() {
        return browserManager.getBrowser();
    }

    async openPage(
        url: string,
    ): Promise<Page> {
        const browser =
            await this.launch();

        const page =
            await browser.newPage();

        await page.goto(url, {
            waitUntil:
                "domcontentloaded",
            timeout: 30000,
        });

        return page;
    }

    async close() {
        return browserManager.close();
    }
}

export default new BrowserTool();