import type {
    Request,
    Response,
} from "express";

import workflowService from "./workflow.service.js";

import {
    retryWorkflowSchema,
    startWorkflowSchema,
} from "./workflow.validators.js";

class WorkflowController {

    async start(
        req: Request,
        res: Response,
    ) {

        const body =
            startWorkflowSchema.parse(
                req.body,
            );

        const result =
            await workflowService.start(
                body,
            );

        return res.status(200).json({
            success: true,
            data: result,
        });
    }

    async retry(
        req: Request,
        res: Response,
    ) {

        const body =
            retryWorkflowSchema.parse(
                req.body,
            );

        const result =
            await workflowService.retry(
                body,
            );

        return res.status(200).json({
            success: true,
            data: result,
        });
    }
}

export default new WorkflowController();