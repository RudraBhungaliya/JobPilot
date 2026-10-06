import type { Page } from "playwright";
import { tailoringService } from "../../ai/tailoring.service.js";

export interface ATSFormField {
    selector: string;
    name: string;
    id?: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
}

export interface ATSExecutionContext {
    userId: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
    url: string;
    resumeId?: string;
    resumeFilePath?: string;
    candidateProfile?: any;
}

export interface ATSExecutionResult {
    success: boolean;
    status: "SUBMITTED" | "WAITING_FOR_USER" | "FAILED";
    confirmationId?: string;
    requiresHumanVerification?: boolean;
    verificationType?: string;
    failureReason?: string;
    metadata?: Record<string, any>;
}

export abstract class BaseATSAdapter {
    abstract readonly providerName: string;

    /**
     * Checks if this adapter supports the given application URL
     */
    abstract canHandle(url: string): boolean;

    /**
     * Execute full application lifecycle on the page
     */
    abstract execute(page: Page, context: ATSExecutionContext): Promise<ATSExecutionResult>;

    /**
     * Common Human Verification / CAPTCHA / Cloudflare Turnstile detector
     */
    async detectSecurityChallenge(page: Page): Promise<{ detected: boolean; type?: string; message?: string }> {
        const challengeSelectors = [
            { selector: 'iframe[src*="recaptcha"], .g-recaptcha, [data-sitekey]', type: "reCAPTCHA", message: "Google reCAPTCHA verification detected." },
            { selector: 'iframe[src*="hcaptcha"], .h-captcha', type: "hCaptcha", message: "hCaptcha verification detected." },
            { selector: 'iframe[src*="turnstile"], iframe[src*="challenges.cloudflare.com"], .cf-turnstile, #challenge-stage', type: "Cloudflare Turnstile", message: "Cloudflare Turnstile challenge detected." },
            { selector: 'iframe[src*="arkoselabs"], iframe[src*="funcaptcha"]', type: "Arkose Labs", message: "Arkose Labs challenge detected." },
        ];

        for (const item of challengeSelectors) {
            try {
                if (await page.locator(item.selector).count() > 0) {
                    return { detected: true, type: item.type, message: item.message };
                }
            } catch {
                // Ignore
            }
        }

        try {
            const body = (await page.locator("body").innerText()).toLowerCase();
            if (
                body.includes("verify you are human") ||
                body.includes("security verification") ||
                body.includes("complete the captcha") ||
                body.includes("enter verification code")
            ) {
                return { detected: true, type: "SECURITY_CHECKPOINT", message: "Interactive security verification checkpoint detected." };
            }
        } catch {
            // Ignore
        }

        return { detected: false };
    }

    /**
     * Common form field discovery using actual DOM inspection with stable labels & attributes
     */
    async discoverFormFields(page: Page): Promise<ATSFormField[]> {
        return page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll("input, textarea, select"));
            const fields: ATSFormField[] = [];

            for (const el of elements) {
                const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                if (input.type === "hidden" || input.type === "submit" || input.type === "button") continue;

                // Find associated label
                let label = "";
                if (input.id) {
                    const labelEl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
                    if (labelEl) label = labelEl.textContent || "";
                }
                if (!label) {
                    const parentLabel = input.closest("label");
                    if (parentLabel) label = parentLabel.textContent || "";
                }
                if (!label) {
                    const placeholder = "placeholder" in input ? (input as HTMLInputElement).placeholder : "";
                    label = input.getAttribute("aria-label") || placeholder || input.name || "";
                }

                const options: string[] = [];
                if (input.tagName.toLowerCase() === "select") {
                    const select = input as HTMLSelectElement;
                    for (const opt of Array.from(select.options)) {
                        if (opt.value && opt.text) options.push(opt.text.trim());
                    }
                }

                let selector = "";
                if (input.id) {
                    selector = `#${CSS.escape(input.id)}`;
                } else if (input.name) {
                    selector = `${input.tagName.toLowerCase()}[name="${CSS.escape(input.name)}"]`;
                } else {
                    selector = input.tagName.toLowerCase();
                }

                fields.push({
                    selector,
                    name: input.name || "",
                    id: input.id || "",
                    type: input.type || input.tagName.toLowerCase(),
                    label: label.trim(),
                    required: input.required || input.getAttribute("aria-required") === "true",
                    options,
                });
            }

            return fields;
        });
    }

    /**
     * Map candidate answers using Gemini Tailoring engine and Candidate Profile
     */
    async generateTailoredAnswers(context: ATSExecutionContext, fields: ATSFormField[]): Promise<Record<string, string>> {
        const customQuestions = fields
            .filter((f) => f.type === "textarea" || f.type === "text" || f.type === "select")
            .map((f) => ({
                question: f.label || f.name,
                label: f.label,
                type: f.type,
                options: f.options,
            }));

        const tailoring = await tailoringService.tailorForJob({
            userId: context.userId,
            jobId: context.jobId,
            resumeId: context.resumeId,
            jobTitle: context.jobTitle,
            companyName: context.companyName,
            customQuestions,
        });

        return tailoring.questionAnswers;
    }
}
