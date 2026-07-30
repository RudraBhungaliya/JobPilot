import { Router } from "express";
import multer from "multer";

import authMiddleware from "../auth/auth.middleware.js";
import resumeController from "./resume.controller.js";

const upload = multer({
    dest: "uploads/resumes",
});

const router = Router();

router.post(
    "/",
    authMiddleware,
    upload.single("resume"),
    resumeController.create.bind(resumeController)
);

router.get(
    "/",
    authMiddleware,
    resumeController.getAll.bind(resumeController)
);

router.get(
    "/:id",
    authMiddleware,
    resumeController.getById.bind(resumeController)
);

router.delete(
    "/:id",
    authMiddleware,
    resumeController.delete.bind(resumeController)
);

export default router;