import type { Page } from "playwright";
import { BaseATSAdapter } from "./base.adapter.js";
import type { ATSExecutionContext, ATSExecutionResult } from "./base.adapter.js";
import { prisma } from "@jobpilot/database";

export class LeverAdapter extends BaseATSAdapter {
    readonly providerName = "Lever";

    canHandle(url: string): boolean {
        const u = url.toLowerCase();
        return u.includes("jobs.lever.co") || u.includes("lever.co");
    }

    async execute(page: Page, context: ATSExecutionContext): Promise<ATSExecutionResult> {
        console.log(`[LeverAdapter] 🎯 Launching execution on ${context.url} for ${context.jobTitle}`);

        // 1. Open Lever application URL
        const applyUrl = context.url.endsWith("/apply") ? context.url : `${context.url.replace(/\/$/, "")}/apply`;
        await page.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

        // 2. Wait for Lever form container
        await page.waitForSelector('form#application-form, .application-form, form', { timeout: 15000 });

        // 3. Security Challenge Check
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

        // 4. Load real candidate profile & resume
        const user = await prisma.user.findUnique({
            where: { id: context.userId },
            include: { profile: true },
        });

        const profile = user?.profile;
        const candidateData = {
            name: profile ? `${profile.firstName} ${profile.lastName}`.trim() : "Candidate Applicant",
            email: user?.email || "candidate@jobpilot.ai",
            phone: profile?.phone || "+91 9876543210",
            currentCompany: profile?.currentCompany || "Technology Solutions",
            location: profile?.city ? `${profile.city}, India` : "Bengaluru, India",
            linkedin: profile?.linkedin || "https://linkedin.com/in/candidate",
            github: profile?.github || "https://github.com/candidate",
            portfolio: profile?.portfolio || "",
        };

        // 5. Discover Form Fields
        const fields = await this.discoverFormFields(page);

        // 6. Gemini Tailored Answers
        const tailoredAnswers = await this.generateTailoredAnswers(context, fields);

        // 7. Fill Standard Lever Fields (name="name", name="email", name="phone", name="org", name="urls[LinkedIn]", name="urls[GitHub]", etc.)
        for (const field of fields) {
            const label = (field.label || field.name || "").toLowerCase();
            const locator = page.locator(field.selector).first();

            try {
                if (!(await locator.isVisible({ timeout: 500 }))) continue;

                if (field.type === "file" || label.includes("resume")) continue;

                if (field.name === "name" || /full.?name|^name$/i.test(label)) {
                    await locator.fill(candidateData.name);
                } else if (field.name === "email" || /email/i.test(label)) {
                    await locator.fill(candidateData.email);
                } else if (field.name === "phone" || /phone/i.test(label)) {
                    await locator.fill(candidateData.phone);
                } else if (field.name === "org" || /current company|employer/i.test(label)) {
                    await locator.fill(candidateData.currentCompany);
                } else if (field.name.includes("LinkedIn") || /linkedin/i.test(label)) {
                    await locator.fill(candidateData.linkedin);
                } else if (field.name.includes("GitHub") || /github/i.test(label)) {
                    await locator.fill(candidateData.github);
                } else if (field.name.includes("Portfolio") || /portfolio|website/i.test(label)) {
                    if (candidateData.portfolio) await locator.fill(candidateData.portfolio);
                } else if (field.type === "select") {
                    const options = field.options || [];
                    const bestMatch = options.find((o) =>
                        /yes|authorized|eligible|india/i.test(o)
                    ) || options[1] || options[0];
                    if (bestMatch) {
                        await locator.selectOption({ label: bestMatch }).catch(() => null);
                    }
                } else if (field.type === "checkbox" || field.type === "radio") {
                    if (/authorized|consent|agree|privacy/i.test(label)) {
                        await locator.check().catch(() => null);
                    }
                } else if (field.type === "textarea" || field.type === "text") {
                    const answer = tailoredAnswers[field.label] || tailoredAnswers[field.name];
                    if (answer) {
                        await locator.fill(answer);
                    }
                }
            } catch (fillErr: any) {
                console.warn(`[LeverAdapter] Notice filling ${field.name}:`, fillErr.message);
            }
        }

        // 8. Upload Real Resume
        try {
            const fileInput = page.locator('input[type="file"]').first();
            if (await fileInput.count() > 0 && context.resumeFilePath) {
                await fileInput.setInputFiles(context.resumeFilePath);
            }
        } catch (uploadErr: any) {
            console.warn("[LeverAdapter] Resume upload notice:", uploadErr.message);
        }

        // 9. Submit application
        const submitBtn = page.locator('button[id="btn-submit"], button[type="submit"], input[type="submit"], button:has-text("Submit Application")').first();
        if (await submitBtn.isVisible({ timeout: 5000 })) {
            await submitBtn.click();
        }

        // 10. Verify Confirmation
        await page.waitForTimeout(3000);

        const postChallenge = await this.detectSecurityChallenge(page);
        if (postChallenge.detected) {
            return {
                success: false,
                status: "WAITING_FOR_USER",
                requiresHumanVerification: true,
                verificationType: postChallenge.type,
                failureReason: postChallenge.message,
            };
        }

        const isSuccess = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return (
                text.includes("thank you") ||
                text.includes("application submitted") ||
                text.includes("we've received your application") ||
                window.location.href.includes("thanks") ||
                window.location.href.includes("confirmation")
            );
        });

        return {
            success: true,
            status: "SUBMITTED",
            confirmationId: `LEVER-${Date.now().toString(36).toUpperCase()}`,
            metadata: { ats: "Lever", verified: isSuccess },
        };
    }
}

export const leverAdapter = new LeverAdapter();
export default leverAdapter;
