export interface ATSResult {
    score: number;

    missingKeywords: string[];

    strengths: string[];

    weaknesses: string[];

    suggestions: string[];
}