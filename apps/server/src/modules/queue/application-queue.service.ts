import { prisma } from "@jobpilot/database";
import type { QueueStatus } from "@jobpilot/database";
import ApplicationStateMachine from "../application/application-state-machine.js";
import logger from "../../core/logger/logger.js";

export interface EnqueueApplicationInput {
    applicationId: string;
    userId: string;
    priority?: number;
    maxAttempts?: number;
    availableAt?: Date;
}

export class ApplicationQueueService {
    private readonly DEFAULT_LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minute lock lease

    /**
     * Enqueue an application to the database-backed queue table.
     * Prevents duplicate queue items idempotently.
     */
    async enqueue(input: EnqueueApplicationInput) {
        try {
            const existing = await prisma.applicationQueue.findUnique({
                where: { applicationId: input.applicationId },
            });

            if (existing) {
                // If already queued or completed, return existing record
                if (existing.status === "QUEUED" || existing.status === "PROCESSING" || existing.status === "COMPLETED") {
                    return existing;
                }

                // If failed or cancelled, re-activate queue entry
                return await prisma.applicationQueue.update({
                    where: { id: existing.id },
                    data: {
                        status: "QUEUED",
                        availableAt: input.availableAt || new Date(),
                        lockedAt: null,
                        lockedBy: null,
                        lastError: null,
                        priority: input.priority ?? existing.priority,
                    },
                });
            }

            // Create new persistent database queue record
            const queueRecord = await prisma.applicationQueue.create({
                data: {
                    applicationId: input.applicationId,
                    userId: input.userId,
                    status: "QUEUED",
                    priority: input.priority ?? 0,
                    maxAttempts: input.maxAttempts ?? 3,
                    availableAt: input.availableAt || new Date(),
                },
            });

            // Sync application state machine to QUEUED
            try {
                await ApplicationStateMachine.transition({
                    applicationId: input.applicationId,
                    newStatus: "QUEUED",
                    reason: "Application added to persistent execution queue",
                    actor: "SYSTEM",
                });
            } catch (transitionErr) {
                logger.debug({ transitionErr }, "State machine transition failed during enqueue");
            }

            return queueRecord;
        } catch (err) {
            logger.debug({ err }, "ApplicationQueueService.enqueue error");
            return null;
        }
    }

    /**
     * Transactionally claim the next available job for processing.
     * Reclaims stale locks automatically to ensure crash-recovery.
     */
    async claimNext(workerId: string, leaseDurationMs = this.DEFAULT_LEASE_DURATION_MS) {
        try {
            const now = new Date();
            const staleThreshold = new Date(now.getTime() - leaseDurationMs);

            // 1. Reclaim any stale / abandoned locks from crashed workers
            await prisma.applicationQueue.updateMany({
                where: {
                    status: "PROCESSING",
                    lockedAt: { lt: staleThreshold },
                },
                data: {
                    status: "QUEUED",
                    lockedAt: null,
                    lockedBy: null,
                },
            });

            // 2. Find highest priority available job
            const candidate = await prisma.applicationQueue.findFirst({
                where: {
                    status: "QUEUED",
                    availableAt: { lte: now },
                    OR: [{ lockedAt: null }, { lockedAt: { lt: staleThreshold } }],
                },
                orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
                include: {
                    application: {
                        include: {
                            job: { include: { company: true } },
                            resume: true,
                            user: { include: { profile: true } },
                        },
                    },
                },
            });

            if (!candidate) {
                return null;
            }

            // 3. Atomically lock and claim candidate job
            const claimed = await prisma.applicationQueue.updateMany({
                where: {
                    id: candidate.id,
                    status: "QUEUED",
                },
                data: {
                    status: "PROCESSING",
                    lockedAt: now,
                    lockedBy: workerId,
                    startedAt: candidate.startedAt || now,
                    attempts: { increment: 1 },
                },
            });

            if (claimed.count === 0) {
                // Contention: claimed by another concurrent worker instance
                return null;
            }

            return await prisma.applicationQueue.findUnique({
                where: { id: candidate.id },
                include: {
                    application: {
                        include: {
                            job: { include: { company: true } },
                            resume: true,
                            user: { include: { profile: true } },
                        },
                    },
                },
            });
        } catch {
            return null;
        }
    }

    /**
     * Mark queue item as successfully finished
     */
    async markCompleted(id: string, metadata?: Record<string, any>) {
        try {
            const queueRecord = await prisma.applicationQueue.update({
                where: { id },
                data: {
                    status: "COMPLETED",
                    completedAt: new Date(),
                    lockedAt: null,
                    lockedBy: null,
                    lastError: null,
                },
            });

            try {
                await ApplicationStateMachine.transition({
                    applicationId: queueRecord.applicationId,
                    newStatus: "APPLIED",
                    reason: "Application workflow completed successfully",
                    metadata,
                    actor: "QUEUE_WORKER",
                });
            } catch (stateErr) {
                logger.debug({ stateErr }, "State machine transition failed during markCompleted");
            }

            return queueRecord;
        } catch (err) {
            logger.debug({ err }, "ApplicationQueueService.markCompleted error");
            return null;
        }
    }

