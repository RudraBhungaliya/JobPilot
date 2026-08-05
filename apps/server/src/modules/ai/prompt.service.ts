import type {
    CoverLetterInput,
    JobRankingInput,
    ResumeTailorInput,
} from "./ai.types.js";

class PromptService {
    buildRankingPrompt(
        input: JobRankingInput,
    ) {
        return `
You are an ATS recruiter.

Resume:

${input.resumeText}

Job Description:

${input.jobDescription}

Return:

1. Score out of 100
2. Reason
3. Missing Skills
4. Strengths
`;
    }

    buildResumePrompt(
        input: ResumeTailorInput,
    ) {
        return `
Tailor the following resume for this job.

Resume:

${input.resumeText}

Job Description:

${input.jobDescription}

Return only the improved resume.
`;
    }

    buildCoverLetterPrompt(
        input: CoverLetterInput,
    ) {
        return `
Write a professional cover letter.

Company:
${input.company}

Role:
${input.role}

Resume:

${input.resumeText}

Job Description:

${input.jobDescription}
`;
    }
}

export default new PromptService();