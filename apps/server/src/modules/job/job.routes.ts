import { Router } from "express";

import authMiddlewares from "../auth/auth.middleware.js";
import jobController from "./job.controller.js";

const router = Router();

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

