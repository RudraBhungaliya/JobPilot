import type {
    EnqueueAgentRunInput,
    QueueJob,
} from "./queue.types.js";

class QueueService {
    private jobs = new Map<string, QueueJob>();

    enqueueAgentRun(
        input: EnqueueAgentRunInput,
    ): QueueJob {
        const existing = Array.from(
            this.jobs.values(),
        ).find(
            (job) =>
                (input.runId ? job.runId === input.runId : false) &&
                job.status !== "COMPLETED" &&
                job.status !== "FAILED",
        );

        if (existing) {
            return existing;
        }

        const job: QueueJob = {
            id: `queue-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`,
            type: "AGENT_RUN",
            runId: input.runId,
            userId: input.userId,
            query: input.query,
            resumeId: input.resumeId,
            status: "QUEUED",
            attempts: 0,
            maxAttempts:
                input.maxAttempts ?? 3,
            createdAt: new Date(),
        };

        this.jobs.set(job.id, job);

        return job;
    }

    getJob(
        id: string,
    ): QueueJob | null {
        return this.jobs.get(id) ?? null;
    }

    getPendingJobs(): QueueJob[] {
        return Array.from(
            this.jobs.values(),
        ).filter(
            (job) =>
                job.status === "QUEUED",
        );
    }

    markRunning(
        id: string,
    ): QueueJob | null {
        const job =
            this.jobs.get(id);

        if (!job) {
            return null;
        }

        job.status = "RUNNING";
        job.attempts += 1;
        job.startedAt = new Date();

        return job;
    }

    markCompleted(
        id: string,
    ): QueueJob | null {
        const job =
            this.jobs.get(id);

        if (!job) {
            return null;
        }

        job.status = "COMPLETED";
        job.completedAt = new Date();

        return job;
    }

    markFailed(
        id: string,
        error: string,
    ): QueueJob | null {
        const job =
            this.jobs.get(id);

        if (!job) {
            return null;
        }

        job.status = "FAILED";
        job.error = error;
        job.completedAt = new Date();

        return job;
    }

    requeue(
        id: string,
    ): QueueJob | null {
        const job =
            this.jobs.get(id);

        if (!job) {
            return null;
        }

        if (
            job.attempts >=
            job.maxAttempts
        ) {
            return this.markFailed(
                id,
                job.error ??
                    "Maximum retry attempts reached.",
            );
        }

        job.status = "QUEUED";
        job.startedAt = undefined;
        job.completedAt = undefined;

        return job;
    }
}

export default new QueueService();