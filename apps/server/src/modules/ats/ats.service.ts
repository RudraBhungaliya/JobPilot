import type { ATSResult } from "./ats.types.js";

class ATSService {
    async analyzeResume(
        resumeId: string,
    ): Promise<ATSResult> {

        return {
            score: 0,

            missingKeywords: [],

            strengths: [],

            weaknesses: [],

            suggestions: [],
        };
    }
}

export default new ATSService();