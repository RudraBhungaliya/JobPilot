import type {
    Request,
    Response,
} from "express";

import agentService from "./agent.service.js";

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