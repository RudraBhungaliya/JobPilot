import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";
import humanActionController from "./human-action.controller.js";

const router = Router({ mergeParams: true });

router.use(authMiddleware);

/**
 * GET /api/v1/applications/:id/human-actions
 * List pending questions for an application.
 */
router.get(
    "/",
    humanActionController.getPending.bind(
        humanActionController,
    ),
);

export default router;
