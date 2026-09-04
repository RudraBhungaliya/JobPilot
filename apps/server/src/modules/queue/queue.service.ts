import { prisma } from "@jobpilot/database";

import type { EnqueueAgentRunInput, QueueJob } from "./queue.types.js";

// Maps a Prisma QueueJob row to the shared QueueJob interface.
function toQueueJob(row: {
    id: string;
    type: string;
    status: string;
    userId: string;
    query: string;
    resumeId: string | null;
    runId: string | null;
    attempts: number;
    maxAttempts: number;
    error: string | null;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
}): QueueJob {
    return {
        id: row.id,
        type: row.type as QueueJob["type"],
        status: row.status as QueueJob["status"],
        userId: row.userId,
        query: row.query,
        resumeId: row.resumeId ?? undefined,
        runId: row.runId ?? undefined,
        attempts: row.attempts,
        maxAttempts: row.maxAttempts,
        error: row.error ?? undefined,
        createdAt: row.createdAt,
        startedAt: row.startedAt ?? undefined,
        completedAt: row.completedAt ?? undefined,
    };
}

// Persistent queue backed by PostgreSQL — survives server restarts.
class QueueService {
    async enqueueAgentRun(input: EnqueueAgentRunInput): Promise<QueueJob> {
        // Deduplicate by runId if provided
        if (input.runId) {
            const existing = await prisma.queueJob.findFirst({
                where: {
                    runId: input.runId,
                    status: { notIn: ["COMPLETED", "FAILED"] },
                },
            });

<<<<<<< HEAD
    enqueueAgentRun(
        input: EnqueueAgentRunInput,
    ): QueueJob {
        const existing = Array.from(
            this.jobs.values(),
        ).find(
            (job) =>
                job.userId === input.userId &&
                (input.runId ? job.runId === input.runId : false) &&
                (job.status === "QUEUED" || job.status === "RUNNING" || job.status === "WAITING_FOR_USER"),
        ) || Array.from(this.jobs.values()).find(
            (job) =>
                job.userId === input.userId &&
                (job.status === "QUEUED" || job.status === "RUNNING"),
        );

        if (existing) {
            return existing;
=======
            if (existing) return toQueueJob(existing);
>>>>>>> 75ce97492af7e4d89d96cb0094053166cd490656
        }

        const row = await prisma.queueJob.create({
            data: {
                type: "AGENT_RUN",
                userId: input.userId,
                query: input.query,
                resumeId: input.resumeId,
                runId: input.runId,
                maxAttempts: input.maxAttempts ?? 3,
            },
        });

        return toQueueJob(row);
    }

    async getJob(id: string): Promise<QueueJob | null> {
        const row = await prisma.queueJob.findUnique({ where: { id } });
        return row ? toQueueJob(row) : null;
    }

<<<<<<< HEAD
    getJobByRunId(runId: string): QueueJob | null {
        return Array.from(this.jobs.values()).find((j) => j.runId === runId) ?? null;
    }

    getPendingJobs(): QueueJob[] {
        return Array.from(
            this.jobs.values(),
        ).filter(
            (job) =>
                job.status === "QUEUED",
        );
=======
    async getPendingJobs(): Promise<QueueJob[]> {
        const rows = await prisma.queueJob.findMany({
            where: { status: "QUEUED" },
            orderBy: { createdAt: "asc" },
        });

        return rows.map(toQueueJob);
>>>>>>> 75ce97492af7e4d89d96cb0094053166cd490656
    }

    async markRunning(id: string): Promise<QueueJob | null> {
        const row = await prisma.queueJob.update({
            where: { id },
            data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: new Date() },
        });

        return toQueueJob(row);
    }

    async markCompleted(id: string): Promise<QueueJob | null> {
        const row = await prisma.queueJob.update({
            where: { id },
            data: { status: "COMPLETED", completedAt: new Date() },
        });

        return toQueueJob(row);
    }

    async markFailed(id: string, error: string): Promise<QueueJob | null> {
        const row = await prisma.queueJob.update({
            where: { id },
            data: { status: "FAILED", error, completedAt: new Date() },
        });

        return toQueueJob(row);
    }

    async markWaitingForUser(id: string): Promise<QueueJob | null> {
        const row = await prisma.queueJob.update({
            where: { id },
            data: { status: "WAITING_FOR_USER" },
        });

        return toQueueJob(row);
    }

    async resumeJob(id: string): Promise<QueueJob | null> {
        const existing = await prisma.queueJob.findUnique({ where: { id } });
        if (!existing || existing.status !== "WAITING_FOR_USER") return null;

        const row = await prisma.queueJob.update({
            where: { id },
            data: { status: "QUEUED", startedAt: null, completedAt: null },
        });

        return toQueueJob(row);
    }

    async requeue(id: string): Promise<QueueJob | null> {
        const existing = await prisma.queueJob.findUnique({ where: { id } });
        if (!existing) return null;

        if (existing.attempts >= existing.maxAttempts) {
            return this.markFailed(id, existing.error ?? "Maximum retry attempts reached.");
        }

        const row = await prisma.queueJob.update({
            where: { id },
            data: { status: "QUEUED", startedAt: null, completedAt: null },
        });

<<<<<<< HEAD
        return job;
    }

    markWaitingForUser(
        id: string,
    ): QueueJob | null {
        const job = this.jobs.get(id);

        if (!job) {
            return null;
        }

        job.status = "WAITING_FOR_USER";
        return job;
    }

    resumeJob(
        id: string,
    ): QueueJob | null {
        const job = this.jobs.get(id);

        if (!job) {
            return null;
        }

        job.status = "QUEUED";
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
=======
        return toQueueJob(row);
>>>>>>> 75ce97492af7e4d89d96cb0094053166cd490656
    }
}

export default new QueueService();