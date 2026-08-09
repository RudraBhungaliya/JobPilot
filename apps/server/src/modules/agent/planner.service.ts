import type { AgentState } from "./state.js";

class PlanarService {
    async plan(
        state : AgentState
    ) : Promise<AgentState> {
        /*
            LangGraph planner will
            decide the next node later.
        */
        return state;
    }
}

export default new PlanarService();