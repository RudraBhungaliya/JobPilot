import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";
import applicationController from "./application.controller.js";

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

export default router;