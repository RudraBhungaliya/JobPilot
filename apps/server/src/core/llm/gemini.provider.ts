import type { GenerateOptions, LLMProvider } from "./provider.interface.js";

class GeminiProvider implements LLMProvider {
    private apiKey: string | null = null;
    private model: string = "gemini-2.5-flash";

    constructor() {
        this.initialize();
    }

    private initialize() {
        this.apiKey = process.env.GEMINI_API_KEY || null;
        this.model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

        if (this.apiKey) {
            console.log(`[LLM Diagnostic] Provider: Gemini | Model: ${this.model} | Status: Configured (Key present)`);
        } else {
            console.warn(`[LLM Diagnostic] Provider: Gemini | Model: ${this.model} | Status: Missing GEMINI_API_KEY in environment`);
        }
    }

    /**
     * Check if Gemini API is available and properly configured
     */
    isConfigured(): boolean {
        return Boolean(this.apiKey && this.apiKey.trim().length > 0);
    }

    getDiagnostics() {
        return {
            provider: "Gemini",
            model: this.model,
            configured: this.isConfigured(),
        };
    }

    getModelName(): string {
        return this.model;
    }

    /**
     * Generate content using Google Gemini API
     */
    async generate(prompt: string, options?: GenerateOptions): Promise<string> {
        if (!this.apiKey) {
            throw new Error(
                "GEMINI_API_KEY is not configured in the environment. Please set GEMINI_API_KEY in your .env file to enable AI parsing and reasoning."
            );
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

        const payload = {
            contents: [
                {
                    parts: [{ text: prompt }],
                },
            ],
            generationConfig: {
                temperature: options?.temperature ?? 0.2,
                maxOutputTokens: options?.maxTokens ?? 4096,
            },
        };

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API error (${response.status}): ${errText}`);
        }

        const data = (await response.json()) as {
            candidates?: Array<{
                content?: {
                    parts?: Array<{ text?: string }>;
                };
            }>;
        };

        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text || "";
        return text;
    }

    /**
     * Generate structured JSON output via Gemini
     */
    async generateJSON<T>(prompt: string, options?: GenerateOptions): Promise<T> {
        const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with a valid, raw JSON object. Do not include markdown formatting or backticks.`;
        const rawText = await this.generate(jsonPrompt, options);

        // Strip possible markdown fences
        const cleaned = rawText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();

        try {
            return JSON.parse(cleaned) as T;
        } catch (e: any) {
            throw new Error(`Failed to parse Gemini JSON response: ${e.message}\nRaw text: ${cleaned}`);
        }
    }
}

export const geminiProvider = new GeminiProvider();
export default geminiProvider;