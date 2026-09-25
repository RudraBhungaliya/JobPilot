import { Router } from "express";

import authMiddlewares from "../auth/auth.middleware.js";
import jobController from "./job.controller.js";

const router = Router();

// Discovery reads public company career boards and does not expose user data.
// Keep it unauthenticated so the web client can show a real, fresh feed before sign-in.
router.get(
    "/discover",
    jobController.discover.bind(jobController)
);

router.use(authMiddlewares);

router.post("/",
    jobController.create.bind(jobController)
);

router.get(
    "/",
    jobController.getAll.bind(jobController)
);

router.get(
    "/:id",
    jobController.getOne.bind(jobController)
);

router.patch(
    "/:id",
    jobController.update.bind(jobController)
);

router.delete(
    "/:id",
    jobController.delete.bind(jobController)
);

export default router;

