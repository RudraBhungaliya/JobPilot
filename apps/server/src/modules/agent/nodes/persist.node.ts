import type { AgentState } from "../state.js";

class PersistNode {
    async execute(
        state : AgentState,
) : Promise<Partial<AgentState>>{
        /*
            Store application
            later.
        */
        return {};
    }
}


export default new PersistNode();