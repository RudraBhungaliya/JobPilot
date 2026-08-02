import browserManager from "./browser.manager.js";

class SessionService {
    isRunning() {
        return browserManager.getBrowser() !== null;
    }

    async destroy() {
        await browserManager.close();
    }
}

export default new SessionService();