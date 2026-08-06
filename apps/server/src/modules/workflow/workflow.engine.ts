import schedulerService from "./scheduler.service.js";
import queueService from "./queue.service.js";

class WorkflowEngine {
  async execute(batchSize: number) {
    const applications = await schedulerService.schedule(batchSize);

    for (const application of applications) {
      try {
        await queueService.markRunning(application.id);

        /*
                    Browser

                    Adapter

                    Apply
                */

        await queueService.markCompleted(application.id);
      } catch (err) {
        await queueService.markFailed(
          application.id,
          err instanceof Error ? err.message : "Unknown error",
        );
      }
    }
  }
}

export default new WorkflowEngine();
