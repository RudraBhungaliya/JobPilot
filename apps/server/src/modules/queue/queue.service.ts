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

// Persistent queue backed by PostgreSQL with in-memory fallback when database is offline/mocked.
class QueueService {
    private memoryJobs = new Map<string, QueueJob>();

    async enqueueAgentRun(input: EnqueueAgentRunInput): Promise<QueueJob> {
        try {
            // Deduplicate by runId if provided
            if (input.runId) {
                const existing = await prisma.queueJob.findFirst({
                    where: {
                        runId: input.runId,
                        status: { notIn: ["COMPLETED", "FAILED"] },
                    },
                });

                if (existing) return toQueueJob(existing);
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
        } catch {
            // In-memory fallback
            if (input.runId) {
                for (const job of this.memoryJobs.values()) {
                    if (job.runId === input.runId && job.status !== "COMPLETED" && job.status !== "FAILED") {
                        return job;
                    }
                }
            }

            const id = `mem-job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const job: QueueJob = {
                id,
                type: "AGENT_RUN",
                status: "QUEUED",
                userId: input.userId,
                query: input.query,
                resumeId: input.resumeId,
                runId: input.runId,
                attempts: 0,
                maxAttempts: input.maxAttempts ?? 3,
                createdAt: new Date(),
            };
            this.memoryJobs.set(id, job);
            return job;
        }
    }

    async getJob(id: string): Promise<QueueJob | null> {
        try {
            const row = await prisma.queueJob.findUnique({ where: { id } });
            return row ? toQueueJob(row) : this.memoryJobs.get(id) ?? null;
        } catch {
            return this.memoryJobs.get(id) ?? null;
        }
    }

    async getJobByRunId(runId: string): Promise<QueueJob | null> {
        try {
            const row = await prisma.queueJob.findFirst({
                where: {
                    runId,
                    status: { notIn: ["COMPLETED", "FAILED"] },
                },
            });
            if (row) return toQueueJob(row);
        } catch {
            // Fall through to memory
        }

        for (const job of this.memoryJobs.values()) {
            if (job.runId === runId && job.status !== "COMPLETED" && job.status !== "FAILED") {
                return job;
            }
        }
        return null;
    }

    async getPendingJobs(): Promise<QueueJob[]> {
        try {
            const rows = await prisma.queueJob.findMany({
                where: { status: "QUEUED" },
                orderBy: { createdAt: "asc" },
            });
            return rows.map(toQueueJob);
        } catch {
            return Array.from(this.memoryJobs.values()).filter((j) => j.status === "QUEUED");
        }
    }

    async markRunning(id: string): Promise<QueueJob | null> {
        try {
            const row = await prisma.queueJob.update({
                where: { id },
                data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: new Date() },
            });
            return toQueueJob(row);
        } catch {
            const mem = this.memoryJobs.get(id);
            if (mem) {
                mem.status = "RUNNING";
                mem.attempts += 1;
                mem.startedAt = new Date();
                return mem;
            }
            return null;
        }
    }

    async markCompleted(id: string): Promise<QueueJob | null> {
        try {
            const row = await prisma.queueJob.update({
                where: { id },
                data: { status: "COMPLETED", completedAt: new Date() },
            });
            return toQueueJob(row);
        } catch {
            const mem = this.memoryJobs.get(id);
            if (mem) {
                mem.status = "COMPLETED";
                mem.completedAt = new Date();
                return mem;
            }
            return null;
        }
    }

    async markFailed(id: string, error: string): Promise<QueueJob | null> {
        try {
            const row = await prisma.queueJob.update({
                where: { id },
                data: { status: "FAILED", error, completedAt: new Date() },
            });
            return toQueueJob(row);
        } catch {
            const mem = this.memoryJobs.get(id);
            if (mem) {
                mem.status = "FAILED";
                mem.error = error;
                mem.completedAt = new Date();
                return mem;
            }
            return null;
        }
    }

    async markWaitingForUser(id: string): Promise<QueueJob | null> {
        try {
            const row = await prisma.queueJob.update({
                where: { id },
                data: { status: "WAITING_FOR_USER" },
            });
            return toQueueJob(row);
        } catch {
            const mem = this.memoryJobs.get(id);
            if (mem) {
                mem.status = "WAITING_FOR_USER";
                return mem;
            }
            return null;
        }
    }

    async resumeJob(id: string): Promise<QueueJob | null> {
        try {
            const existing = await prisma.queueJob.findUnique({ where: { id } });
            if (existing && existing.status === "WAITING_FOR_USER") {
                const row = await prisma.queueJob.update({
                    where: { id },
                    data: { status: "QUEUED", startedAt: null, completedAt: null },
                });
                return toQueueJob(row);
            }
        } catch {
            // Fall through to memory
        }

        const mem = this.memoryJobs.get(id);
        if (mem && mem.status === "WAITING_FOR_USER") {
            mem.status = "QUEUED";
            mem.startedAt = undefined;
            mem.completedAt = undefined;
            return mem;
        }
        return null;
    }

    async requeue(id: string): Promise<QueueJob | null> {
        try {
            const existing = await prisma.queueJob.findUnique({ where: { id } });
            if (existing) {
                if (existing.attempts >= existing.maxAttempts) {
                    return this.markFailed(id, existing.error ?? "Maximum retry attempts reached.");
                }

                const row = await prisma.queueJob.update({
                    where: { id },
                    data: { status: "QUEUED", startedAt: null, completedAt: null },
                });
                return toQueueJob(row);
            }
        } catch {
            // Fall through to memory
        }

        const mem = this.memoryJobs.get(id);
        if (mem) {
            if (mem.attempts >= mem.maxAttempts) {
                return this.markFailed(id, mem.error ?? "Maximum retry attempts reached.");
            }
            mem.status = "QUEUED";
            mem.startedAt = undefined;
            mem.completedAt = undefined;
            return mem;
        }
        return null;
    }
}

export default new QueueService();