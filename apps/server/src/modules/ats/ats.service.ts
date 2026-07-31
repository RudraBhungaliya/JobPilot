import { extractKeywords } from "./ats.utils.js";

import type { ATSResult } from "./ats.types.js";

class ATSService {
    async analyzeResume(
        resumeText: string,
    ): Promise<ATSResult> {

        const keywords =
            extractKeywords(resumeText);

        const score =
            Math.min(
                100,
                keywords.length * 7,
            );

        return {
            score,

            missingKeywords: [],

            strengths: keywords,

            weaknesses: [],

            suggestions: [],
        };
    }
}

export default new ATSService();