import promptService from "./prompt.service.js";

import type {
    ResumeTailorInput,
} from "./ai.types.js";

class ResumeTailorService {
    async tailor(
        input : ResumeTailorInput
    ){
        const prompt = promptService.buildResumePrompt(
            input,
        );

        /*
            Gemini/OpenAI
            integration here.
        */

        return {
            prompt,

            tailoredResume:
                "",
        };
    }
}

export default new ResumeTailorService();