import type { Frame, Page } from "playwright";

import candidateTool from "../candidate/candidate.tool.js";
import candidateService from "../candidate/candidate.service.js";
import formQuestionAIService from "../../ai/form-question-ai.service.js";
import resumeUploadTool from "./resume-upload.tool.js";
import submissionVerificationTool from "./submission-verification.tool.js";

export type FormPage = Page | Frame;

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

export interface CompleteApplicationOptions {
    userId: string;
    resumeId?: string;
    resume?: {
        fileUrl?: string;
        originalName?: string;
        buffer?: Uint8Array;
        contentType?: string;
    };
    maxSteps?: number;
}

export interface CompleteApplicationResult {
    success: boolean;
    confirmationId?: string;
    confirmationUrl?: string;
    reason?: string;
    filledCount: number;
    fillResults: FormFillResult[];
    missingFields: { field: FormField; reason: string }[];
    humanVerification: { detected: boolean; type?: string; message?: string };
}

type HumanVerificationResult = CompleteApplicationResult["humanVerification"];

const SUBMIT_SELECTOR =
    'button[type="submit"], input[type="submit"], ' +
    'button:has-text("Submit Application"), button:has-text("Submit Your Application"), ' +
    'button:has-text("Send Application"), button:has-text("Submit"), ' +
    'input[value="Submit Application" i], input[value="Submit" i], ' +
    '[data-automation-id="submit-button"], [data-qa="btn-submit"], #submit_app';

const NEXT_SELECTOR =
    'button:has-text("Next"), button:has-text("Continue"), button:has-text("Save and Continue"), ' +
    'button:has-text("Save & Continue"), button:has-text("Next Step"), ' +
    'input[value="Next" i], input[value="Continue" i], ' +
    '[data-automation-id="bottom-navigation-next-button"], [data-automation-id="pageFooterNextButton"]';

const APPLY_SELECTOR =
    'a:has-text("Apply Now"), button:has-text("Apply Now"), ' +
    'a:has-text("Apply for this job"), button:has-text("Apply for this job"), ' +
    'a:has-text("Apply for this role"), button:has-text("Apply for this role"), ' +
    'a:has-text("Easy Apply"), button:has-text("Easy Apply"), ' +
    'button:has-text("Apply Manually"), [data-automation-id="applyManually"], ' +
    'a[href*="apply" i], button[data-automation-id*="apply" i], ' +
    'a:has-text("Apply"), button:has-text("Apply")';

