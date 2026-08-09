import type { AgentState } from "../state.js";

class TailorNode {
    async execute(
        state: AgentState,
    ): Promise<Partial<AgentState>> {

        return {
            resume: state.resume,
        };
    }
}

export default new TailorNode();