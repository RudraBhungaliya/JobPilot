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

Your job is to decide the next action based strictly on the current state.

Query:
${input.query}

Jobs discovered:
${input.jobsCount}

Jobs selected:
${input.selectedJobsCount}

Jobs evaluated:
${input.evaluated}

Resume available:
${input.hasResume}

Application available:
${input.hasApplication}

Browser available:
${input.hasBrowser}

Errors:
${input.errorCount}

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

Decision rules:

1. If there are no jobs, choose DISCOVER.

2. If jobs exist and evaluated is false, choose EVALUATE.

3. If jobs have been evaluated and selectedJobs is empty, choose RANK.

4. If selected jobs exist and a resume is available, choose TAILOR.

5. Choose FETCH when additional job information must be retrieved.

6. Choose APPLY only when the browser and application prerequisites are available.

7. Choose VERIFY after an application attempt.

8. Choose PERSIST after successful verification.

9. Choose RETRY when a recoverable error exists.

10. Choose END when the workflow has nothing useful left to do.

11. Never invent candidate information.

Return ONLY valid JSON:

{
    "action": "ACTION",
    "reason": "short explanation"
}
`;