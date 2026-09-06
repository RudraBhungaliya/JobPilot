import queueService from "./queue.service.js";

import { agentService } from "../agent/index.js";

// Polls the persistent queue and dispatches agent runs.
// Picks up jobs that survived a server restart automatically.
class QueueWorker {
    private running = false;

    async processNext(): Promise<boolean> {
        if (this.running) {
            return false;
        }

        const jobs = await queueService.getPendingJobs();
        const job = jobs[0];

        if (!job) return false;

        const runningJob = await queueService.markRunning(job.id);

        if (!runningJob) {
            return false;
        }

        this.running = true;

        try {
            // Pass runningJob.runId as existingThreadId so LangGraph resumes
            // the same checkpoint thread — critical for agent resume correctness.
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
                await queueService.markCompleted(
                    runningJob.id,
                );

                return true;
            }

            if (
                result.status ===
                "WAITING_FOR_USER"
            ) {
                await queueService.markWaitingForUser(
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
                await queueService.markFailed(
                    runningJob.id,
                    error,
                );

                await queueService.requeue(
                    runningJob.id,
                );
            } else {
                await queueService.markFailed(
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
                await queueService.markFailed(
                    runningJob.id,
                    message,
                );

                await queueService.requeue(
                    runningJob.id,
                );
            } else {
                await queueService.markFailed(
                    runningJob.id,
                    message,
                );
            }

            return false;
        } finally {
            this.running = false;
        }
    }

    async processAll(): Promise<void> {
        while (
            await this.processNext()
        ) {
            //
        }
    }

    isRunning(): boolean {
        return this.running;
    }
}

export default new QueueWorker();