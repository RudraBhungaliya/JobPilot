import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";
import auditController from "./audit.controller.js";

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    auditController.getLogs.bind(
        auditController,
    ),
);

router.post(
    "/",
    auditController.createLog.bind(
        auditController,
    ),
);

router.get(
    "/applications/:applicationId",
    auditController.getApplicationLogs.bind(
        auditController,
    ),
);

router.get(
    "/agent-runs/:agentRunId",
    auditController.getAgentRunLogs.bind(
        auditController,
    ),
);

router.get(
    "/:id",
    auditController.getLog.bind(
        auditController,
    ),
);

export default router;