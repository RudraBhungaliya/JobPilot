import type { Request, Response } from "express";

import browserService from "./browser.service.js";

class BrowserController {
    async launch(req: Request, res: Response) {
        await browserService.startBrowser();

        return res.json({
            success: true,
            message: "Browser launched",
        });
    }

    async close(req: Request, res: Response) {
        await browserService.closeBrowser();

        return res.json({
            success: true,
            message: "Browser closed",
        });
    }

    async page(req: Request, res: Response) {
        const page = await browserService.newPage();

        return res.json({
            success: true,
            url: page.url(),
        });
    }
}

export default new BrowserController();