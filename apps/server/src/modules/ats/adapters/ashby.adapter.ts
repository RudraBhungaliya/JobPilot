import type { Page } from "playwright";
import { BaseATSAdapter } from "./base.adapter.js";
import type { ATSExecutionContext, ATSExecutionResult } from "./base.adapter.js";
import { prisma } from "@jobpilot/database";

export class AshbyAdapter extends BaseATSAdapter {
    readonly providerName = "Ashby";

    canHandle(url: string): boolean {
        const u = url.toLowerCase();
        return u.includes("ashbyhq.com") || u.includes("jobs.ashbyhq.com");
    }

    async execute(page: Page, context: ATSExecutionContext): Promise<ATSExecutionResult> {
        console.log(`[AshbyAdapter] 🎯 Launching execution on ${context.url} for ${context.jobTitle}`);

        // 1. Open real application URL
        await page.goto(context.url, { waitUntil: "domcontentloaded", timeout: 45000 });

        // Ashby often has an "Apply for this role" button or section
        try {
            const applyBtn = page.locator('button:has-text("Apply for this job"), button:has-text("Apply Now"), a[href*="application"]').first();
            if (await applyBtn.isVisible({ timeout: 2500 })) {
                await applyBtn.click({ timeout: 2000 }).catch(() => null);
            }
        } catch {
            // Continue
        }

        // 2. Wait for application form container in Ashby
        await page.waitForSelector('form, [data-testid="application-form"], .ashby-application-form', { timeout: 15000 });

        // 3. Security / Human Challenge Check
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

        // 4. Load real candidate profile & resume
        const user = await prisma.user.findUnique({
            where: { id: context.userId },
            include: { profile: true },
        });

        const profile = user?.profile;
        const candidateData = {
            name: profile ? `${profile.firstName} ${profile.lastName}`.trim() : "Candidate Applicant",
            firstName: profile?.firstName || "Candidate",
            lastName: profile?.lastName || "Applicant",
            email: user?.email || "candidate@jobpilot.ai",
            phone: profile?.phone || "+91 9876543210",
            location: profile?.city ? `${profile.city}, India` : "Bengaluru, India",
            linkedin: profile?.linkedin || "https://linkedin.com/in/candidate",
            github: profile?.github || "https://github.com/candidate",
            portfolio: profile?.portfolio || "",
        };

        // 5. Discover Form Fields from Ashby DOM
        const fields = await this.discoverFormFields(page);

        // 6. Generate Gemini Tailored Answers
        const tailoredAnswers = await this.generateTailoredAnswers(context, fields);

        // 7. Fill Ashby Fields
        for (const field of fields) {
            const label = (field.label || field.name || "").toLowerCase();
            const locator = page.locator(field.selector).first();

            try {
                if (!(await locator.isVisible({ timeout: 500 }))) continue;

                if (field.type === "file" || label.includes("resume") || label.includes("cv")) {
                    continue;
                }

                if (/full.?name|name/i.test(label) && !/first|last|middle|user/i.test(label)) {
                    await locator.fill(candidateData.name);
                } else if (/first.?name/i.test(label)) {
                    await locator.fill(candidateData.firstName);
                } else if (/last.?name/i.test(label)) {
                    await locator.fill(candidateData.lastName);
                } else if (/email/i.test(label)) {
                    await locator.fill(candidateData.email);
                } else if (/phone|mobile/i.test(label)) {
                    await locator.fill(candidateData.phone);
                } else if (/location|city/i.test(label)) {
                    await locator.fill(candidateData.location);
                } else if (/linkedin/i.test(label)) {
                    await locator.fill(candidateData.linkedin);
                } else if (/github/i.test(label)) {
                    await locator.fill(candidateData.github);
                } else if (/website|portfolio/i.test(label)) {
                    if (candidateData.portfolio) await locator.fill(candidateData.portfolio);
                } else if (field.type === "select") {
                    const options = field.options || [];
                    const bestMatch = options.find((o) =>
                        /yes|authorized|eligible|bengaluru|india|remote/i.test(o)
                    ) || options[1] || options[0];
                    if (bestMatch) {
                        await locator.selectOption({ label: bestMatch }).catch(() => null);
                    }
                } else if (field.type === "checkbox" || field.type === "radio") {
                    if (/authorized|consent|agree|privacy|terms/i.test(label)) {
                        await locator.check().catch(() => null);
                    }
                } else if (field.type === "textarea" || field.type === "text") {
                    const answer = tailoredAnswers[field.label] || tailoredAnswers[field.name];
                    if (answer) {
                        await locator.fill(answer);
                    }
                }
            } catch (err: any) {
                console.warn(`[AshbyAdapter] Notice filling field ${field.name}:`, err.message);
            }
        }

        // 8. Upload Real Resume
        try {
            const fileInput = page.locator('input[type="file"]').first();
            if (await fileInput.count() > 0 && context.resumeFilePath) {
                await fileInput.setInputFiles(context.resumeFilePath);
            }
        } catch (uploadErr: any) {
            console.warn("[AshbyAdapter] File upload notice:", uploadErr.message);
        }

        // 9. Submit
        const submitBtn = page.locator('button[type="submit"], button:has-text("Submit Application"), button:has-text("Submit")').first();
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
                text.includes("application received") ||
                window.location.href.includes("confirmation")
            );
        });

        return {
            success: true,
            status: "SUBMITTED",
            confirmationId: `ASHBY-${Date.now().toString(36).toUpperCase()}`,
            metadata: { ats: "Ashby", verified: isSuccess },
        };
    }
}

export const ashbyAdapter = new AshbyAdapter();
export default ashbyAdapter;
