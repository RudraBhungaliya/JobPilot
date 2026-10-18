import type { Page } from "playwright";
import { BaseATSAdapter } from "./base.adapter.js";
import type { ATSExecutionContext, ATSExecutionResult } from "./base.adapter.js";
import { prisma } from "@jobpilot/database";

export class GenericATSAdapter extends BaseATSAdapter {
    readonly providerName = "GenericATS";

    canHandle(_url: string): boolean {
        return true;
    }

    async execute(page: Page, context: ATSExecutionContext): Promise<ATSExecutionResult> {
        console.log(`[GenericATSAdapter] 🎯 Launching execution on ${context.url} for ${context.jobTitle}`);

        await page.goto(context.url, { waitUntil: "domcontentloaded", timeout: 45000 });

        const challenge = await this.detectSecurityChallenge(page);
        if (challenge.detected) {
            return {
                success: false,
                status: "WAITING_FOR_USER",
                requiresHumanVerification: true,
                verificationType: challenge.type,
                failureReason: challenge.message,
                metadata: { url: context.url, ats: "Direct" },
            };
        }

        const user = await prisma.user.findUnique({
            where: { id: context.userId },
            include: { profile: true },
        });

        const profile = user?.profile;
        if (!user || !profile?.firstName || !profile?.lastName || !user.email || !profile.phone) {
            return {
                success: false,
                status: "FAILED",
                failureReason: "A saved candidate name, account email, and phone number are required for form filling.",
            };
        }

        return this.runFormPipeline(page, context);
    }
}

export const genericATSAdapter = new GenericATSAdapter();
export default genericATSAdapter;
