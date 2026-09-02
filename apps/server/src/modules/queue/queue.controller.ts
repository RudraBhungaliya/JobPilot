import type {
    Request,
    Response,
} from "express";

import queueService from "./queue.service.js";
import queueWorker from "./queue.worker.js";

class QueueController {
    async enqueueAgentRun(
        req : Request,
        res : Response,
    ) : Promise<void> {
        const {
            runId,
            query,
            resumeId,
            maxAttempts,
        } = req.body;

        const userId = req.user.id;

        if(
            typeof query !== "string" ||
            query.trim() === ""
        ){
            res.status(400).json({
                message: "Invalid query provided.",
            });
            return;
        }

        const job =
            queueService.enqueueAgentRun({
                runId,
                userId,
                query: query.trim(),
                resumeId,
                maxAttempts,
            });

        void queueWorker.processNext();

        res.status(202).json({
            job,
        });
    }

    async getJob(
        req: Request,
        res: Response,
    ): Promise<void> {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : String(req.params.id);

        const job =
            queueService.getJob(id);

        if (!job) {
            res.status(404).json({
                message:
                    "Queue job not found.",
            });

            return;
        }

        if (
            job.userId !==
            req.user.id
        ) {
            res.status(403).json({
                message:
                    "You do not have access to this queue job.",
            });

            return;
        }

        res.status(200).json({
            job,
        });
    }

    async getPendingJobs(
        req: Request,
        res: Response,
    ): Promise<void> {
        const jobs =
            queueService
                .getPendingJobs()
                .filter(
                    (job) =>
                        job.userId ===
                        req.user.id,
                );

        res.status(200).json({
            jobs,
        });
    }
}

export default new QueueController();