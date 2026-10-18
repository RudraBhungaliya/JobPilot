import type { Page } from "playwright";
import { BaseATSAdapter } from "./base.adapter.js";
import type { ATSExecutionContext, ATSExecutionResult } from "./base.adapter.js";

export class GreenhouseAdapter extends BaseATSAdapter {
    readonly providerName = "Greenhouse";

    canHandle(url: string): boolean {
        const u = url.toLowerCase();
        return u.includes("greenhouse.io") || u.includes("boards.greenhouse.io") || u.includes("job-boards.greenhouse.io");
    }

    async execute(page: Page, context: ATSExecutionContext): Promise<ATSExecutionResult> {
        console.log(`[GreenhouseAdapter] 🎯 Launching execution on ${context.url} for ${context.jobTitle}`);

        await page.goto(context.url, { waitUntil: "domcontentloaded", timeout: 45000 });

        try {
            const applyBtn = page.locator('a[href*="#app"], a[href*="application"], button:has-text("Apply")').first();
            if (await applyBtn.isVisible({ timeout: 2000 })) {
                await applyBtn.click({ timeout: 2000 }).catch(() => null);
            }
        } catch {
            // Continue
        }

        await page.waitForSelector('form#application_form, form[action*="greenhouse"], form, #app_form, #grnhse_iframe', { timeout: 15000 }).catch(() => {});

        const challenge = await this.detectSecurityChallenge(page);
        if (challenge.detected) {
            return {
                success: false,
                status: "WAITING_FOR_USER",
                requiresHumanVerification: true,
                verificationType: challenge.type,
                failureReason: challenge.message,
                metadata: { url: context.url, ats: "Greenhouse" },
            };
        }

        return this.runFormPipeline(page, context);
    }
}

export const greenhouseAdapter = new GreenhouseAdapter();
export default greenhouseAdapter;
