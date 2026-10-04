import type { Request, Response } from "express";

import humanActionService from "./human-action.service.js";
import { resolveHumanActionSchema } from "./human-action.validators.js";

class HumanActionController {
    /**
     * GET /api/v1/applications/:id/human-actions
     * Returns all (pending) human-action records for an application.
     */
    async getPending(
        req: Request,
        res: Response,
    ) {
        const applicationId = Array.isArray(
            req.params.id,
        )
            ? req.params.id[0]
            : req.params.id;

        const actions =
            await humanActionService.getPendingActions(
                req.user.id,
                applicationId,
            );

        return res.status(200).json({
            success: true,
            data: actions,
        });
    }

    /**
     * POST /api/v1/applications/:id/resume
     * User submits answers → resolves the latest pending action and
     * re-queues the application for the agent.
     */
    async resume(
        req: Request,
        res: Response,
    ) {
        const applicationId = Array.isArray(
            req.params.id,
        )
            ? req.params.id[0]
            : req.params.id;

        const body =
            resolveHumanActionSchema.parse(req.body);

        // Find the latest pending action for this application
        const pending =
            await humanActionService.getPendingActions(
                req.user.id,
                applicationId,
            );

        if (pending.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "No pending human actions found for this application.",
            });
        }

        // Resolve the most recent one
        const latest = pending[0]!;

        const resolved =
            await humanActionService.resolveAction(
                req.user.id,
                latest.id,
                body.answers,
            );

        return res.status(200).json({
            success: true,
            data: resolved,
        });
    }
}

export default new HumanActionController();
