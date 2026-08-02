import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";
import browserController from "./browser.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
    "/launch",
    browserController.launch.bind(browserController),
);

router.post(
    "/close",
    browserController.close.bind(browserController),
);

router.get(
    "/page",
    browserController.page.bind(browserController),
);

export default router;