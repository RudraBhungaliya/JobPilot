export interface ATSResult {
    score: number;

    strengths: string[];

    missingKeywords: string[];

    weaknesses: string[];

    suggestions: string[];
}