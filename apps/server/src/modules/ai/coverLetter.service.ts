import promptService from "./prompt.service.js";

import type {
    CoverLetterInput,
} from "./ai.types.js";

class CoverLetterService {
    async generate(
        input : CoverLetterInput
    ){
const prompt =
            promptService.buildCoverLetterPrompt(
                input,
            );

        /*
            Gemini/OpenAI
            integration here.
        */

        return {
            prompt,

            coverLetter:
                "",
        };
    }
}

export default new CoverLetterService();