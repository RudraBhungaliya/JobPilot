import providerFactory from "../../../core/llm/provider.factory.js";

class AITool {
    async generate(
        prompt: string,
    ) {
        const provider =
            providerFactory.getProvider();

        return provider.generate(
            prompt,
        );
    }
}

export default new AITool();