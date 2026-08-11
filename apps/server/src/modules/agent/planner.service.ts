import type { 
    AgentStateType,
    AgentStateUpdate,
} from "./state.js";

class PlanarService {
    async plan(
        state : AgentStateType
    ) : Promise<AgentStateUpdate> {
        /*
            LangGraph planner will
            decide the next node later.
        */
        return {
            history : [
                ...state.history,
                "Agent execution started",
            ],
        }
    }
}

export default new PlanarService();