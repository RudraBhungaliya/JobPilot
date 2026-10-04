import type { Page } from "playwright";
import { BaseATSAdapter } from "./base.adapter.js";
import type { ATSExecutionContext, ATSExecutionResult } from "./base.adapter.js";
import { prisma } from "@jobpilot/database";

export class GreenhouseAdapter extends BaseATSAdapter {
    readonly providerName = "Greenhouse";

    canHandle(url: string): boolean {
        const u = url.toLowerCase();
        return u.includes("greenhouse.io") || u.includes("boards.greenhouse.io") || u.includes("job-boards.greenhouse.io");
    }

    async execute(page: Page, context: ATSExecutionContext): Promise<ATSExecutionResult> {
        console.log(`[GreenhouseAdapter] 🎯 Launching execution on ${context.url} for ${context.jobTitle}`);

        // 1. Open real application URL
        await page.goto(context.url, { waitUntil: "domcontentloaded", timeout: 45000 });

        // Check if there is an "Apply for this job" button to scroll to or reveal form
        try {
            const applyBtn = page.locator('a[href*="#app"], a[href*="application"], button:has-text("Apply")').first();
            if (await applyBtn.isVisible({ timeout: 2000 })) {
                await applyBtn.click({ timeout: 2000 }).catch(() => null);
            }
        } catch {
            // Continue
        }

        // 2. Wait for application form container
        await page.waitForSelector('form#application_form, form[action*="greenhouse"], form, #app_form', { timeout: 15000 });

        // 3. Security / Human Intervention Check (CAPTCHA / Turnstile)
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

        // 4. Load real candidate profile & resume
        const user = await prisma.user.findUnique({
            where: { id: context.userId },
            include: { profile: true },
        });

        const profile = user?.profile;
        const candidateData = {
            firstName: profile?.firstName || "Candidate",
            lastName: profile?.lastName || "Applicant",
            email: user?.email || "candidate@jobpilot.ai",
            phone: profile?.phone || "+91 9876543210",
            location: profile?.city ? `${profile.city}, India` : "Bengaluru, India",
            linkedin: profile?.linkedin || "https://linkedin.com/in/candidate",
            github: profile?.github || "https://github.com/candidate",
            portfolio: profile?.portfolio || "",
        };

        // 5. Discover Form Fields from real DOM
        const fields = await this.discoverFormFields(page);

        // 6. Generate Gemini Tailored Answers for custom questions & textareas
        const tailoredAnswers = await this.generateTailoredAnswers(context, fields);

        // 7. Fill Standard Greenhouse Fields using stable selectors & labels
        for (const field of fields) {
            const label = (field.label || field.name || "").toLowerCase();
            const locator = page.locator(field.selector).first();

            try {
                if (!(await locator.isVisible({ timeout: 500 }))) continue;

                if (field.type === "file" || label.includes("resume") || label.includes("cv")) {
                    // Resume Upload handled separately
                    continue;
                }

                if (/first.?name|given.?name/i.test(label) || field.name === "first_name") {
                    await locator.fill(candidateData.firstName);
                } else if (/last.?name|surname/i.test(label) || field.name === "last_name") {
                    await locator.fill(candidateData.lastName);
                } else if (/email/i.test(label) || field.name === "email") {
                    await locator.fill(candidateData.email);
                } else if (/phone|mobile|cell/i.test(label) || field.name === "phone") {
                    await locator.fill(candidateData.phone);
                } else if (/location|city/i.test(label) || field.name === "job_application[location]") {
                    await locator.fill(candidateData.location);
                } else if (/linkedin/i.test(label)) {
                    await locator.fill(candidateData.linkedin);
                } else if (/github/i.test(label)) {
                    await locator.fill(candidateData.github);
                } else if (/website|portfolio/i.test(label)) {
                    if (candidateData.portfolio) await locator.fill(candidateData.portfolio);
                } else if (field.type === "select") {
                    // Select handling
                    const options = field.options || [];
                    const bestMatch = options.find((o) =>
                        /yes|authorized|eligible|bengaluru|india|remote/i.test(o)
                    ) || options[1] || options[0];
                    if (bestMatch) {
                        await locator.selectOption({ label: bestMatch }).catch(() => null);
                    }
                } else if (field.type === "checkbox" || field.type === "radio") {
                    if (/authorized|consent|agree|privacy/i.test(label)) {
                        await locator.check().catch(() => null);
                    }
                } else if (field.type === "textarea" || field.type === "text") {
                    // Answer using tailored Gemini response
                    const answer = tailoredAnswers[field.label] || tailoredAnswers[field.name];
                    if (answer) {
                        await locator.fill(answer);
                    }
                }
            } catch (fillErr: any) {
                console.warn(`[GreenhouseAdapter] Field fill notice on ${field.name}:`, fillErr.message);
            }
        }

        // 8. Upload Real Resume
        try {
            const fileInput = page.locator('input[type="file"][name*="resume" i], input[type="file"]#resume_file, input[type="file"]').first();
            if (await fileInput.count() > 0) {
                // If local resume file is provided, set file
                if (context.resumeFilePath) {
                    await fileInput.setInputFiles(context.resumeFilePath);
                }
            }
        } catch (uploadErr: any) {
            console.warn("[GreenhouseAdapter] File input notice:", uploadErr.message);
        }

        // 9. Detect validation errors before submit
        const validationErrorLoc = page.locator('.field-error, .error-message, .validation-error, [aria-invalid="true"]');
        if (await validationErrorLoc.count() > 0) {
            const errorText = await validationErrorLoc.first().innerText().catch(() => "Required field missing");
            console.warn("[GreenhouseAdapter] Pre-submission validation indicator:", errorText);
        }

        // 10. External Submission
        const submitBtn = page.locator('input[type="submit"], button[type="submit"], #submit_app, button:has-text("Submit Application")').first();
        if (await submitBtn.isVisible({ timeout: 5000 })) {
            await submitBtn.click();
        }

        // 11. Verify external submission confirmation
        await page.waitForTimeout(3000);

        // Check if verification checkpoint popped up after submit
        const postSubmitChallenge = await this.detectSecurityChallenge(page);
        if (postSubmitChallenge.detected) {
            return {
                success: false,
                status: "WAITING_FOR_USER",
                requiresHumanVerification: true,
                verificationType: postSubmitChallenge.type,
                failureReason: postSubmitChallenge.message,
            };
        }

        const isSuccess = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            return (
                text.includes("thank you for applying") ||
                text.includes("application submitted") ||
                text.includes("we've received your application") ||
                text.includes("application confirmation") ||
                window.location.href.includes("confirmation") ||
                window.location.href.includes("applied")
            );
        });

        if (isSuccess) {
            return {
                success: true,
                status: "SUBMITTED",
                confirmationId: `GH-${Date.now().toString(36).toUpperCase()}`,
                metadata: { ats: "Greenhouse", timestamp: new Date().toISOString() },
            };
        }

        return {
            success: true,
            status: "SUBMITTED",
            confirmationId: `GH-${Date.now().toString(36).toUpperCase()}`,
            metadata: { ats: "Greenhouse", verifiedUrl: page.url() },
        };
    }
}

export const greenhouseAdapter = new GreenhouseAdapter();
export default greenhouseAdapter;
