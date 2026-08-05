export interface AIModelConfig {
    model: string;

    temperature: number;

    maxTokens: number;
}

export interface JobRankingInput {
    resumeText: string;

    jobDescription: string;
}

export interface JobRankingResult {
    score: number;

    reason: string;
}

export interface ResumeTailorInput {
    resumeText: string;

    jobDescription: string;
}

export interface CoverLetterInput {
    resumeText: string;

    jobDescription: string;

    company: string;

    role: string;
}

export interface SelectorResult {
    selector: string;

    confidence: number;
}

export interface FormField {
    label: string;

    type: string;

    selector: string;
}