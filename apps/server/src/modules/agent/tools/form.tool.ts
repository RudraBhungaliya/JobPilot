import type { Page } from "playwright";

import candidateTool from "../candidate/candidate.tool.js";

export interface FormField {
    selector: string;
    name: string;
    type: string;
    label: string;
    required: boolean;
}

export interface FormFillResult {
    selector: string;
    name: string;
    value: string;
    filled: boolean;
    reason?: string;
}

class FormTool {
    async detectFields(
        page: Page,
    ): Promise<FormField[]> {
        return page
            .locator("input, textarea, select")
            .evaluateAll((elements) =>
                elements.map((element) => {
                    const input =
                        element as HTMLInputElement;

                    const id = input.id;

                    const label = id
                        ? document.querySelector(
                              `label[for="${CSS.escape(id)}"]`,
                          )?.textContent ?? ""
                        : "";

                    return {
                        selector: id
                            ? `#${CSS.escape(id)}`
                            : input.name
                              ? `${input.tagName.toLowerCase()}[name="${CSS.escape(input.name)}"]`
                              : input.tagName.toLowerCase(),

                        name:
                            input.name ||
                            input.getAttribute(
                                "aria-label",
                            ) ||
                            "",

                        type:
                            input.type ||
                            input.tagName.toLowerCase(),

                        label: label.trim(),

                        required:
                            input.required,
                    };
                }),
            );
    }

    async fillFields(
        page: Page,
        fields: FormField[],
        userId: string,
        resumeId?: string,
    ): Promise<FormFillResult[]> {
        const results: FormFillResult[] = [];

        for (const field of fields) {
            if (
                field.type === "hidden" ||
                field.type === "submit" ||
                field.type === "button"
            ) {
                continue;
            }

            const answer =
                await candidateTool.answer(
                    userId,
                    field.name,
                    field.label,
                    resumeId,
                );

            if (!answer.value) {
                results.push({
                    selector:
                        field.selector,
                    name: field.name,
                    value: "",
                    filled: false,
                    reason:
                        "No verified candidate value available.",
                });

                continue;
            }

            const locator =
                page.locator(
                    field.selector,
                );

            if (
                field.type === "checkbox"
            ) {
                const value =
                    answer.value.toLowerCase();

                const checked =
                    value === "true" ||
                    value === "yes";

                await locator.setChecked(
                    checked,
                );
            } else if (
                field.type === "radio"
            ) {
                await locator.check();
            } else if (
                field.type === "select"
            ) {
                await locator.selectOption({
                    label: answer.value,
                });
            } else {
                await locator.fill(
                    answer.value,
                );
            }

            results.push({
                selector:
                    field.selector,
                name: field.name,
                value: answer.value,
                filled: true,
            });
        }

        return results;
    }

    async detectHumanVerification(
        page: Page,
    ): Promise<{ detected: boolean; type?: string; message?: string }> {
        const captchaSelectors = [
            { selector: 'iframe[src*="recaptcha"], .g-recaptcha, [data-sitekey]', type: "reCAPTCHA", message: "Google reCAPTCHA verification challenge detected." },
            { selector: 'iframe[src*="hcaptcha"], .h-captcha', type: "hCaptcha", message: "hCaptcha human verification challenge detected." },
            { selector: 'iframe[src*="turnstile"], iframe[src*="challenges.cloudflare.com"], .cf-turnstile, #challenge-stage', type: "Cloudflare Turnstile", message: "Cloudflare bot challenge detected." },
            { selector: 'iframe[src*="arkoselabs"], iframe[src*="funcaptcha"]', type: "Arkose", message: "Arkose Labs verification challenge detected." },
        ];

        for (const item of captchaSelectors) {
            try {
                const count = await page.locator(item.selector).count();
                if (count > 0) {
                    return {
                        detected: true,
                        type: item.type,
                        message: item.message,
                    };
                }
            } catch {
                // Ignore locator check failures
            }
        }

        // Check for 2FA / OTP verification inputs
        try {
            const verificationInputs = page.locator(
                'input[name*="otp" i], input[name*="2fa" i], input[name*="verification" i], input[autocomplete="one-time-code"]'
            );
            if ((await verificationInputs.count()) > 0) {
                return {
                    detected: true,
                    type: "2FA_OTP",
                    message: "Two-factor authentication or one-time passcode verification code required.",
                };
            }
        } catch {
            // Ignore
        }

        // Check page body text for human challenge indicators
        try {
            const bodyText = (await page.locator("body").innerText()).toLowerCase();
            if (
                bodyText.includes("verify you are human") ||
                bodyText.includes("complete the security check") ||
                bodyText.includes("please solve the puzzle") ||
                bodyText.includes("security verification required") ||
                bodyText.includes("enter the 6-digit code") ||
                bodyText.includes("enter the code sent to")
            ) {
                return {
                    detected: true,
                    type: "SECURITY_CHALLENGE",
                    message: "Security verification or bot challenge detected on application page.",
                };
            }
        } catch {
            // Ignore
        }

        return { detected: false };
    }

    detectOutsiderRequiredFields(
        fields: FormField[],
        fillResults: FormFillResult[],
    ): { field: FormField; reason: string }[] {
        const missing: { field: FormField; reason: string }[] = [];

        for (const field of fields) {
            const result = fillResults.find(
                (r) => r.selector === field.selector,
            );

            if (!result || !result.filled) {
                const label = (field.label || field.name).toLowerCase();
                const isCustomQuestion =
                    label.includes("why") ||
                    label.includes("tell us") ||
                    label.includes("describe") ||
                    label.includes("explain") ||
                    label.includes("authorized") ||
                    label.includes("clearance") ||
                    label.includes("passcode") ||
                    label.includes("password");

                if (field.required || isCustomQuestion) {
                    missing.push({
                        field,
                        reason:
                            result?.reason ||
                            "Candidate information not available in profile or resume.",
                    });
                }
            }
        }

        return missing;
    }

    async submit(
        page: Page,
    ): Promise<void> {
        const submit = page.locator(
            'button[type="submit"], input[type="submit"]',
        );

        const count =
            await submit.count();

        if (count === 0) {
            throw new Error(
                "Application submit button not found.",
            );
        }

        await submit
            .first()
            .click();

        await page.waitForLoadState(
            "domcontentloaded",
        ).catch(() => {});
    }
}

export default new FormTool();