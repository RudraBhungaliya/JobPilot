import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";
import eventsController from "./events.controller.js";

const router = Router();

router.use(authMiddleware);

// GET /api/v1/events — opens an SSE stream for the authenticated user
router.get("/", eventsController.stream.bind(eventsController));

export default router;
