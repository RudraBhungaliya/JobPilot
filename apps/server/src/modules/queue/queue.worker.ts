import queueService from "./queue.service.js";

import { agentService } from "../agent/index.js";

// Polls the persistent queue and dispatches agent runs.
// Picks up jobs that survived a server restart automatically.
class QueueWorker {
    private running = false;

    async processNext(): Promise<boolean> {
<<<<<<< HEAD
        if (this.running) {
            return false;
        }

        const job =
            queueService
                .getPendingJobs()[0];
=======
        if (this.running) return false;

        const jobs = await queueService.getPendingJobs();
        const job = jobs[0];
>>>>>>> 75ce97492af7e4d89d96cb0094053166cd490656

        if (!job) return false;

        const runningJob =
            queueService.markRunning(
                job.id,
            );

        if (!runningJob) {
            return false;
        }

        this.running = true;

        try {
<<<<<<< HEAD
            const result =
                await agentService.run({
                    userId:
                        runningJob.userId,
                    query:
                        runningJob.query,
                    resumeId:
                        runningJob.resumeId,
                }, runningJob.runId);

            if (
                result.status ===
                "COMPLETED"
            ) {
                queueService.markCompleted(
                    runningJob.id,
                );

                return true;
            }

            if (
                result.status ===
                "WAITING_FOR_USER"
            ) {
                queueService.markWaitingForUser(
                    runningJob.id,
                );

                return false;
            }

            const error =
                result.errors.join(
                    "; ",
                ) ||
                "Agent run failed.";

            if (
                runningJob.attempts <
                runningJob.maxAttempts
            ) {
                queueService.markFailed(
                    runningJob.id,
                    error,
                );

                queueService.requeue(
                    runningJob.id,
                );
            } else {
                queueService.markFailed(
                    runningJob.id,
                    error,
                );
            }

            return false;
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Agent execution failed.";

            if (
                runningJob.attempts <
                runningJob.maxAttempts
            ) {
                queueService.markFailed(
                    runningJob.id,
                    message,
                );

                queueService.requeue(
                    runningJob.id,
                );
            } else {
                queueService.markFailed(
                    runningJob.id,
                    message,
                );
            }
=======
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
>>>>>>> 75ce97492af7e4d89d96cb0094053166cd490656

            return false;
        } finally {
            this.running = false;
        }
    }

<<<<<<< HEAD
    async processAll(): Promise<void> {
        while (
            await this.processNext()
        ) {
            //
        }
    }

    isRunning(): boolean {
        return this.running;
=======
    async start(intervalMs = 5000): Promise<void> {
        while (true) {
            await this.processNext();

            await new Promise<void>((resolve) =>
                setTimeout(resolve, intervalMs),
            );
        }
>>>>>>> 75ce97492af7e4d89d96cb0094053166cd490656
    }
}

export default new QueueWorker();