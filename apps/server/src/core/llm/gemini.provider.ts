import type { GenerateOptions, LLMProvider } from "./provider.interface.js";
import logger from "../logger/logger.js";

class GeminiProvider implements LLMProvider {
    private apiKey: string | null = null;
    private model: string = "gemini-3.5-flash";

    constructor() {
        this.initialize();
    }

    private initialize() {
        this.apiKey = process.env.GEMINI_API_KEY || null;
        this.model = process.env.GEMINI_MODEL || "gemini-3.5-flash";

        if (this.apiKey && this.apiKey !== "your_gemini_api_key_here") {
            logger.info(`[LLM Diagnostic] Provider: Gemini | Model: ${this.model} | Status: Configured`);
        } else {
            logger.debug(`[LLM Diagnostic] Provider: Gemini | Model: ${this.model} | Status: Missing or placeholder GEMINI_API_KEY`);
        }
    }

    /**
     * Check if Gemini API is available and properly configured
     */
    isConfigured(): boolean {
        const key = this.apiKey || process.env.GEMINI_API_KEY;
        return Boolean(key && key.trim().length > 0 && key !== "your_gemini_api_key_here");
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
        const apiKey = this.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "your_gemini_api_key_here") {
            throw new Error("Gemini provider is not configured.");
        }

        const model = process.env.GEMINI_MODEL || this.model;
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                logger.warn("Gemini API primary request failed", { status: response.status, model });
                // Fallback to gemini-3.1-flash-lite if different from current
                if (model !== "gemini-3.1-flash-lite") {
                    const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
                    const fallbackRes = await fetch(fallbackEndpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });
                    if (fallbackRes.ok) {
                        const fbData = (await fallbackRes.json()) as any;
                        const fbText = fbData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        if (fbText.trim()) return fbText.trim();
                    }
                }
                throw new Error(`Gemini provider returned HTTP ${response.status}.`);
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
            if (!text.trim()) throw new Error("Gemini provider returned an empty response.");
            return text.trim();
        } catch (error) {
            logger.error("Error invoking Gemini LLM API", { error });
            throw error;
        }
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
