import type { Request, Response } from "express";
import applicationQueueService from "./application-queue.service.js";
import queueService from "./queue.service.js";
import queueWorker from "./queue.worker.js";
import { getEnv } from "../../config/env.js";

class QueueController {
    /**
     * Enqueue a persistent application into the execution pipeline
     */
    async enqueueApplication(req: Request, res: Response): Promise<void> {
        const { applicationId, priority, maxAttempts } = req.body;
        const userId = req.user.id;

        if (!applicationId) {
            res.status(400).json({ success: false, message: "applicationId is required." });
            return;
        }

        try {
            const { prisma } = await import("@jobpilot/database");
            const application = await prisma.application.findFirst({ where: { id: applicationId, userId }, select: { id: true } });
            if (!application) {
                res.status(404).json({ success: false, message: "Application not found." });
                return;
            }
            const queueRecord = await applicationQueueService.enqueue({
                applicationId,
                userId,
                priority: priority ? Number(priority) : 0,
                maxAttempts: maxAttempts ? Number(maxAttempts) : 3,
            });
            if (!queueRecord) {
                res.status(503).json({ success: false, message: "Application could not be added to the persistent queue." });
                return;
            }

            // Trigger worker processing cycle
            void queueWorker.processBatch();

            res.status(202).json({
                success: true,
                message: "Application queued successfully in persistent pipeline.",
                data: queueRecord,
            });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * Resume an application that was in WAITING_FOR_USER status
     */
    async resumeWaitingApplication(req: Request, res: Response): Promise<void> {
        const { applicationId, metadata } = req.body;
        const userId = req.user.id;

        if (!applicationId) {
            res.status(400).json({ success: false, message: "applicationId is required." });
            return;
        }

        try {
            const { prisma } = await import("@jobpilot/database");
            const application = await prisma.application.findFirst({
                where: { id: applicationId, userId },
                select: { id: true, status: true },
            });
            if (!application) {
                res.status(404).json({ success: false, message: "Application not found." });
                return;
            }
            if (application.status !== "WAITING_FOR_USER") {
                res.status(409).json({ success: false, message: "Application is not waiting for user input." });
                return;
            }
            const resumed = await applicationQueueService.resumeWaitingJob(applicationId, metadata);
            if (!resumed) {
                res.status(404).json({ success: false, message: "Queue record not found for application." });
                return;
            }

            void queueWorker.processBatch();

            res.status(200).json({
                success: true,
                message: "Application resumed and re-queued for execution.",
                data: resumed,
            });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * Get all queued / active application pipeline tasks for the user
     */
    async getUserQueue(req: Request, res: Response): Promise<void> {
        const userId = req.user.id;

        try {
            const queue = await applicationQueueService.getUserQueue(userId);
            res.status(200).json({ success: true, count: queue.length, data: queue });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    async enqueueAgentRun(req: Request, res: Response): Promise<void> {
        const { runId, query, resumeId, maxAttempts } = req.body;
        const userId = req.user.id;

        if (typeof query !== "string" || query.trim() === "") {
            res.status(400).json({ message: "Invalid query provided." });
            return;
        }

        const job = queueService.enqueueAgentRun({
            runId,
            userId,
            query: query.trim(),
            resumeId,
            maxAttempts,
        });

        void queueWorker.processNext();

        res.status(202).json({ job });
    }

    async getRateLimits(req: Request, res: Response): Promise<void> {
        const userId = req.user.id;
        const now = Date.now();
        const oneHourAgo = new Date(now - 60 * 60 * 1000);
        try {
            const { prisma } = await import("@jobpilot/database");
            const attempts = await prisma.application.findMany({
                where: {
                    userId,
                    statusTransitions: { some: { newStatus: "SUBMITTING", createdAt: { gte: oneHourAgo } } },
                },
                include: {
                    job: { include: { company: true } },
                    statusTransitions: {
                        where: { newStatus: "SUBMITTING", createdAt: { gte: oneHourAgo } },
                        orderBy: { createdAt: "desc" },
                    },
                },
            });
            const maxPerHour = getEnv().APPLY_RATE_PER_HOUR_PER_COMPANY;
            const minDelayMs = getEnv().APPLY_MIN_DELAY_MS;
            const grouped = new Map<string, { tier: string; timestamps: number[] }>();
            for (const attempt of attempts) {
                const company = attempt.job.company.name;
                const group = grouped.get(company) || { tier: attempt.job.company.tier || "Unclassified", timestamps: [] };
                group.timestamps.push(...attempt.statusTransitions.map((transition) => transition.createdAt.getTime()));
                grouped.set(company, group);
            }
            const result = Array.from(grouped, ([company, group]) => {
                const lastAppliedTime = Math.max(...group.timestamps);
                const cooldownRemainingSeconds = Math.max(0, Math.ceil((lastAppliedTime + minDelayMs - now) / 1000));
                const status = group.timestamps.length >= maxPerHour ? "COOLDOWN" : cooldownRemainingSeconds > 0 ? "PACING" : "READY";
                return { company, tier: group.tier, appliedThisHour: group.timestamps.length, maxPerHour, cooldownRemainingSeconds, status };
            });

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message || "Failed to load rate limits" });
        }
    }

    async dispatchBatch(req: Request, res: Response): Promise<void> {
        const { jobIds } = req.body;
        const userId = req.user.id;
        if (!Array.isArray(jobIds) || jobIds.length === 0 || jobIds.length > 25 || jobIds.some((id) => typeof id !== "string")) {
            res.status(400).json({ success: false, message: "Provide between 1 and 25 saved job IDs." });
            return;
        }

        try {
            const { prisma } = await import("@jobpilot/database");
            const resume = await prisma.resume.findFirst({
                where: { userId, status: "READY", extractedText: { not: null } },
                orderBy: { updatedAt: "desc" },
                select: { id: true },
            });
            if (!resume) {
                res.status(400).json({ success: false, message: "Save a parsed resume before queuing applications." });
                return;
            }
            const uniqueIds = [...new Set(jobIds as string[])];
            const jobs = await prisma.job.findMany({ where: { id: { in: uniqueIds }, userId }, include: { company: true } });
            if (jobs.length !== uniqueIds.length) {
                res.status(404).json({ success: false, message: "One or more jobs were not found in this account." });
                return;
            }

            const results: any[] = [];
            for (const job of jobs) {
                const application = await prisma.application.upsert({
                    where: { userId_jobId: { userId, jobId: job.id } },
                    update: {},
                    create: { userId, jobId: job.id, resumeId: resume.id, status: "SAVED", companyKey: job.company.name.toLowerCase() },
                });
                const queueableStatuses = new Set(["SAVED", "DISCOVERED", "MATCHED", "FAILED", "REJECTED", "WITHDRAWN", "ARCHIVED", "SKIPPED", "RETRYING"]);
                if (!queueableStatuses.has(application.status)) {
                    results.push({ jobId: job.id, title: job.title, company: job.company.name, applicationId: application.id, status: "SKIPPED", error: `Application is already in ${application.status} and cannot be queued from this action.` });
                    continue;
                }
                const queueRecord = await applicationQueueService.enqueue({ applicationId: application.id, userId });
                if (!queueRecord) throw new Error(`Application for ${job.title} could not be added to the persistent queue.`);
                results.push({
                    jobId: job.id, title: job.title, company: job.company.name, applicationId: application.id,
                    queueJobId: queueRecord.id, canonicalUrl: job.url, location: job.location,
                    atsProvider: job.atsProvider, status: "QUEUED",
                });
            }

            void queueWorker.processBatch();
            const queuedCount = results.filter((result) => result.status === "QUEUED").length;
            res.status(queuedCount > 0 ? 202 : 422).json({
                success: queuedCount > 0,
                message: `Queued ${queuedCount} of ${results.length} saved jobs.`,
                dispatchedCount: queuedCount,
                data: results,
            });
        } catch (err: any) {
            res.status(500).json({ success: false, message: err.message || "Unable to queue saved jobs." });
        }
    }

    async getWorkerStatus(req: Request, res: Response): Promise<void> {
        res.status(200).json({
            success: true,
            data: {
                activeWorkers: queueWorker.activeCount,
                concurrency: queueWorker.concurrency,
                isWorkerActive: queueWorker.isRunning(),
                pollingIntervalMs: 2000,
                status: queueWorker.activeCount > 0 ? "PROCESSING" : (queueWorker.isRunning() ? "POLLING_ACTIVE" : "STOPPED"),
                lastHeartbeat: new Date().toISOString(),
            },
        });
    }

    async getJob(
        req: Request,
        res: Response,
    ): Promise<void> {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : String(req.params.id);

        const job = await queueService.getJob(id);

        if (!job) {
            res.status(404).json({ message: "Queue job not found." });
            return;
        }

        if (job.userId !== req.user.id) {
            res.status(403).json({ message: "You do not have access to this queue job." });
            return;
        }

        res.status(200).json({ job });
    }

    async getPendingJobs(
        req: Request,
        res: Response,
    ): Promise<void> {
        const jobs = (await queueService.getPendingJobs()).filter(
            (job) => job.userId === req.user.id,
        );

        res.status(200).json({
            jobs,
        });
    }
}

export default new QueueController();
