import { z } from "zod";

import aiTool from "./tools/ai.tool.js";

import {
    buildPlannerPrompt,
} from "./prompts/planner.prompt.js";

import type {
    AgentStateType,
} from "./state.js";

import type {
    PlannerDecision,
} from "./planner.types.js";

const plannerDecisionSchema =
    z.object({
        action: z.enum([
            "DISCOVER",
            "FETCH",
            "RANK",
            "TAILOR",
            "APPLY",
            "VERIFY",
            "PERSIST",
            "RETRY",
            "END",
        ]),
        reason: z.string(),
    });

class PlannerService {
    async decide(
        state: AgentStateType,
    ): Promise<PlannerDecision> {
        const prompt =
            buildPlannerPrompt({
                query: state.query,
                jobsCount: state.jobs.length,
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
            });

        const response =
            await aiTool.generate(
                prompt,
            );

        let parsed: unknown;

        try {
            parsed = JSON.parse(
                response,
            );
        } catch {
            throw new Error(
                "Planner returned invalid JSON.",
            );
        }

        return plannerDecisionSchema.parse(
            parsed,
        );
    }
}

export default new PlannerService();