import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";
import profileController from "./profile.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
    "/",
    profileController.create.bind(
        profileController,
    ),
);

router.get(
    "/",
    profileController.get.bind(
        profileController,
    ),
);

router.patch(
    "/",
    profileController.update.bind(
        profileController,
    ),
);

router.delete(
    "/",
    profileController.delete.bind(
        profileController,
    ),
);

export default router;