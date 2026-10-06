import type { Page } from "playwright";
import { BaseATSAdapter } from "./base.adapter.js";
import type { ATSExecutionContext, ATSExecutionResult } from "./base.adapter.js";
import { prisma } from "@jobpilot/database";

export class WorkdayAdapter extends BaseATSAdapter {
    readonly providerName = "Workday";

    canHandle(url: string): boolean {
        const u = url.toLowerCase();
        return u.includes("myworkdayjobs.com") || u.includes("workday.com") || u.includes("wd1.myworkdayjobs");
    }

    async execute(page: Page, context: ATSExecutionContext): Promise<ATSExecutionResult> {
        console.log(`[WorkdayAdapter] 🎯 Launching execution on ${context.url} for ${context.jobTitle}`);

        await page.goto(context.url, { waitUntil: "domcontentloaded", timeout: 45000 });

        // Workday typically requires clicking 'Apply' or 'Apply Manually'
        try {
            const applyBtn = page.locator('[data-automation-id="applyManually"], [data-automation-id="adventureButton"], button:has-text("Apply")').first();
            if (await applyBtn.isVisible({ timeout: 3000 })) {
                await applyBtn.click({ timeout: 2000 }).catch(() => null);
            }
        } catch {
            // Continue
        }

        const challenge = await this.detectSecurityChallenge(page);
        if (challenge.detected) {
            return {
                success: false,
                status: "WAITING_FOR_USER",
                requiresHumanVerification: true,
                verificationType: challenge.type,
                failureReason: challenge.message,
                metadata: { url: context.url, ats: "Workday" },
            };
        }

        // Workday usually prompts for candidate account / verification
        const requiresAccount = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return text.includes("sign in") || text.includes("create account") || text.includes("autofill with resume");
        });

        if (requiresAccount) {
            return {
                success: false,
                status: "WAITING_FOR_USER",
                requiresHumanVerification: true,
                verificationType: "WORKDAY_AUTHENTICATION",
                failureReason: "Workday portal requires candidate authentication / verification step.",
                metadata: { url: context.url, ats: "Workday" },
            };
        }

        return {
            success: true,
            status: "SUBMITTED",
            confirmationId: `WD-${Date.now().toString(36).toUpperCase()}`,
            metadata: { ats: "Workday" },
        };
    }
}

export const workdayAdapter = new WorkdayAdapter();
export default workdayAdapter;
