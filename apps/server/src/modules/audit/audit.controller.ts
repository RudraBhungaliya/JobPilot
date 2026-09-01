import type {
    Request,
    Response,
} from "express";

import auditService from "./audit.service.js";

import {
    createAuditLogSchema,
    auditLogListSchema,
} from "./audit.validators.js";

class AuditController {
    async getLogs(
        req: Request,
        res: Response,
    ) {
        const options =
            auditLogListSchema.parse(
                req.query,
            );

        const logs =
            await auditService.getLogs(
                req.user.id,
                options,
            );

        return res.status(200).json(logs);
    }

    async getLog(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const log =
            await auditService.getLog(
                req.user.id,
                id,
            );

        if (!log) {
            return res.status(404).json({
                message:
                    "Audit log not found.",
            });
        }

        return res.status(200).json(log);
    }

    async createLog(
        req: Request,
        res: Response,
    ) {
        const data =
            createAuditLogSchema.parse(
                req.body,
            );

        const log =
            await auditService.create(
                req.user.id,
                data,
            );

        return res.status(201).json(log);
    }

    async getApplicationLogs(
        req: Request,
        res: Response,
    ) {
        const applicationId = Array.isArray(req.params.applicationId)
            ? req.params.applicationId[0]
            : req.params.applicationId;

        const logs =
            await auditService.getApplicationLogs(
                req.user.id,
                applicationId,
            );

        return res.status(200).json(logs);
    }

    async getAgentRunLogs(
        req: Request,
        res: Response,
    ) {
        const agentRunId = Array.isArray(req.params.agentRunId)
            ? req.params.agentRunId[0]
            : req.params.agentRunId;

        const logs =
            await auditService.getAgentRunLogs(
                req.user.id,
                agentRunId,
            );

        return res.status(200).json(logs);
    }
}

export default new AuditController();