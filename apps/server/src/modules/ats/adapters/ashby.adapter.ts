import type { Page } from "playwright";
import { BaseATSAdapter } from "./base.adapter.js";
import type { ATSExecutionContext, ATSExecutionResult } from "./base.adapter.js";

export class AshbyAdapter extends BaseATSAdapter {
    readonly providerName = "Ashby";

    canHandle(url: string): boolean {
        const u = url.toLowerCase();
        return u.includes("ashbyhq.com") || u.includes("jobs.ashbyhq.com");
    }

    async execute(page: Page, context: ATSExecutionContext): Promise<ATSExecutionResult> {
        console.log(`[AshbyAdapter] 🎯 Launching execution on ${context.url} for ${context.jobTitle}`);

        await page.goto(context.url, { waitUntil: "domcontentloaded", timeout: 45000 });

        try {
            const applyBtn = page.locator('button:has-text("Apply for this job"), button:has-text("Apply Now"), a[href*="application"]').first();
            if (await applyBtn.isVisible({ timeout: 2500 })) {
                await applyBtn.click({ timeout: 2000 }).catch(() => null);
            }
        } catch {
            // Continue
        }

        await page.waitForSelector('form, [data-testid="application-form"], .ashby-application-form', { timeout: 15000 }).catch(() => {});

        const challenge = await this.detectSecurityChallenge(page);
        if (challenge.detected) {
            return {
                success: false,
                status: "WAITING_FOR_USER",
                requiresHumanVerification: true,
                verificationType: challenge.type,
                failureReason: challenge.message,
                metadata: { url: context.url, ats: "Ashby" },
            };
        }

        return this.runFormPipeline(page, context);
    }
}

export const ashbyAdapter = new AshbyAdapter();
export default ashbyAdapter;
