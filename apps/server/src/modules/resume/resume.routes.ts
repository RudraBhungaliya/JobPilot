import { Router } from "express";
import multer from "multer";

import authMiddleware from "../auth/auth.middleware.js";
import resumeController from "./resume.controller.js";

const upload = multer({
    dest: "uploads/resumes",
});

const router = Router();

// Text-only resume parsing route (open with optional auth)
router.post("/parse-text", (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        return authMiddleware(req, res, () => resumeController.parseTextDirect(req, res));
    }
    return resumeController.parseTextDirect(req, res);
});

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