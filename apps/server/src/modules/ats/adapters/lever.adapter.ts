import type { Page } from "playwright";
import { BaseATSAdapter } from "./base.adapter.js";
import type { ATSExecutionContext, ATSExecutionResult } from "./base.adapter.js";

export class LeverAdapter extends BaseATSAdapter {
    readonly providerName = "Lever";

    canHandle(url: string): boolean {
        const u = url.toLowerCase();
        return u.includes("jobs.lever.co") || u.includes("lever.co");
    }

    async execute(page: Page, context: ATSExecutionContext): Promise<ATSExecutionResult> {
        console.log(`[LeverAdapter] 🎯 Launching execution on ${context.url} for ${context.jobTitle}`);

        const applyUrl = context.url.endsWith("/apply") ? context.url : `${context.url.replace(/\/$/, "")}/apply`;
        await page.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

        await page.waitForSelector('form#application-form, .application-form, form', { timeout: 15000 }).catch(() => {});

        const challenge = await this.detectSecurityChallenge(page);
        if (challenge.detected) {
            return {
                success: false,
                status: "WAITING_FOR_USER",
                requiresHumanVerification: true,
                verificationType: challenge.type,
                failureReason: challenge.message,
                metadata: { url: context.url, ats: "Lever" },
            };
        }

        return this.runFormPipeline(page, context);
    }
}

export const leverAdapter = new LeverAdapter();
export default leverAdapter;
