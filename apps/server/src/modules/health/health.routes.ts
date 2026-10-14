import { Router } from "express";
import healthController from "./health.controller.js";

const router = Router();

router.get("/", healthController.getHealth.bind(healthController));
router.get("/live", healthController.getLiveness.bind(healthController));
router.get("/ready", healthController.getReadiness.bind(healthController));

export default router;
