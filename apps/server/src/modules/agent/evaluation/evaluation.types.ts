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
