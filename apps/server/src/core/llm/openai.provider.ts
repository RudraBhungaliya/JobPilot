import OpenAI from "openai";
import type { GenerateOptions, LLMProvider } from "./provider.interface.js";
import logger from "../logger/logger.js";

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI | null = null;
    private model: string = "gpt-4o-mini";

    constructor() {
        this.initialize();
    }

    private initialize() {
        const apiKey = process.env.OPENAI_API_KEY;
        this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";

        if (apiKey && apiKey !== "your_openai_api_key_here" && apiKey.startsWith("sk-")) {
            this.client = new OpenAI({ apiKey });
            logger.info(`[LLM Diagnostic] Provider: OpenAI | Model: ${this.model} | Status: Configured`);
        } else {
            logger.debug(`[LLM Diagnostic] Provider: OpenAI | Model: ${this.model} | Status: Missing or placeholder OPENAI_API_KEY`);
        }
    }

    isConfigured(): boolean {
        const key = process.env.OPENAI_API_KEY;
        return Boolean(key && key.trim().length > 0 && key !== "your_openai_api_key_here");
    }

    getDiagnostics() {
        return {
            provider: "OpenAI",
            model: this.model,
            configured: this.isConfigured(),
        };
    }

    getModelName(): string {
        return this.model;
    }

    async generate(prompt: string, options?: GenerateOptions): Promise<string> {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!this.client && apiKey && apiKey !== "your_openai_api_key_here" && apiKey.startsWith("sk-")) {
            this.client = new OpenAI({ apiKey });
        }

        if (!this.client) {
            throw new Error("OpenAI provider is not configured.");
        }

        const model = process.env.OPENAI_MODEL || this.model;

        try {
            const completion = await this.client.chat.completions.create({
                model,
                messages: [{ role: "user", content: prompt }],
                temperature: options?.temperature ?? 0.2,
                max_tokens: options?.maxTokens ?? 4096,
            });

            const content = completion.choices[0]?.message?.content?.trim();
            if (!content) throw new Error("OpenAI provider returned an empty response.");
            return content;
        } catch (error) {
            logger.error("Error invoking OpenAI LLM API", { error });
            throw error;
        }
    }

    async generateJSON<T>(prompt: string, options?: GenerateOptions): Promise<T> {
        const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with a valid, raw JSON object. Do not include markdown formatting or backticks.`;
        const rawText = await this.generate(jsonPrompt, options);

        const cleaned = rawText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();

        try {
            return JSON.parse(cleaned) as T;
        } catch (e: any) {
            throw new Error(`Failed to parse OpenAI JSON response: ${e.message}\nRaw text: ${cleaned}`);
        }
    }

}

export const openaiProvider = new OpenAIProvider();
export default openaiProvider;
