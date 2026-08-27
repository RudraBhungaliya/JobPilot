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