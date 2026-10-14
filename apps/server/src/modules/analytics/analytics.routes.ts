import { Router } from "express";
import authMiddleware from "../auth/auth.middleware.js";
import analyticsController from "./analytics.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/overview", analyticsController.getOverview.bind(analyticsController));
router.get("/funnel", analyticsController.getFunnel.bind(analyticsController));
router.get("/conversions", analyticsController.getConversions.bind(analyticsController));
router.get("/sources", analyticsController.getSources.bind(analyticsController));
router.get("/failures", analyticsController.getFailures.bind(analyticsController));
router.get("/activity", analyticsController.getActivity.bind(analyticsController));
router.post("/events", analyticsController.recordEvent.bind(analyticsController));

export default router;
