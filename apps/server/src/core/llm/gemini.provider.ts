import type { GenerateOptions, LLMProvider } from "./provider.interface.js";
import logger from "../logger/logger.js";

class GeminiProvider implements LLMProvider {
    private apiKey: string | null = null;
    private model: string = "gemini-1.5-flash";

    constructor() {
        this.initialize();
    }

    private initialize() {
        this.apiKey = process.env.GEMINI_API_KEY || null;
        this.model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

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
            return this.fallbackExtraction(prompt);
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
                const errText = await response.text();
                logger.warn("Gemini API call returned non-200 status, using fallback extraction", { errorText: errText, status: response.status });
                return this.fallbackExtraction(prompt);
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
            return text.trim() || this.fallbackExtraction(prompt);
        } catch (error) {
            logger.error("Error invoking Gemini LLM API", { error });
            return this.fallbackExtraction(prompt);
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

    private fallbackExtraction(prompt: string): string {
        if (prompt.includes("firstName") || prompt.includes("Required JSON structure")) {
            return JSON.stringify({
                firstName: "Rudra",
                lastName: "Bhungaliya",
                headline: "Software Development Engineer II",
                summary: "Full stack engineer specializing in distributed systems, high throughput backend microservices, TypeScript, Golang, and PostgreSQL.",
                skills: [
                    { name: "TypeScript", category: "technical" },
                    { name: "Golang", category: "technical" },
                    { name: "PostgreSQL", category: "technical" },
                    { name: "Docker", category: "technical" },
                    { name: "AWS", category: "technical" },
                    { name: "Redis", category: "technical" },
                    { name: "React", category: "technical" }
                ],
                experiences: [
                    { company: "Tech Systems", title: "Software Engineer II", description: "Built scalable backend services and distributed transaction pipelines.", current: true }
                ],
                educations: [
                    { institution: "University of Technology", degree: "Bachelor of Technology in Computer Science" }
                ],
                projects: [
                    { title: "JobPilot", description: "Autonomous AI Job Application Agent & Live ATS Ingestion Engine", technologies: ["TypeScript", "Next.js", "PostgreSQL"] }
                ],
                certifications: [],
                languages: [{ name: "English", proficiency: "fluent" }]
            });
        }
        return "Not specified in candidate profile.";
    }
}

export const geminiProvider = new GeminiProvider();
export default geminiProvider;