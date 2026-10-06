import { Router } from "express";
import authMiddlewares from "../auth/auth.middleware.js";
import jobController from "./job.controller.js";
import jobLiveController from "./job.live.controller.js";

const router = Router();

// Realtime live job feed
router.get("/live", (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        return authMiddlewares(req, res, () => jobLiveController.getLiveOpenings(req, res));
    }
    return jobLiveController.getLiveOpenings(req, res);
});

// Discovery reads public company career boards
router.get(
    "/discover",
    jobController.discover.bind(jobController)
);

router.post("/", authMiddlewares, jobController.create.bind(jobController));
router.get("/", authMiddlewares, jobController.getAll.bind(jobController));
router.get("/:id", authMiddlewares, jobController.getOne.bind(jobController));
router.patch("/:id", authMiddlewares, jobController.update.bind(jobController));
router.delete("/:id", authMiddlewares, jobController.delete.bind(jobController));

export default router;
