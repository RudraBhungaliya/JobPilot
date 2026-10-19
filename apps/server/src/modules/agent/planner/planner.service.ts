import aiTool from "../tools/ai.tool.js";

import {
    buildPlannerPrompt,
} from "./planner.prompt.js";

import type {
    AgentStateType,
} from "../graph/state.js";

import type {
    PlannerDecision,
} from "./planner.types.js";

class PlannerService {
    async decide(
        state: AgentStateType,
    ): Promise<PlannerDecision> {
        // Enforce maximum iteration bounds to prevent cyclic deadlocks
        if (state.history.length >= 20) {
            return {
                action: "END",
                reason: "Workflow reached maximum execution iteration threshold.",
            };
        }

        if (state.application?.status === "WAITING_FOR_USER" || state.plannerAction === "WAITING_FOR_USER") {
            return {
                action: "WAITING_FOR_USER",
                reason: "Application paused awaiting candidate intervention.",
            };
        }

        if (state.scrapingCompleted && state.jobs.length === 0) {
            return {
                action: "END",
                reason: "Scraping completed and no active openings were found matching query.",
            };
        }

        if (state.autofillCompleted) {
            return {
                action: "END",
                reason: "Agentic autofill workflow completed.",
            };
        }

        const isScrapeQuery = /(?:scrape|scraping|career portal|portal|career page)/i.test(state.query || "");
        if (state.jobs.length === 0 && !state.scrapingCompleted && (state.plannerAction === "SCRAPE" || isScrapeQuery)) {
            return {
                action: "SCRAPE",
                reason: "Web scraping tech openings from company career portals and MNC sites.",
            };
        }

        const hasWebScrapedJob = state.selectedJobs.some(
            (j) => j.source === "web_scraper" || j.platform === "web",
        );
        if (state.selectedJobs.length > 0 && !state.autofillCompleted && (state.plannerAction === "AUTO_FILL" || hasWebScrapedJob)) {
            return {
                action: "AUTO_FILL",
                reason: "Agentic auto data filling for web-scraped openings and company portals.",
            };
        }

        try {
            const prompt =
                buildPlannerPrompt({
                    query: state.query,
                    jobsCount:
                        state.jobs.length,
                    selectedJobsCount:
                        state.selectedJobs.length,
                    hasResume:
                        Boolean(state.resume),
                    hasApplication:
                        Boolean(state.application),
                    hasBrowser:
                        Boolean(state.browser),
                    errorCount:
                        state.errors.length,
                    evaluated:
                        state.evaluated,
                    ranked:
                        state.ranked,
                    tailoringInstructionsCount:
                        state
                            .tailoringInstructions
                            .length,
                    scrapingCompleted: state.scrapingCompleted,
                    autofillCompleted: state.autofillCompleted,
                    hasWebScrapedJobs: hasWebScrapedJob,
                });

            const response =
                await aiTool.generate(
                    prompt,
                );

            if (response && response.trim()) {
                const parsed = JSON.parse(response) as PlannerDecision;
                if (parsed && typeof parsed.action === "string") {
                    return parsed;
                }
            }
        } catch {
            // Fall back to deterministic rule-based decision
        }

        return this.fallbackDecision(state);
    }

    private fallbackDecision(state: AgentStateType): PlannerDecision {
        // Enforce maximum iteration bounds to prevent cyclic deadlocks
        if (state.history.length >= 20) {
            return {
                action: "END",
                reason: "Workflow reached maximum execution iteration threshold.",
            };
        }

        if (state.application?.status === "WAITING_FOR_USER" || state.plannerAction === "WAITING_FOR_USER") {
            return {
                action: "WAITING_FOR_USER",
                reason: "Application paused awaiting candidate intervention.",
            };
        }

        if (state.errors.length > 0 && state.application && state.application.status === "FAILED") {
            const retryCount = state.history.filter((h) => h.includes("Retry")).length;
            if (retryCount >= 2) {
                return {
                    action: "END",
                    reason: "Application reached maximum retry attempts.",
                };
            }
            return {
                action: "RETRY",
                reason: "Recoverable application error detected.",
            };
        }

        if (state.jobs.length === 0) {
            if (!state.scrapingCompleted && (state.plannerAction === "SCRAPE" || /(?:scrape|scraping|portal|career page)/i.test(state.query || ""))) {
                return {
                    action: "SCRAPE",
                    reason: "Web scraping tech openings from company career portals and MNC sites.",
                };
            }
            if (!state.scrapingCompleted) {
                return {
                    action: "DISCOVER",
                    reason: "Discovering jobs matching query.",
                };
            }
            return {
                action: "END",
                reason: "No active openings found matching search query.",
            };
        }

        if (!state.evaluated) {
            return {
                action: "EVALUATE",
                reason: "Evaluating discovered jobs.",
            };
        }

        if (!state.ranked) {
            return {
                action: "RANK",
                reason: "Ranking evaluated jobs.",
            };
        }

        if (state.selectedJobs.length > 0 && state.tailoringInstructions.length === 0) {
            return {
                action: "TAILOR",
                reason: "Tailoring resume for selected jobs.",
            };
        }

        if (state.selectedJobs.length > 0 && !state.application) {
            const hasWebScrapedJob = state.selectedJobs.some(
                (j) => j.source === "web_scraper" || j.platform === "web",
            );
            if (!state.autofillCompleted && (state.plannerAction === "AUTO_FILL" || hasWebScrapedJob)) {
                return {
                    action: "AUTO_FILL",
                    reason: "Agentic auto data filling for web-scraped openings and company portals.",
                };
            }
            if (!state.autofillCompleted) {
                return {
                    action: "APPLY",
                    reason: "Applying to selected jobs.",
                };
            }
            return {
                action: "END",
                reason: "Application workflow finished for selected jobs.",
            };
        }

        if (state.application && state.application.status === "RUNNING") {
            return {
                action: "VERIFY",
                reason: "Verifying submitted application.",
            };
        }

        if (state.applications.length > 0 && (!state.application || state.application.status === "SUBMITTED")) {
            return {
                action: "PERSIST",
                reason: "Persisting application results.",
            };
        }

        return {
            action: "END",
            reason: "Workflow reached end condition.",
        };
    }
}

export default new PlannerService();