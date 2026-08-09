import plannerService from "./planner.service.js";

import type { AgentState } from "./state.js";

class ExecutorService {
    async execute(
        state : AgentState,
    ) : Promise<AgentState>{
        return plannerService.plan(state);
    }
}

export default new ExecutorService();