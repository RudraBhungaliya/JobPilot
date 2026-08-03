import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";
import crawlerController from "./crawler.controller.js";

const router = Router();

router.use(authMiddleware);

router.post(
    "/crawl",
    crawlerController.crawl.bind(
        crawlerController,
    ),
);

export default router;