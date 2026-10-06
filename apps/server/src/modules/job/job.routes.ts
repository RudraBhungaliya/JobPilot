import { Router } from "express";
import authMiddlewares from "../auth/auth.middleware.js";
import jobController from "./job.controller.js";
import jobLiveController from "./job.live.controller.js";

const router = Router();

// Discovery and live ATS read public company career boards.
// Keep them unauthenticated so the web client can show real-time feeds without sign-in block.
router.get(
    "/live",
    (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            return authMiddlewares(req, res, () => jobController.liveJobs(req, res));
        }
        return jobController.liveJobs(req, res);
    }
);
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
