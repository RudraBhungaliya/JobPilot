import { Router } from "express";
import loopController from "./loop.controller.js";

const router = Router();

router.post("/", loopController.create);
router.get("/", loopController.getAll);
router.post("/execute-due", loopController.runDue);
router.get("/engine/status", loopController.getEngineStatus);
router.get("/:id", loopController.getById);
router.patch("/:id", loopController.update);
router.delete("/:id", loopController.delete);
router.post("/:id/run", loopController.run);
router.post("/:id/match", loopController.matchJobs);
router.get("/:id/matches", loopController.getMatches);
router.post("/:id/sync", loopController.syncPipeline);
router.get("/:id/pipeline", loopController.getPipelineStats);

export default router;

