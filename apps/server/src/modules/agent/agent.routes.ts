import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";
import agentController from "./agent.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
    "/run",
    agentController.run.bind(agentController),
);

router.get(
    "/runs",
    agentController.getRuns.bind(agentController),
);

router.get(
    "/runs/:threadId",
    agentController.getRun.bind(agentController),
);

export default router;