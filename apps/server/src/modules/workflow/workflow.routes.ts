import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";
import workflowController from "./workflow.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
    "/start",
    workflowController.start.bind(
        workflowController,
    ),
);

router.post(
    "/retry",
    workflowController.retry.bind(
        workflowController,
    ),
);

export default router;