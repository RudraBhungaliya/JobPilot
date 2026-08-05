import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";
import aiController from "./ai.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
    "/rank",
    aiController.rank.bind(
        aiController,
    ),
);

router.post(
    "/tailor",
    aiController.tailor.bind(
        aiController,
    ),
);

router.post(
    "/cover-letter",
    aiController.coverLetter.bind(
        aiController,
    ),
);

router.post(
    "/form",
    aiController.form.bind(
        aiController,
    ),
);

export default router;