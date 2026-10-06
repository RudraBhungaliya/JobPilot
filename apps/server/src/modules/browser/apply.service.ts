import playwrightService from "./playwright.service.js";
import atsAdapterFactory from "../ats/adapters/adapter.factory.js";
import type { ATSExecutionContext, ATSExecutionResult } from "../ats/adapters/base.adapter.js";

class ApplyService {
    async applyWithAdapter(context: ATSExecutionContext): Promise<ATSExecutionResult> {
        const adapter = atsAdapterFactory.getAdapterForUrl(context.url);
        console.log(`[ApplyService] Using adapter: ${adapter.providerName} for ${context.url}`);

        const browser = await playwrightService.launch();
        const page = await browser.newPage();

        try {
            return await adapter.execute(page, context);
        } finally {
            await page.close().catch(() => null);
            await browser.close().catch(() => null);
        }
    }
}

export const applyService = new ApplyService();
export default applyService;