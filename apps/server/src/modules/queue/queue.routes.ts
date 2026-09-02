import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";

import queueController from "./queue.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
    "/agent-run",
    queueController.enqueueAgentRun.bind(
        queueController,
    ),
);

router.get(
    "/pending",
    queueController.getPendingJobs.bind(
        queueController,
    ),
);

router.get(
    "/:id",
    queueController.getJob.bind(
        queueController,
    ),
);

export default router;