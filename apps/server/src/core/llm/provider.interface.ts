export interface GenerateOptions {
    temperature ?: number;
    maxTokens ?: number;
}

export interface LLMProvider {
    generate(
        prompt : string,
        options ?: GenerateOptions,
    ) : Promise<string>;
}