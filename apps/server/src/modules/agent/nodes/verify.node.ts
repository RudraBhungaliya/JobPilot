import type { AgentState } from 
"../state.js";

class VerifyNode {
    async execute(
        state : AgentState,
    ) : Promise<Partial<AgentState>>{
        return {};
    }
}

export default new VerifyNode();