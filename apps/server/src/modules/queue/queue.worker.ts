import queueService from "./queue.service.js";
import agentService from "../agent/agent.service.js";

class QueueWorker {
    private running = false;

    async processNext(): Promise<boolean> {
        if (this.running) {
            return false;
        }

        const jobs =
            await queueService.getPendingJobs();

        const job = jobs[0];

        if (!job) {
            return false;
        }

        this.running = true;

        try {
            await queueService.markRunning(
                job.id,
            );

            const result =
                await agentService.run({
                    userId: job.userId,
                    query: job.query,
                    resumeId:
                        job.resumeId ?? undefined,
                });

            // If the agent paused waiting for human input,
            // hold the queue job in WAITING_FOR_USER state
            // instead of marking it completed. The job will
            // be re-queued by queueService.resumeJob() after
            // the user submits answers via POST /applications/:id/resume.
            const waitingForUser =
                result.history.some((h) =>
                    h.includes("waiting for user input"),
                );

            if (waitingForUser) {
                await queueService.markWaitingForUser(
                    job.id,
                );
            } else {
                await queueService.markCompleted(
                    job.id,
                );
            }

            return true;
        } catch (error) {
            await queueService.markFailed(
                job.id,
                error instanceof Error
                    ? error.message
                    : "Queue job failed.",
            );

            return false;
        } finally {
            this.running = false;
        }
    }

    async start(
        intervalMs: number = 5000,
    ): Promise<void> {
        if (this.running) {
            return;
        }

        while (true) {
            await this.processNext();

            await new Promise<void>(
                (resolve) =>
                    setTimeout(
                        resolve,
                        intervalMs,
                    ),
            );
        }
    }
}

export default new QueueWorker();