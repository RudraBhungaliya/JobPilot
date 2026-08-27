import candidateService from "./candidate.service.js";

import candidateMapper from "./candidate.mapper.js";

import type {
    CandidateAnswer,
} from "./candidate.types.js";

class CandidateTool {
    async getContext(
        userId: string,
        resumeId?: string,
    ) {
        return candidateService.buildContext(
            userId,
            resumeId,
        );
    }

    async answer(
        userId: string,
        fieldName: string,
        label: string,
        resumeId?: string,
    ): Promise<CandidateAnswer> {
        const context =
            await candidateService.buildContext(
                userId,
                resumeId,
            );

        return candidateMapper.resolve(
            fieldName,
            label,
            context,
        );
    }
}

export default new CandidateTool();