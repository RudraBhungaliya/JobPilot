import rankingService from './ranking.service.js';
import resumeTailorService from "./resume-tailor.service.js";
import coverLetterService from "./coverLetter.service.js";
import formService from "./form.service.js";


import type {
    CoverLetterDTO,
    RankJobDTO,
    TailorResumeDTO,
} from "./ai.validators.js";

class AIService {
    async rankJob(
        dto: RankJobDTO,
    ) {
        return rankingService.rank(dto);
    }

    async tailorResume(
        dto: TailorResumeDTO,
    ) {
        return resumeTailorService.tailor(
            dto,
        );
    }

    async generateCoverLetter(
        dto: CoverLetterDTO,
    ) {
        return coverLetterService.generate(
            dto,
        );
    }

    async analyzeForm(
        html: string,
    ) {
        return formService.extractFields(
            html,
        );
    }
}

export default new AIService();