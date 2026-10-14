export interface GenerateOptions {
    temperature ?: number;
    maxTokens ?: number;
}

export interface LLMProvider {
    isConfigured(): boolean;
    generate(
        prompt : string,
        options ?: GenerateOptions,
    ) : Promise<string>;
    generateJSON<T>(prompt: string, options?: GenerateOptions): Promise<T>;
}
