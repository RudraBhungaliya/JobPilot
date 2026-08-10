import playwrightService from "../../browser/playwright.service.js";
import browserManager from "../../browser/browser.manager.js";

class BrowserTool {
    async launch() {
        return playwrightService.launch();
    }

    getBrowser() {
        return browserManager.getBrowser();
    }

    async close() {
        return browserManager.close();
    }
}

export default new BrowserTool();