export interface PlannerPromptInput {
    query: string;
    jobsCount: number;
    selectedJobsCount: number;
    hasResume: boolean;
    hasApplication: boolean;
    hasBrowser: boolean;
    errorCount: number;
    evaluated: boolean;
    ranked: boolean;
    tailoringInstructionsCount: number;
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
- Jobs ranked: ${input.ranked}
- Tailoring instructions: ${input.tailoringInstructionsCount}

Available actions:

DISCOVER
EVALUATE
FETCH
RANK
TAILOR
APPLY
VERIFY
PERSIST
RETRY
END

Rules:

- If no jobs exist, choose DISCOVER.
- If jobs exist and have not been evaluated, choose EVALUATE.
- If jobs have been evaluated but not ranked, choose RANK.
- If jobs have been ranked and selected jobs exist but tailoring instructions do not exist, choose TAILOR.
- If tailoring instructions exist and application prerequisites are available, choose APPLY.
- Choose FETCH when selected jobs require additional information.
- Choose VERIFY after an application attempt.
- Choose PERSIST after successful verification.
- Choose RETRY when a recoverable error exists.
- Choose END when no useful action remains.
- Never invent candidate information.
- Never choose an action that has already been completed unless the state requires it again.

Return ONLY valid JSON:

{
    "action": "ACTION",
    "reason": "short explanation"
}
`;