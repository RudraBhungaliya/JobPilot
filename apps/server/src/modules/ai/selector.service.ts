import type {
    SelectorResult,
} from "./ai.types.js";

const FIELD_PATTERNS: Record<string, string[]> = {
    resume: ['input[type="file"]', 'input[name*="resume" i]', 'input[name*="cv" i]', 'input[id*="resume" i]', 'input[id*="cv" i]'],
    email: ['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]'],
    first_name: ['input[name*="first" i]', 'input[id*="first" i]', 'input[name*="fname" i]', 'input[id*="fname" i]'],
    last_name: ['input[name*="last" i]', 'input[id*="last" i]', 'input[name*="lname" i]', 'input[id*="lname" i]'],
    name: ['input[name="name" i]', 'input[name*="full_name" i]', 'input[id*="full_name" i]'],
    phone: ['input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]', 'input[name*="mobile" i]'],
    linkedin: ['input[name*="linkedin" i]', 'input[id*="linkedin" i]'],
    github: ['input[name*="github" i]', 'input[id*="github" i]'],
    website: ['input[name*="website" i]', 'input[id*="website" i]', 'input[name*="portfolio" i]', 'input[id*="portfolio" i]'],
    location: ['input[name*="location" i]', 'input[id*="location" i]', 'input[name*="city" i]', 'input[id*="city" i]'],
};

class SelectorService {
    async identify(
        html: string,
        field: string,
    ): Promise<SelectorResult> {
        if (!html || !field) {
            return { selector: "", confidence: 0 };
        }

        const normalizedField = field.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        const patterns = FIELD_PATTERNS[normalizedField] || [
            `input[name*="${normalizedField}" i]`,
            `input[id*="${normalizedField}" i]`,
            `textarea[name*="${normalizedField}" i]`,
            `select[name*="${normalizedField}" i]`,
        ];

        // Search for element matches in the provided HTML
        for (const pattern of patterns) {
            // Extract the core attribute check for regex testing
            const attrMatch = pattern.match(/\[([a-z-]+)(?:[*~^$]?=)(?:"([^"]+)"|'([^']+)')/i);
            if (attrMatch) {
                const attr = attrMatch[1];
                const val = (attrMatch[2] || attrMatch[3] || "").toLowerCase();
                const regex = new RegExp(`${attr}\\s*=\\s*["'][^"']*${val}[^"']*["']`, "i");
                if (regex.test(html)) {
                    return {
                        selector: pattern,
                        confidence: 0.95,
                    };
                }
            } else if (html.includes(pattern)) {
                return {
                    selector: pattern,
                    confidence: 0.85,
                };
            }
        }

        // Default heuristic selector
        return {
            selector: `[name*="${normalizedField}"]`,
            confidence: 0.5,
        };
    }
}

export default new SelectorService();