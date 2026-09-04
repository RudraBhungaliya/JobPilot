import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";
import applicationController from "./application.controller.js";
import humanActionController from "../human-action/human-action.controller.js";
import humanActionRouter from "../human-action/human-action.routes.js";

const router = Router();

router.use(authMiddleware);

router.post(
    "/",
    applicationController.create.bind(
        applicationController,
    ),
);

router.get(
    "/",
    applicationController.getAll.bind(
        applicationController,
    ),
);

router.get(
    "/:id",
    applicationController.getOne.bind(
        applicationController,
    ),
);

router.patch(
    "/:id",
    applicationController.update.bind(
        applicationController,
    ),
);

router.delete(
    "/:id",
    applicationController.delete.bind(
        applicationController,
    ),
);

/**
 * POST /api/v1/applications/:id/resume
 * User submits answers for required fields → re-queues the application.
 */
router.post(
    "/:id/resume",
    humanActionController.resume.bind(
        humanActionController,
    ),
);

/**
 * GET /api/v1/applications/:id/human-actions
 * Returns pending question records for an application.
 */
router.use(
    "/:id/human-actions",
    humanActionRouter,
);

export default router;