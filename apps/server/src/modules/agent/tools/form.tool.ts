import type { Page } from "playwright";

export interface FormField {
    selector: string;
    name: string;
    type: string;
    label: string;
    required: boolean;
}

export interface FormSubmissionResult {
    submitted: boolean;
    reason: string;
}

class FormTool {
    async detectFields(
        page: Page,
    ): Promise<FormField[]> {
        return page.locator(
            "input, textarea, select",
        ).evaluateAll((elements) =>
            elements.map((element) => {
                const input =
                    element as HTMLInputElement;

                const id = input.id;

                const label =
                    id
                        ? document.querySelector(
                              `label[for="${id}"]`,
                          )?.textContent ?? ""
                        : input.getAttribute(
                              "aria-label",
                          ) ?? "";

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
                        input.required ||
                        input.getAttribute(
                            "aria-required",
                        ) === "true",
                };
            }),
        );
    }

    async validateRequiredFields(
        page: Page,
    ): Promise<FormField[]> {
        const fields =
            await this.detectFields(page);

        const missing: FormField[] = [];

        for (const field of fields) {
            if (!field.required) {
                continue;
            }

            const value =
                await page
                    .locator(field.selector)
                    .inputValue()
                    .catch(() => "");

            if (!value.trim()) {
                missing.push(field);
            }
        }

        return missing;
    }

    async submit(
        page: Page,
    ): Promise<FormSubmissionResult> {
        const submitButton =
            page.locator(
                'button[type="submit"], input[type="submit"]',
            ).first();

        if (
            await submitButton.count() ===
            0
        ) {
            return {
                submitted: false,
                reason:
                    "Submit button was not found.",
            };
        }

        await submitButton.click();

        await page.waitForLoadState(
            "domcontentloaded",
            {
                timeout: 15000,
            },
        ).catch(() => undefined);

        return {
            submitted: true,
            reason:
                "Application form submitted.",
        };
    }

    async detectSubmissionSuccess(
        page: Page,
    ): Promise<boolean> {
        const url =
            page.url().toLowerCase();

        if (
            /success|confirmation|thank-you|thankyou|submitted/.test(
                url,
            )
        ) {
            return true;
        }

        const bodyText =
            await page.locator("body")
                .innerText()
                .catch(() => "");

        return /application submitted|application received|thank you for applying|thanks for applying|successfully applied|application complete/i.test(
            bodyText,
        );
    }
}

export default new FormTool();