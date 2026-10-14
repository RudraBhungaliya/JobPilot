import { Router } from "express";
import multer from "multer";

import authMiddleware from "../auth/auth.middleware.js";
import resumeController from "./resume.controller.js";

import fs from "node:fs";
import path from "node:path";

const uploadDir = path.resolve(process.cwd(), "uploads/resumes");
try {
    fs.mkdirSync(uploadDir, { recursive: true });
} catch {
    // Ignore if already exists
}

const upload = multer({
    dest: uploadDir,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        const extension = file.originalname.split(".").pop()?.toLowerCase();
        callback(null, extension === "pdf" || extension === "docx" || extension === "txt");
    },
});

const router = Router();

// Text-only resume parsing route
router.post("/parse-text", (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        return authMiddleware(req, res, () => resumeController.parseTextDirect(req, res));
    }
    return resumeController.parseTextDirect(req, res);
});

// Preview parsing is ephemeral: the uploaded file is deleted after extraction
router.post(
    "/preview",
    upload.single("resume"),
    resumeController.preview.bind(resumeController)
);

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
