export const Agent = {
    MAX_SEARCH_RESULTS: 500,
    MAX_APPLICATIONS_PER_RUN: 100,
    MAX_RETRIES: 3,
    // Max attempts per individual job application before marking it FAILED
    MAX_APPLY_ATTEMPTS: 2,
    // Playwright page navigation timeout in milliseconds
    PAGE_TIMEOUT_MS: 30_000,
    DEFAULT_MODEL: "gemini",
    THREAD_PREFIX: "jobpilot",
} as const;