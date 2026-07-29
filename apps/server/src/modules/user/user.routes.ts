import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";
import userController from "./user.controller.js";

const router = Router();

router.get(
    "/me",
    authMiddleware,
    userController.profile.bind(userController)
);

router.patch(
    "/me",
    authMiddleware,
    userController.update.bind(userController)
);

router.delete(
    "/me",
    authMiddleware,
    userController.delete.bind(userController)
);

export default router;