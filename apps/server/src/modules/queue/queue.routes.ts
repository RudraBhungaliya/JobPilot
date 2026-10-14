import { Router } from "express";
import authMiddleware from "../auth/auth.middleware.js";
import queueController from "./queue.controller.js";

const router = Router();

router.use(authMiddleware);

router.post("/application", queueController.enqueueApplication.bind(queueController));
router.post("/resume", queueController.resumeWaitingApplication.bind(queueController));

router.get("/user", queueController.getUserQueue.bind(queueController));
router.get("/rate-limits", queueController.getRateLimits.bind(queueController));
router.post("/dispatch-batch", queueController.dispatchBatch.bind(queueController));
router.get("/worker-status", queueController.getWorkerStatus.bind(queueController));
router.post("/agent-run", queueController.enqueueAgentRun.bind(queueController));
router.get("/pending", queueController.getPendingJobs.bind(queueController));
router.get("/:id", queueController.getJob.bind(queueController));

export default router;
