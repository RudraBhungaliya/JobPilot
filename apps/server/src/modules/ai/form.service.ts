import selectorService from "./selector.service.js";

import type {
    FormField,
} from "./ai.types.js";

class FormService {

    async extractFields(
        html: string,
    ): Promise<FormField[]> {

        /*
            Parse DOM
            using AI.
        */

        await selectorService.identify(
            html,
            "resume",
        );

        return [];
    }
}

export default new FormService();