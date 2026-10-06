import type { Page } from "playwright";

import candidateTool from "../candidate/candidate.tool.js";
import candidateService from "../candidate/candidate.service.js";
import formQuestionAIService from "../../ai/form-question-ai.service.js";

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
    /**
     * Navigates to the job URL, following redirects and clicking 'Apply' buttons if on a landing page.
     */
    async prepareAndNavigate(
        page: Page,
        targetUrl: string,
    ): Promise<{ activePage: Page; redirectedUrl: string }> {
        let activePage = page;

        // Listen for popups in case "Apply" opens a new tab
        const popupPromise = page.context().waitForEvent("page", { timeout: 3000 }).catch(() => null);

        await activePage.goto(targetUrl, {
            waitUntil: "domcontentloaded",
            timeout: 35000,
        });

        // Give redirects a moment to settle
        await activePage.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});

        const popup = await popupPromise;
        if (popup) {
            await popup.waitForLoadState("domcontentloaded").catch(() => {});
            activePage = popup;
        }

        // Check if application form fields are already present
        const currentInputs = await activePage.locator("input:not([type='hidden']), textarea, select").count();

        // If no application inputs exist yet, we might be on a job details landing page with an 'Apply' button
        if (currentInputs < 2) {
            const applyButtons = activePage.locator(
                'a:has-text("Apply Now"), button:has-text("Apply Now"), ' +
                'a:has-text("Apply for this job"), button:has-text("Apply for this job"), ' +
                'a:has-text("Easy Apply"), button:has-text("Easy Apply"), ' +
                'a[href*="apply" i], button[data-automation-id*="apply" i], ' +
                'a:has-text("Apply"), button:has-text("Apply")'
            );

            const count = await applyButtons.count();
            if (count > 0) {
                const firstApply = applyButtons.first();
                const popupOnApply = activePage.context().waitForEvent("page", { timeout: 4000 }).catch(() => null);

                try {
                    await firstApply.click({ timeout: 5000 });
                    await activePage.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});

                    const applyPopup = await popupOnApply;
                    if (applyPopup) {
                        await applyPopup.waitForLoadState("domcontentloaded").catch(() => {});
                        activePage = applyPopup;
                    }
                } catch {
                    // Ignore click error and proceed with page as-is
                }
            }
        }

        return {
            activePage,
            redirectedUrl: activePage.url(),
        };
    }

    async detectFields(
        page: Page,
    ): Promise<FormField[]> {
        const fields = await page
            .locator("input, textarea, select")
            .evaluateAll((elements) =>
                elements.map((element) => {
                    const input = element as HTMLInputElement;
                    const id = input.id;
                    const name = input.name || input.getAttribute("aria-label") || "";
                    const type = input.type || input.tagName.toLowerCase();

                    let label = "";
                    if (id) {
                        const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
                        if (lbl) label = lbl.textContent || "";
                    }
                    if (!label && input.getAttribute("aria-label")) {
                        label = input.getAttribute("aria-label") || "";
                    }
                    if (!label && input.getAttribute("placeholder")) {
                        label = input.getAttribute("placeholder") || "";
                    }
                    if (!label && input.closest("label")) {
                        label = input.closest("label")?.textContent || "";
                    }

                    return {
                        selector: id
                            ? `#${CSS.escape(id)}`
                            : name
                              ? `${input.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`
                              : input.tagName.toLowerCase(),
                        name,
                        type,
                        label: label.trim().replace(/\s+/g, " "),
                        required: input.required || input.getAttribute("aria-required") === "true",
                    };
                }),
            );

        return fields;
    }

    async fillFields(
        page: Page,
        fields: FormField[],
        userId: string,
        resumeId?: string,
    ): Promise<FormFillResult[]> {
        const results: FormFillResult[] = [];

        const profileContext = await candidateService.buildContext(
            userId,
            resumeId,
        );
        const resumeText = profileContext.resumeText || undefined;

        for (const field of fields) {
            if (
                field.type === "hidden" ||
                field.type === "submit" ||
                field.type === "button"
            ) {
                continue;
            }

            let answer =
                await candidateTool.answer(
                    userId,
                    field.name,
                    field.label,
                    resumeId,
                );

            if (
                !answer.value &&
                answer.source === "UNKNOWN"
            ) {
                const aiAnswer =
                    await formQuestionAIService.answer({
                        userId,
                        profileContext,
                        resumeText,
                        question:
                            field.label ||
                            field.name,
                        fieldLabel: field.label,
                        fieldType: field.type,
                    });

                if (
                    aiAnswer.grounded &&
                    aiAnswer.value
                ) {
                    answer = {
                        value: aiAnswer.value,
                        source: "RESUME",
                        confidence: "MEDIUM",
                    };
                }
            }

            if (!answer.value) {
                results.push({
                    selector:
                        field.selector,
                    name: field.name,
                    value: "",
                    filled: false,
                    reason:
                        "Neither profile mapper nor grounded AI could provide an answer.",
                });

                continue;
            }

            const locator =
                page.locator(
                    field.selector,
                ).first();

            try {
                if (
                    field.type === "checkbox"
                ) {
                    const value = answer.value.toLowerCase();
                    const checked =
                        value === "true" ||
                        value === "yes" ||
                        value === "1" ||
                        value === "on";

                    await locator.setChecked(checked).catch(() => locator.click().catch(() => {}));
                } else if (
                    field.type === "radio"
                ) {
                    // Look for the specific radio matching this answer
                    const radioVal = answer.value.toLowerCase();
                    const groupRadios = page.locator(`input[type="radio"][name="${CSS.escape(field.name)}"]`);
                    const radioCount = await groupRadios.count().catch(() => 0);

                    let checkedOne = false;
                    for (let r = 0; r < radioCount; r++) {
                        const rEl = groupRadios.nth(r);
                        const rVal = (await rEl.getAttribute("value") || "").toLowerCase();
                        if (rVal === radioVal || (radioVal === "yes" && (rVal === "1" || rVal === "true")) || (radioVal === "no" && (rVal === "0" || rVal === "false"))) {
                            await rEl.check().catch(() => rEl.click().catch(() => {}));
                            checkedOne = true;
                            break;
                        }
                    }

                    if (!checkedOne) {
                        await locator.check().catch(() => locator.click().catch(() => {}));
                    }
                } else if (
                    field.type === "select"
                ) {
                    // Try by label, then value, then partial option text
                    let selected = false;
                    try {
                        await locator.selectOption({ label: answer.value });
                        selected = true;
                    } catch {
                        try {
                            await locator.selectOption({ value: answer.value });
                            selected = true;
                        } catch {
                            // Find option containing the answer string
                            const options = await locator.locator("option").all();
                            for (const opt of options) {
                                const text = (await opt.innerText()).toLowerCase();
                                if (text.includes(answer.value.toLowerCase())) {
                                    const optVal = await opt.getAttribute("value");
                                    if (optVal) {
                                        await locator.selectOption({ value: optVal });
                                        selected = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                } else {
                    await locator.fill(answer.value).catch(async () => {
                        // Fallback type
                        await locator.click().catch(() => {});
                        await locator.pressSequentially(answer.value).catch(() => {});
                    });
                }

                results.push({
                    selector: field.selector,
                    name: field.name,
                    value: answer.value,
                    filled: true,
                });
            } catch (err: any) {
                results.push({
                    selector: field.selector,
                    name: field.name,
                    value: answer.value,
                    filled: false,
                    reason: err.message,
                });
            }
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