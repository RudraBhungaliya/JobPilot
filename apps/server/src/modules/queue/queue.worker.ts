import queueService from "./queue.service.js";
import agentService from "../agent/agent.service.js";

// Polls the persistent queue and dispatches agent runs.
// Picks up jobs that survived a server restart automatically.
class QueueWorker {
    private running = false;

    async processNext(): Promise<boolean> {
        if (this.running) return false;

        const jobs = await queueService.getPendingJobs();
        const job = jobs[0];

        if (!job) return false;

        this.running = true;

        try {
            await queueService.markRunning(job.id);

            const result = await agentService.run({
                userId: job.userId,
                query: job.query,
                resumeId: job.resumeId,
            });

            // Detect whether the graph paused waiting for human input
            const pausedForUser = result.history.some((h) =>
                h.includes("waiting for user input"),
            );

            if (pausedForUser) {
                await queueService.markWaitingForUser(job.id);
            } else {
                await queueService.markCompleted(job.id);
            }

            return true;
        } catch (error) {
            await queueService.markFailed(
                job.id,
                error instanceof Error ? error.message : "Queue job failed.",
            );

            return false;
        } finally {
            this.running = false;
        }
    }

    async start(intervalMs = 5000): Promise<void> {
        while (true) {
            await this.processNext();

            await new Promise<void>((resolve) =>
                setTimeout(resolve, intervalMs),
            );
        }
    }
}

export default new QueueWorker();