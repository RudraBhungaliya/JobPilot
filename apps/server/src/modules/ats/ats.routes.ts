import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";
import atsController from "./ats.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
    "/analyze",
    atsController.analyze.bind(
        atsController,
    ),
);

export default router;