    /**
     * Mark queue item as waiting for user intervention (CAPTCHA, 2FA, questions)
     */
    async markWaitingForUser(id: string, reason: string, metadata?: Record<string, any>) {
        try {
            const queueRecord = await prisma.applicationQueue.update({
                where: { id },
                data: {
                    status: "WAITING_FOR_USER",
                    lockedAt: null,
                    lockedBy: null,
                    lastError: reason,
                },
            });

            try {
                await ApplicationStateMachine.transition({
                    applicationId: queueRecord.applicationId,
                    newStatus: "WAITING_FOR_USER",
                    reason,
                    metadata,
                    actor: "QUEUE_WORKER",
                });
            } catch (stateErr) {
                logger.debug({ stateErr }, "State machine transition failed during markWaitingForUser");
            }

            return queueRecord;
        } catch (err) {
            logger.debug({ err }, "ApplicationQueueService.markWaitingForUser error");
            return null;
        }
    }

    /**
     * Resume a WAITING_FOR_USER job once user clears checkpoint
     */
    async resumeWaitingJob(applicationId: string, metadata?: Record<string, any>) {
        try {
            const queueRecord = await prisma.applicationQueue.findUnique({
                where: { applicationId },
            });

            if (!queueRecord) return null;

            const updated = await prisma.applicationQueue.update({
                where: { id: queueRecord.id },
                data: {
                    status: "QUEUED",
                    availableAt: new Date(),
                    lockedAt: null,
                    lockedBy: null,
                    lastError: null,
                },
            });

            try {
                await ApplicationStateMachine.transition({
                    applicationId,
                    newStatus: "READY_TO_SUBMIT",
                    reason: "User verification cleared; resuming submission pipeline.",
                    metadata,
                    actor: "USER",
                });
            } catch (stateErr) {
                logger.debug({ stateErr }, "State machine transition failed during resumeWaitingJob");
            }

            return updated;
        } catch (err) {
            logger.debug({ err }, "ApplicationQueueService.resumeWaitingJob error");
            return null;
        }
    }

    /**
     * Handle job failure with retry backoff or permanent failure marking
     */
    async markFailed(id: string, error: string, isTransient = true) {
        try {
            const queueRecord = await prisma.applicationQueue.findUnique({
                where: { id },
            });

            if (!queueRecord) return null;

            const canRetry = isTransient && queueRecord.attempts < queueRecord.maxAttempts;

            if (canRetry) {
                // Exponential backoff: 30s, 2m, 8m
                const backoffSeconds = Math.pow(4, queueRecord.attempts) * 30;
                const nextAvailable = new Date(Date.now() + backoffSeconds * 1000);

                const updated = await prisma.applicationQueue.update({
                    where: { id },
                    data: {
                        status: "RETRYING",
                        availableAt: nextAvailable,
                        lockedAt: null,
                        lockedBy: null,
                        lastError: error,
                    },
                });

                try {
                    await ApplicationStateMachine.transition({
                        applicationId: queueRecord.applicationId,
                        newStatus: "RETRYING",
                        reason: `Transient failure: ${error}. Retrying at ${nextAvailable.toLocaleTimeString()}`,
                        metadata: { attempt: queueRecord.attempts, nextAvailable },
                        actor: "QUEUE_WORKER",
                    });
                } catch (stateErr) {
                    logger.debug({ stateErr }, "State machine transition failed during markFailed retry");
                }

                return updated;
            }

            // Permanent failure
            const updated = await prisma.applicationQueue.update({
                where: { id },
                data: {
                    status: "FAILED",
                    completedAt: new Date(),
                    lockedAt: null,
                    lockedBy: null,
                    lastError: error,
                },
            });

            try {
                await ApplicationStateMachine.transition({
                    applicationId: queueRecord.applicationId,
                    newStatus: "FAILED",
                    reason: error,
                    actor: "QUEUE_WORKER",
                });
            } catch (stateErr) {
                logger.debug({ stateErr }, "State machine transition failed during permanent markFailed");
            }

            return updated;
        } catch (err) {
            logger.debug({ err }, "ApplicationQueueService.markFailed error");
            return null;
        }
    }

    /**
     * Fetch user's queue records and current status
     */
    async getUserQueue(userId: string) {
        try {
            return await prisma.applicationQueue.findMany({
                where: { userId },
                include: {
                    application: {
                        include: {
                            job: { include: { company: true } },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            });
        } catch {
            return [];
        }
    }
}

export const applicationQueueService = new ApplicationQueueService();

export default applicationQueueService;
