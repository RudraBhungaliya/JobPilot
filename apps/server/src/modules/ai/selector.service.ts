import type {
    SelectorResult,
} from "./ai.types.js";

class SelectorService {

    async identify(
        html: string,
        field: string,
    ): Promise<SelectorResult> {

        /*
            AI finds
            selector
            from DOM.
        */

        return {
            selector: "",

            confidence: 0,
        };
    }
}

export default new SelectorService();