class FormTool {
    /**
     * Navigates to the job URL, following redirects and clicking 'Apply' buttons if on a landing page.
     */
    async prepareAndNavigate(
        page: Page,
        targetUrl: string,
    ): Promise<{ activePage: Page; redirectedUrl: string }> {
        let activePage = page;

        const popupPromise = page.context().waitForEvent("page", { timeout: 3000 }).catch(() => null);

        await activePage.goto(targetUrl, {
            waitUntil: "domcontentloaded",
            timeout: 35000,
        });

        await activePage.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
        await this.dismissInterstitials(activePage);

        const popup = await popupPromise;
        if (popup) {
            await popup.waitForLoadState("domcontentloaded").catch(() => {});
            activePage = popup;
        }

        const currentInputs = await this.countFillableInputs(activePage);

        if (currentInputs < 2) {
            const applyButtons = activePage.locator(APPLY_SELECTOR);
            const count = await applyButtons.count();
            if (count > 0) {
                const firstApply = applyButtons.first();
                const popupOnApply = activePage.context().waitForEvent("page", { timeout: 4000 }).catch(() => null);

                try {
                    await firstApply.click({ timeout: 5000 });
                    await activePage.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
                    await this.dismissInterstitials(activePage);

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

    async dismissInterstitials(page: Page): Promise<void> {
        const banners = page.locator(
            'button:has-text("Accept all"), button:has-text("Accept All"), button:has-text("Accept cookies"), ' +
            'button:has-text("I Accept"), button:has-text("Agree"), button:has-text("Got it"), ' +
            '#onetrust-accept-btn-handler, [id*="cookie"] button:has-text("Accept")',
        );
        if (await banners.first().isVisible().catch(() => false)) {
            await banners.first().click({ timeout: 1500 }).catch(() => {});
        }
    }

    async resolveFormRoot(page: Page): Promise<FormPage> {
        const iframeSelectors = [
            "#grnhse_iframe",
            'iframe[id*="grnhse"]',
            'iframe[src*="greenhouse"]',
            'iframe[src*="lever.co"]',
            'iframe[src*="ashbyhq"]',
            'iframe[src*="myworkday"]',
            'iframe[title*="application" i]',
            'iframe[name*="application" i]',
        ];

        for (const sel of iframeSelectors) {
            try {
                const handle = await page.$(sel);
                if (!handle) continue;
                const frame = await handle.contentFrame();
                if (!frame) continue;
                const count = await frame.locator("input:not([type='hidden']), textarea, select").count().catch(() => 0);
                if (count > 0) return frame;
            } catch {
                // try next iframe
            }
        }

        return page;
    }

    async detectFields(page: FormPage): Promise<FormField[]> {
        const fields = await page
            .locator("input, textarea, select, [contenteditable='true'], [role='combobox']")
            .evaluateAll((elements) =>
                elements.map((element) => {
                    const input = element as HTMLInputElement;
                    const id = input.id;
                    const name = input.name || input.getAttribute("aria-label") || "";
                    const role = input.getAttribute("role") || "";
                    const isContentEditable = input.getAttribute("contenteditable") === "true";
                    const type = isContentEditable
                        ? "contenteditable"
                        : role === "combobox"
                          ? "combobox"
                          : input.type || input.tagName.toLowerCase();

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
                              : isContentEditable
                                ? '[contenteditable="true"]'
                                : role === "combobox"
                                  ? '[role="combobox"]'
                                  : input.tagName.toLowerCase(),
                        name,
                        type,
                        label: label.trim().replace(/\s+/g, " "),
                        required: input.required || input.getAttribute("aria-required") === "true",
                    };
                }),
            );

        return fields.filter((field) => {
            const type = field.type.toLowerCase();
            return type !== "hidden" && type !== "submit" && type !== "button" && type !== "reset" && type !== "image";
        });
    }

    async fillFields(
        page: FormPage,
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
            const type = field.type.toLowerCase();
            if (
                type === "hidden" ||
                type === "submit" ||
                type === "button" ||
                type === "file" ||
                type === "password"
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

            if (!answer.value) {
                const consentValue = this.defaultConsentValue(field);
                if (consentValue) {
                    answer = {
                        value: consentValue,
                        source: "PROFILE",
                        confidence: "HIGH",
                    };
                }
            }

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
                if (type === "checkbox") {
                    const value = answer.value.toLowerCase();
                    const checked =
                        value === "true" ||
                        value === "yes" ||
                        value === "1" ||
                        value === "on" ||
                        value === "agree";

                    await locator.setChecked(checked).catch(() => locator.click().catch(() => {}));
                } else if (type === "radio") {
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
                } else if (type === "select") {
                    let selected = false;
                    try {
                        await locator.selectOption({ label: answer.value });
                        selected = true;
                    } catch {
                        try {
                            await locator.selectOption({ value: answer.value });
                            selected = true;
                        } catch {
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
                    if (!selected) {
                        throw new Error("No matching select option.");
                    }
                } else if (type === "combobox") {
                    await locator.click({ timeout: 2000 }).catch(() => {});
                    const option = page.getByRole("option", { name: new RegExp(answer.value, "i") }).first();
                    if (await option.isVisible().catch(() => false)) {
                        await option.click();
                    } else {
                        await locator.fill(answer.value).catch(async () => {
                            await locator.pressSequentially(answer.value).catch(() => {});
                        });
                    }
                } else if (type === "contenteditable") {
                    await locator.click().catch(() => {});
                    await locator.fill(answer.value).catch(async () => {
                        await locator.evaluate((el, value) => {
                            el.textContent = value;
                        }, answer.value);
                    });
                } else {
                    await locator.fill(answer.value).catch(async () => {
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
            { selector: 'iframe[src*="awswaf"], #aws-waf-captcha, .aws-waf-captcha', type: "AWS WAF Captcha", message: "AWS WAF Captcha challenge detected." },
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

        try {
            const verificationInputs = page.locator(
                'input[name*="otp" i], input[name*="2fa" i], input[name*="mfa" i], input[name*="passcode" i], input[name*="pin" i], input[name*="verification" i], input[autocomplete="one-time-code"], [data-testid*="otp" i], [data-testid*="2fa" i]'
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

        try {
            const emailVerificationSelectors = [
                'iframe[src*="email-verify" i]',
                '.email-verification',
                '[data-testid*="email-verification" i]',
                '[data-testid*="email-confirm" i]',
            ];
            for (const sel of emailVerificationSelectors) {
                if ((await page.locator(sel).count()) > 0) {
                    return {
                        detected: true,
                        type: "EMAIL_VERIFICATION",
                        message: "Email verification required: Check your inbox for the verification link or code.",
                    };
                }
            }
        } catch {
            // Ignore
        }

        try {
            const bodyText = (await page.locator("body").innerText()).toLowerCase();
            if (
                bodyText.includes("verification email sent") ||
                bodyText.includes("check your email to verify") ||
                bodyText.includes("we sent a verification link") ||
                bodyText.includes("we sent a verification code to your email") ||
                bodyText.includes("confirm your email address") ||
                bodyText.includes("verify your email")
            ) {
                return {
                    detected: true,
                    type: "EMAIL_VERIFICATION",
                    message: "Email verification link or code sent by employer ATS portal.",
                };
            }

            if (
                bodyText.includes("verify you are human") ||
                bodyText.includes("complete the security check") ||
                bodyText.includes("please solve the puzzle") ||
                bodyText.includes("security verification required") ||
                bodyText.includes("unusual traffic") ||
                bodyText.includes("bot challenge")
            ) {
                return {
                    detected: true,
                    type: "SECURITY_CHALLENGE",
                    message: "Security verification or bot challenge detected on application page.",
                };
            }

            if (
                bodyText.includes("enter the 6-digit code") ||
                bodyText.includes("enter the code sent to") ||
                bodyText.includes("two-factor authentication") ||
                bodyText.includes("two-step verification")
            ) {
                return {
                    detected: true,
                    type: "2FA_OTP",
                    message: "Two-factor authentication code required.",
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
            const type = field.type.toLowerCase();
            if (type === "file" || type === "hidden" || type === "submit" || type === "button") {
                continue;
            }

            const result = fillResults.find(
                (r) => r.selector === field.selector,
            );

            if (!result || !result.filled) {
                const label = (field.label || field.name).toLowerCase();
                if (this.defaultConsentValue(field)) {
                    continue;
                }
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

    async submit(page: FormPage): Promise<void> {
        const submit = page.locator(SUBMIT_SELECTOR);
        const count = await submit.count();

        if (count === 0) {
            const roleSubmit = page.getByRole("button", { name: /submit|apply now|send application/i });
            if ((await roleSubmit.count()) === 0) {
                throw new Error("Application submit button not found.");
            }
            await roleSubmit.first().click();
        } else {
            await submit.first().click();
        }

        if ("waitForLoadState" in page) {
            await (page as Page).waitForLoadState("domcontentloaded").catch(() => {});
        }
    }

    async completeApplication(
        page: Page,
        options: CompleteApplicationOptions,
    ): Promise<CompleteApplicationResult> {
        const maxSteps = options.maxSteps ?? 8;
        const allFillResults: FormFillResult[] = [];
        let lastMissing: { field: FormField; reason: string }[] = [];

        await this.dismissInterstitials(page);

        for (let step = 0; step < maxSteps; step++) {
            const humanVerification: HumanVerificationResult =
                await this.detectHumanVerification(page).catch(
                    (): HumanVerificationResult => ({ detected: false }),
                );
            if (humanVerification.detected) {
                return {
                    success: false,
                    filledCount: allFillResults.filter((r) => r.filled).length,
                    fillResults: allFillResults,
                    missingFields: lastMissing,
                    humanVerification,
                    reason: humanVerification.message || "Human verification required.",
                };
            }

            const root = await this.resolveFormRoot(page);
            const fields = await this.detectFields(root);
            const fillResults = await this.fillFields(root, fields, options.userId, options.resumeId);
            allFillResults.push(...fillResults);
            lastMissing = this.detectOutsiderRequiredFields(fields, fillResults);

            if (options.resume?.fileUrl || options.resume?.buffer) {
                await resumeUploadTool.upload(root as Page, {
                    fileUrl: options.resume.fileUrl || "",
                    originalName: options.resume.originalName || "resume.pdf",
                    buffer: options.resume.buffer,
                    contentType: options.resume.contentType,
                }).catch(() => {});
            }

            const nextBtn = root.locator(NEXT_SELECTOR).first();
            const submitBtn = root.locator(SUBMIT_SELECTOR).first();
            const hasNext = await nextBtn.isVisible().catch(() => false);
            const hasSubmit = await submitBtn.isVisible().catch(() => false);

            if (hasNext && (!hasSubmit || step < maxSteps - 1) && step < maxSteps - 1) {
                const nextLooksLikeSubmit = /submit|apply/i.test((await nextBtn.innerText().catch(() => "")) || "");
                if (!nextLooksLikeSubmit) {
                    await nextBtn.click().catch(() => {});
                    if ("waitForLoadState" in page) {
                        await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
                    }
                    if (typeof page.waitForTimeout === "function") {
                        await page.waitForTimeout(600);
                    }
                    continue;
                }
            }

            if (lastMissing.length > 0 && hasSubmit) {
                return {
                    success: false,
                    filledCount: allFillResults.filter((r) => r.filled).length,
                    fillResults: allFillResults,
                    missingFields: lastMissing,
                    humanVerification: { detected: false },
                    reason: `Missing candidate info: ${lastMissing.map((m) => m.field.label || m.field.name).join(", ")}`,
                };
            }

            if (hasSubmit || hasNext) {
                try {
                    await this.submit(root);
                } catch {
                    if (hasNext) {
                        await nextBtn.click().catch(() => {});
                    } else {
                        throw new Error("Application submit button not found.");
                    }
                }

                if ("waitForLoadState" in page) {
                    await page.waitForLoadState("domcontentloaded", { timeout: 12000 }).catch(() => {});
                }
                if (typeof page.waitForTimeout === "function") {
                    await page.waitForTimeout(800);
                }

                const postHv: HumanVerificationResult =
                    await this.detectHumanVerification(page).catch(
                        (): HumanVerificationResult => ({ detected: false }),
                    );
                if (postHv.detected) {
                    return {
                        success: false,
                        filledCount: allFillResults.filter((r) => r.filled).length,
                        fillResults: allFillResults,
                        missingFields: lastMissing,
                        humanVerification: postHv,
                        reason: postHv.message || "Human verification required after submit.",
                    };
                }

                const verification = await submissionVerificationTool.verify(page);
                return {
                    success: verification.verified,
                    confirmationId: verification.confirmationId,
                    confirmationUrl: verification.confirmationUrl,
                    reason: verification.reason,
                    filledCount: allFillResults.filter((r) => r.filled).length,
                    fillResults: allFillResults,
                    missingFields: lastMissing,
                    humanVerification: { detected: false },
                };
            }
        }

        const verification = await submissionVerificationTool.verify(page).catch(() => ({
            verified: false,
            reason: "Application submission could not be verified.",
            confirmationUrl: page.url(),
            confirmationId: undefined as string | undefined,
        }));

        return {
            success: verification.verified,
            confirmationId: verification.confirmationId,
            confirmationUrl: verification.confirmationUrl,
            reason: verification.reason || "No submit control was found after filling the application form.",
            filledCount: allFillResults.filter((r) => r.filled).length,
            fillResults: allFillResults,
            missingFields: lastMissing,
            humanVerification: { detected: false },
        };
    }

    private async countFillableInputs(page: FormPage): Promise<number> {
        return page.locator("input:not([type='hidden']), textarea, select").count().catch(() => 0);
    }

    private defaultConsentValue(field: FormField): string | null {
        const label = `${field.label} ${field.name}`.toLowerCase();
        const type = field.type.toLowerCase();
        if (type !== "checkbox" && type !== "radio") return null;
        if (/terms|agree|consent|certif|confirm|privac|acknowledg/i.test(label)) return "yes";
        if (/authoriz|legally|eligib|work in/i.test(label)) return "yes";
        if (/18 or older|age 18|legal age/i.test(label)) return "yes";
        return null;
    }
}

export default new FormTool();
