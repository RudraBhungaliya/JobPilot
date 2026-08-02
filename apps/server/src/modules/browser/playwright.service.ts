import { chromium } from "playwright";

import browserManager from "./browser.manager.js";

class PlaywrightService {
    async launch() {
        const existing =
            browserManager.getBrowser();

        if (existing) {
            return existing;
        }

        const browser =
            await chromium.launch({
                headless: false,
            });

        browserManager.setBrowser(browser);

        return browser;
    }
}

export default new PlaywrightService();