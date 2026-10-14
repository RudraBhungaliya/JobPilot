import geminiProvider from "./gemini.provider.js";
import openaiProvider from "./openai.provider.js";
import type { GenerateOptions, LLMProvider } from "./provider.interface.js";

class ResilientLLMProvider implements LLMProvider {
    getModelName(): string {
        const preferred = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
        return preferred === "openai" && openaiProvider.isConfigured()
            ? openaiProvider.getModelName()
            : geminiProvider.getModelName();
    }

    isConfigured(): boolean {
        return geminiProvider.isConfigured() || openaiProvider.isConfigured();
    }

    getDiagnostics() {
        return {
            gemini: geminiProvider.getDiagnostics(),
            openai: openaiProvider.getDiagnostics(),
        };
    }

    async generate(prompt: string, options?: GenerateOptions): Promise<string> {
        const preferred = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
        const primary = preferred === "openai" ? openaiProvider : geminiProvider;
        const secondary = preferred === "openai" ? geminiProvider : openaiProvider;

        if (primary.isConfigured()) {
            try {
                return await primary.generate(prompt, options);
            } catch (err: any) {
                console.warn(`[LLMFactory] Primary provider (${preferred}) failed: ${err.message}. Trying fallback provider...`);
            }
        }

        if (secondary.isConfigured()) {
            return await secondary.generate(prompt, options);
        }

        throw new Error("No configured LLM provider could fulfill the request.");
    }

    async generateJSON<T>(prompt: string, options?: GenerateOptions): Promise<T> {
        const preferred = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
        const primary = preferred === "openai" ? openaiProvider : geminiProvider;
        const secondary = preferred === "openai" ? geminiProvider : openaiProvider;

        if (primary.isConfigured()) {
            try {
                return await primary.generateJSON<T>(prompt, options);
            } catch (err: any) {
                console.warn(`[LLMFactory] Primary provider (${preferred}) failed: ${err.message}. Trying fallback provider...`);
            }
        }

        if (secondary.isConfigured()) {
            return await secondary.generateJSON<T>(prompt, options);
        }

        throw new Error("No configured LLM provider could fulfill the request.");
    }
}

const resilientProvider = new ResilientLLMProvider();

class ProviderFactory {
    getProvider(): LLMProvider {
        return resilientProvider;
    }
}

export default new ProviderFactory();

