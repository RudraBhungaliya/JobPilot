import type { Request, Response } from "express";
import applicationQueueService from "./application-queue.service.js";
import queueService from "./queue.service.js";
import queueWorker from "./queue.worker.js";

class QueueController {
    /**
     * Enqueue a persistent application into the execution pipeline
     */
    async enqueueApplication(req: Request, res: Response): Promise<void> {
        const { applicationId, priority, maxAttempts } = req.body;
        const userId = req.user?.id || req.body.userId;

        if (!applicationId) {
            res.status(400).json({ success: false, message: "applicationId is required." });
            return;
        }

        try {
            const queueRecord = await applicationQueueService.enqueue({
                applicationId,
                userId,
                priority: priority ? Number(priority) : 0,
                maxAttempts: maxAttempts ? Number(maxAttempts) : 3,
            });

            // Trigger worker processing cycle
            void queueWorker.processNext();

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

        if (!applicationId) {
            res.status(400).json({ success: false, message: "applicationId is required." });
            return;
        }

        try {
            const resumed = await applicationQueueService.resumeWaitingJob(applicationId, metadata);
            if (!resumed) {
                res.status(404).json({ success: false, message: "Queue record not found for application." });
                return;
            }

            void queueWorker.processNext();

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
        const userId = req.user?.id || String(req.query.userId);
        if (!userId) {
            res.status(400).json({ success: false, message: "User ID required." });
            return;
        }

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

    async getJob(req: Request, res: Response): Promise<void> {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
        const job = queueService.getJob(id);

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

    async getPendingJobs(req: Request, res: Response): Promise<void> {
        const jobs = queueService.getPendingJobs().filter((job) => job.userId === req.user.id);
        res.status(200).json({ jobs });
    }
}

export default new QueueController();