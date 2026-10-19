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
    scrapingCompleted?: boolean;
    autofillCompleted?: boolean;
    hasWebScrapedJobs?: boolean;
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
- Scraping completed: ${Boolean(input.scrapingCompleted)}
- Autofill completed: ${Boolean(input.autofillCompleted)}
- Web scraped / portal jobs: ${Boolean(input.hasWebScrapedJobs)}
- Resume available: ${input.hasResume}
- Application available: ${input.hasApplication}
- Browser available: ${input.hasBrowser}
- Errors: ${input.errorCount}
- Jobs evaluated: ${input.evaluated}
- Jobs ranked: ${input.ranked}
- Tailoring instructions: ${input.tailoringInstructionsCount}

Available actions:

SCRAPE
DISCOVER
EVALUATE
FETCH
RANK
TAILOR
APPLY
AUTO_FILL
WAITING_FOR_USER
VERIFY
PERSIST
RETRY
END

Rules:

- If query requests career portals, web scraping, or direct employer career pages, and scraping is not completed, choose SCRAPE.
- If no jobs exist and scraping is completed, choose END.
- If no jobs exist and scraping is not requested, choose DISCOVER.
- If jobs exist and have not been evaluated, choose EVALUATE.
- If jobs have been evaluated but not ranked, choose RANK.
- If jobs have been ranked and selected jobs exist but tailoring instructions do not exist, choose TAILOR.
- If selected jobs are from web scraping or career portals and autofill is not completed, choose AUTO_FILL.
- If tailoring instructions exist and application prerequisites are available, choose APPLY.
- Choose FETCH when selected jobs require additional information.
- Choose VERIFY after an application attempt.
- Choose PERSIST after successful verification.
- Choose RETRY when a recoverable error exists.
- Choose WAITING_FOR_USER when candidate action or security verification is required.
- Choose END when autofill is completed or no useful action remains.
- Never invent candidate information.
- Never choose an action that has already been completed unless the state requires it again.

Return ONLY valid JSON:

{
    "action": "ACTION",
    "reason": "short explanation"
}
`;