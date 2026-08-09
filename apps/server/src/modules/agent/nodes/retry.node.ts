import type { AgentState } from "../state.js";

class RetryNode {
    async execute(
        state: AgentState,
    ): Promise<Partial<AgentState>> {

        return {};
    }
}

export default new RetryNode();