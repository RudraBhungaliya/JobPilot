import queueService from "./queue.service.js";

import { agentService } from "../agent/index.js";

class QueueWorker {
    private running = false;

    async processNext(): Promise<boolean> {
        if (this.running) {
            return false;
        }

        const job =
            queueService
                .getPendingJobs()[0];

        if (!job) {
            return false;
        }

        const runningJob =
            queueService.markRunning(
                job.id,
            );

        if (!runningJob) {
            return false;
        }

        this.running = true;

        try {
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