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

router.post(
    "/auto-apply",
    applicationController.autoApply.bind(
        applicationController,
    ),
);

router.post(
    "/sync",
    applicationController.syncJobs.bind(
        applicationController,
    ),
);

router.get(
    "/pipeline/stats",
    applicationController.getPipelineStats.bind(
        applicationController,
    ),
);

router.post(
    "/:id/resolve-checkpoint",
    applicationController.resolveCheckpoint.bind(
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

router.post(
    "/:id/resume",
    applicationController.resume.bind(
        applicationController,
    ),
);

router.post(
    "/discover-and-apply",
    applicationController.discoverAndApply.bind(
        applicationController,
    ),
);

router.post(
    "/:id/submit",
    applicationController.submit.bind(
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
 * GET /api/v1/applications/:id/human-actions
 * Returns pending question records for an application.
 */
router.use(
    "/:id/human-actions",
    humanActionRouter,
);

export default router;