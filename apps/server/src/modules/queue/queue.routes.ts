import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";

import queueController from "./queue.controller.js";

const router = Router();

router.use(authMiddleware);

router.get(
    "/rate-limits",
    queueController.getRateLimits.bind(queueController),
);

router.post(
    "/dispatch-batch",
    queueController.dispatchBatch.bind(queueController),
);

router.get(
    "/worker-status",
    queueController.getWorkerStatus.bind(queueController),
);

router.get(
    "/recruiter-logs",
    queueController.getRecruiterLogs.bind(queueController),
);

router.post(
    "/send-recruiter-email",
    queueController.sendRecruiterEmail.bind(queueController),
);

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