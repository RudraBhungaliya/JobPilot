import type {
    GenerateOptions,
    LLMProvider,
} from "./provider.interface.js";

class GeminiProvider implements LLMProvider {
    async generate(
        prompt : string,
        options : GenerateOptions,
    ) : Promise<string> {
        // Gemini implementation


        void prompt;
        void options;
        return "";
    }
}

export default new GeminiProvider();