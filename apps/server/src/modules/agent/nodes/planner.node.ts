import plannerService from "../planner.service.js";

import type {
    AgentStateType,
    AgentStateUpdate,
} from "../state.js";

class PlannerNode {
    async execute(
        state : AgentStateType,
    ) : Promise<AgentStateUpdate> {
        const decision = await plannerService.decide(state);

        return {
            plannerAction : decision.action,
            plannerReason : decision.reason,
            history : [
                ...state.history,
                `Planner: ${decision.action} - ${decision.reason}`,
            ],
        };
    }
}

export default new PlannerNode();