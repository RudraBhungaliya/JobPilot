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
        if (state.errors.length > 0 && state.application && state.application.status === "FAILED") {
            return {
                action: "RETRY",
                reason: "Recoverable application error detected.",
            };
        }

        if (state.jobs.length === 0) {
            return {
                action: "DISCOVER",
                reason: "Discovering jobs matching query.",
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
            return {
                action: "APPLY",
                reason: "Applying to selected jobs.",
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