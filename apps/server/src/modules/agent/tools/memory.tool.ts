import { checkpointService } from "../../../core/checkpoint/index.js";

import type { AgentCheckpoint } from "../../../core/checkpoint/index.js";

class MemoryTool {
  save(checkpoint: AgentCheckpoint) {
    return checkpointService.save(checkpoint);
  }

  load(threadId: string) {
    return checkpointService.get(threadId);
  }

  has(threadId: string) {
    return checkpointService.has(threadId);
  }

  clear(threadId: string) {
    return checkpointService.delete(threadId);
  }
}

export default new MemoryTool();
