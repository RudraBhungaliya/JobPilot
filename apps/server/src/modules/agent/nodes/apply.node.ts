import type {AgentState } from "../state.js";

class ApplyNode {
    async execute(
        state : AgentState,
    ) : Promise<Partial<AgentState>>{
        /*
            Browser Tool
            later.
        */
        return {};
    }
}

export default new ApplyNode();