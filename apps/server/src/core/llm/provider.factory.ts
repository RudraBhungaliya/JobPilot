import geminiProvider from "./gemini.provider.js";

import type {
    LLMProvider,
} from "./provider.interface.js";

class ProviderFactory {
    getProvider() : LLMProvider {
        return geminiProvider;
    }
}

export default new ProviderFactory();
