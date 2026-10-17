import type { Page } from "playwright";
import { BaseATSAdapter } from "./base.adapter.js";
import type { ATSExecutionContext, ATSExecutionResult } from "./base.adapter.js";
import { prisma } from "@jobpilot/database";

export class GenericATSAdapter extends BaseATSAdapter {
    readonly providerName = "GenericATS";

    canHandle(_url: string): boolean {
        return true; // Fallback adapter for all career sites
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
        const candidateData = {
            name: `${profile.firstName} ${profile.lastName}`.trim(),
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email || user.email,
            phone: profile.phone,
            location: [profile.city, profile.state, profile.country].filter(Boolean).join(", "),
            linkedin: profile.linkedin || "",
            github: profile.github || "",
            portfolio: profile.portfolio || "",
        };

        const fields = await this.discoverFormFields(page);
        const tailoredAnswers = await this.generateTailoredAnswers(context, fields);

        for (const field of fields) {
            const label = (field.label || field.name || "").toLowerCase();
            const locator = page.locator(field.selector).first();

            try {
                if (!(await locator.isVisible({ timeout: 500 }))) continue;

                if (field.type === "file") continue;

                if (/first.?name/i.test(label)) {
                    await locator.fill(candidateData.firstName);
                } else if (/last.?name/i.test(label)) {
                    await locator.fill(candidateData.lastName);
                } else if (/full.?name|^name$/i.test(label)) {
                    await locator.fill(candidateData.name);
                } else if (/email/i.test(label)) {
                    await locator.fill(candidateData.email);
                } else if (/phone|mobile/i.test(label)) {
                    await locator.fill(candidateData.phone);
                } else if (/linkedin/i.test(label)) {
                    await locator.fill(candidateData.linkedin);
                } else if (/github/i.test(label)) {
                    await locator.fill(candidateData.github);
                } else if (field.type === "checkbox" || field.type === "radio") {
                    if (/terms|agree|consent|certif|confirm|privac|acknowledg/i.test(label) || /authoriz|legally|eligib|work in/i.test(label) || /18 or older|age 18/i.test(label)) {
                        await locator.check().catch(() => locator.click().catch(() => {}));
                    } else if (/sponsor|visa/i.test(label)) {
                        if (profile.sponsorshipRequired) {
                            await locator.check().catch(() => locator.click().catch(() => {}));
                        }
                    }
                } else if (field.type === "textarea" || field.type === "text") {
                    const answer = tailoredAnswers[field.label] || tailoredAnswers[field.name];
                    if (answer) {
                        await locator.fill(answer);
                    }
                }
            } catch {
                // Ignore
            }
        }

        // Upload resume if present
        try {
            const { default: resumeUploadTool } = await import("../../agent/tools/resume-upload.tool.js");
            await resumeUploadTool.upload(page, {
                fileUrl: context.resumeFilePath || "",
                originalName: "resume.pdf",
            });
        } catch {
            // Ignore
        }

        const submitBtn = page.locator('button:has-text("Submit Application"), button:has-text("Submit"), button:has-text("Apply Now"), button:has-text("Apply"), input[type="submit"], button[type="submit"], [data-automation-id="submit-button"]').first();
        if (!(await submitBtn.isVisible({ timeout: 3000 }))) {
            return { success: false, status: "FAILED", failureReason: "No supported submit control was found." };
        }
        await submitBtn.click();

        await page.waitForTimeout(3000);
        const { default: submissionVerificationTool } = await import("../../agent/tools/submission-verification.tool.js");
        const verification = await submissionVerificationTool.verify(page);

        if (verification.verified) {
            const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
            const confirmationMatch = bodyText.match(/(?:confirmation|application|reference)\s*(?:#|id|number|code)?\s*[:\-]?\s*([a-z0-9\-_]{5,32})/i);
            const confId = confirmationMatch ? confirmationMatch[1] : (
                undefined
            );

            return {
                success: true,
                status: "SUBMITTED",
                confirmationId: confId,
                metadata: { ats: "Direct", reason: verification.reason },
            };
        }

        return {
            success: false,
            status: "FAILED",
            failureReason: verification.reason || "Application submission could not be verified on external career site.",
            metadata: { ats: "Direct" },
        };
    }
}

export const genericATSAdapter = new GenericATSAdapter();
export default genericATSAdapter;
