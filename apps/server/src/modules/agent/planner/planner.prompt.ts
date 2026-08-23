export interface PlannerPromptInput {
    query: string;
    jobsCount: number;
    selectedJobsCount: number;
    hasResume: boolean;
    hasApplication: boolean;
    hasBrowser: boolean;
    errorCount: number;
    evaluated: boolean;
}

export const buildPlannerPrompt = (
    input: PlannerPromptInput,
): string => `
You are the JobPilot workflow planner.

Query:
${input.query}

State:
- Jobs discovered: ${input.jobsCount}
- Selected jobs: ${input.selectedJobsCount}
- Resume available: ${input.hasResume}
- Application available: ${input.hasApplication}
- Browser available: ${input.hasBrowser}
- Errors: ${input.errorCount}
- Jobs evaluated: ${input.evaluated}

Rules:

- If no jobs exist, choose DISCOVER.
- If jobs exist but have not been evaluated, choose EVALUATE.
- If jobs have been evaluated but none are selected, choose RANK.
- If jobs are selected and a resume exists, choose TAILOR.
- Choose FETCH when job information needs to be fetched.
- Only choose APPLY when application prerequisites are available.
- Choose VERIFY after an application attempt.
- Choose PERSIST after verification.
- Choose RETRY when a recoverable error exists.
- Choose END when no useful action remains.
- Never invent candidate information.

Return only JSON:

{
    "action": "ACTION",
    "reason": "short explanation"
}
`;