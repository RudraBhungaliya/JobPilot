import type { Page } from "playwright";

export interface FormField {
    selector: string;
    name: string;
    type: string;
    label: string;
    required: boolean;
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

                const id =
                    input.id;

                const label =
                    id
                        ? document.querySelector(
                              `label[for="${id}"]`,
                          )?.textContent ?? ""
                        : "";

                return {
                    selector: id
                        ? `#${CSS.escape(id)}`
                        : `${input.tagName.toLowerCase()}[name="${input.name}"]`,
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
}

export default new FormTool();