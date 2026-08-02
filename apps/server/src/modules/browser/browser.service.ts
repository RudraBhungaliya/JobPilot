import playwrightService from "./playwright.service.js";

class BrowserService {
    async startBrowser() {
        return playwrightService.launch();
    }

    async closeBrowser() {
        const browser = await playwrightService.launch();
        await browser.close();
    }

    async newPage() {
        const browser = await playwrightService.launch();

        return browser.newPage();
    }
}

export default new BrowserService();