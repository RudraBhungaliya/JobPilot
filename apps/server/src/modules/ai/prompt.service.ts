import type {
    CoverLetterInput,
    JobRankingInput,
    ResumeTailorInput,
} from "./ai.types.js";

export interface FormQuestionPromptInput {
    question: string;
    fieldLabel?: string;
    fieldType?: string;
    facts: string[];
    jobDescription?: string;
    resumeText?: string;
}

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

    buildFormQuestionPrompt(
        input: FormQuestionPromptInput,
    ): string {
        const factsList = input.facts
            .map((fact, i) => `${i + 1}. ${fact}`)
            .join("\n");

        return `You are an automated form-answering assistant for job applications. You must answer ONLY using the PROVIDED FACTS about the candidate. You must never invent, estimate, or hallucinate information. If the answer cannot be found precisely and unambiguously in the PROVIDED FACTS, you must output exactly "N/A" and nothing else.

Guidelines:
- Output exactly one final line of answer. No preamble, no markdown, no "Answer: " prefix.
- For yes/no questions: output exactly "Yes" or "No" (or "true"/"false" if a boolean is requested) based strictly on facts.
- Keep answers concise; max 2 sentences.
- Do not mention that "based on provided facts" — just answer.

JOB CONTEXT (optional):
${input.jobDescription ?? "(none)"}

CANDIDATE RESUME TEXT (optional):
${input.resumeText ?? "(none)"}

PROVIDED FACTS:
${factsList}

QUESTION: ${input.question}
FIELD LABEL: ${input.fieldLabel ?? "(none)"}
FIELD TYPE: ${input.fieldType ?? "(none)"}`;
    }
}

export default new PromptService();