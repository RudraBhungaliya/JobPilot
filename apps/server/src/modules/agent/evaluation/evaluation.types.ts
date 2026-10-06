export interface JobEvaluation {
    jobId : string;
    score : number;
    matchesTerms : string[];
    reason : string;
}

export interface EvaluationResult {
    evaluations : JobEvaluation[];
    selectedJobIds : string[];
}

export interface JobScorecard {
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    skillScore: number;
    experienceScore: number;
    educationScore: number;
    locationScore: number;
    preferenceScore: number;
    companyTier: "S" | "A" | "B" | "C";
    rank: number;
    reasons: string[];
    breakdown: {
        skills: number;
        experience: number;
        education: number;
        location: number;
        rolePreferences: number;
    };
}

export interface RankedJobMatch<T = any> {
    job: T;
    scorecard: JobScorecard;
    matchScore: number;
    rank: number;
}

export interface LoopCriteriaInput {
    targetJobTitles?: string[];
    targetLocations?: string[];
    targetCountries?: string[];
    remotePreference?: string | null;
    experienceLevel?: string | null;
    employmentTypes?: string[];
    minimumCompensation?: number | null;
    maximumCompensation?: number | null;
    targetTiers?: string[];
    priorityStrategy?: string;
}
