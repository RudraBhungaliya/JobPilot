import { Router } from "express";

import authController from "./auth.controller.js";

const router = Router();

router.post("/register", authController.register);

router.post("/login", authController.login);

router.post("/logout", authController.logout);

router.post("/refresh", authController.refresh);

router.get("/me", authController.me);

export default router;