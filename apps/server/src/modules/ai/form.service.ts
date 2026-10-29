import selectorService from "./selector.service.js";

import type {
    FormField,
} from "./ai.types.js";

class FormService {
    async extractFields(
        html: string,
    ): Promise<FormField[]> {
        if (!html || !html.trim()) {
            return [];
        }

        const fields: FormField[] = [];
        const seenSelectors = new Set<string>();

        // Regex pattern to extract input, select, and textarea elements
        const inputRegex = /<(input|select|textarea)\b([^>]*)>/gi;
        let match: RegExpExecArray | null;

        while ((match = inputRegex.exec(html)) !== null) {
            const tagName = match[1].toLowerCase();
            const rawAttrs = match[2];

            const getAttr = (name: string): string => {
                const attrMatch = rawAttrs.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
                return attrMatch ? attrMatch[1].trim() : "";
            };

            const type = (tagName === "input" ? (getAttr("type") || "text") : tagName).toLowerCase();
            // Skip hidden, submit, button, reset elements
            if (["hidden", "submit", "button", "reset", "image"].includes(type)) {
                continue;
            }

            const name = getAttr("name");
            const id = getAttr("id");
            const placeholder = getAttr("placeholder");
            const ariaLabel = getAttr("aria-label");

            // Skip CSRF and internal security token inputs
            if (name && /^(csrf|_token|authenticity_token|__VIEWSTATE|timestamp)$/i.test(name)) {
                continue;
            }

            const label = ariaLabel || placeholder || name || id || `${type} field`;
            const selector = id ? `#${id}` : name ? `${tagName}[name="${name}"]` : "";

            if (selector && !seenSelectors.has(selector)) {
                seenSelectors.add(selector);
                fields.push({
                    label,
                    type,
                    selector,
                });
            }
        }

        // If no file input was identified from standard tags, check with selectorService
        if (!fields.some((f) => f.type === "file")) {
            const resumeSelector = await selectorService.identify(html, "resume");
            if (resumeSelector.selector && resumeSelector.confidence > 0.7 && !seenSelectors.has(resumeSelector.selector)) {
                fields.push({
                    label: "Resume / CV File",
                    type: "file",
                    selector: resumeSelector.selector,
                });
            }
        }

        return fields;
    }
}

export default new FormService();