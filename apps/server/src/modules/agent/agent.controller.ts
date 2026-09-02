import type {
    Request,
    Response,
} from "express";

import { randomUUID } from "node:crypto";
import agentService from "./agent.service.js";
import agentRepository from "./agent.repository.js";
import { queueService, queueWorker } from "../queue/index.js";
import auditService from "../audit/audit.service.js";

class AgentController {
    async run(
        req: Request,
        res: Response,
    ) {
        const result =
            await agentService.run({
                userId: req.user.id,
                query: req.body.query,
                resumeId:
                    req.body.resumeId,
            });

        return res.status(200).json(
            result,
        );
    }

    async autoApply(
        req: Request,
        res: Response,
    ) {
        const { query, resumeId, maxAttempts } = req.body;
        const userId = req.user.id;

        if (typeof query !== "string" || query.trim() === "") {
            return res.status(400).json({
                message: "Valid query is required for auto-apply.",
            });
        }

        const activeRun = await agentService.findActiveRun(userId);
        if (activeRun) {
            return res.status(409).json({
                message: "An active agent run is already in progress.",
                threadId: activeRun.threadId,
                status: activeRun.status,
            });
        }

        const threadId = randomUUID();
        await agentRepository.createRun(userId, threadId, query.trim());

        const job = queueService.enqueueAgentRun({
            runId: threadId,
            userId,
            query: query.trim(),
            resumeId,
            maxAttempts,
        });

        void queueWorker.processNext();

        return res.status(202).json({
            success: true,
            threadId,
            queueJob: job,
        });
    }

    async resumeRun(
        req: Request,
        res: Response,
    ) {
        const threadId = String(req.params.threadId);
        const userId = req.user.id;

        const run = await agentService.getRun(userId, threadId);
        if (!run) {
            return res.status(404).json({
                message: "Agent run not found.",
            });
        }

        await auditService.create(userId, {
            action: "USER_ACTION_COMPLETED",
            description: `User action completed for thread ${threadId}. Resuming execution.`,
            agentRunId: run.id,
        });

        let job = queueService.getJobByRunId(threadId);
        if (job) {
            queueService.resumeJob(job.id);
        } else {
            job = queueService.enqueueAgentRun({
                runId: threadId,
                userId,
                query: run.query,
            });
        }

        void queueWorker.processNext();

        return res.status(200).json({
            success: true,
            message: "Agent run resumed successfully.",
            threadId,
            queueJob: job,
        });
    }

    async getRun(
        req: Request,
        res: Response,
    ) {
        const threadId =
            String(req.params.threadId);

        const result =
            await agentService.getRun(
                req.user.id,
                threadId,
            );

        if (!result) {
            return res.status(404).json({
                message:
                    "Agent run not found.",
            });
        }

        return res.status(200).json(
            result,
        );
    }

    async getRuns(
        req: Request,
        res: Response,
    ) {
        const result =
            await agentService.getRuns(
                req.user.id,
            );

        return res.status(200).json(
            result,
        );
    }
}

export default new AgentController();