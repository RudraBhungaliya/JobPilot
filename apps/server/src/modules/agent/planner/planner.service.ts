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
                    Boolean(
                        state.application,
                    ),
                hasBrowser:
                    Boolean(state.browser),
                errorCount:
                    state.errors.length,
                evaluated:
                    state.evaluated,
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

        return parsed as PlannerDecision;
    }
}

export default new PlannerService();