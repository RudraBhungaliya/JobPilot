import { Router } from "express";

import agentController from "./agent.controller.js";

const router = Router();

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