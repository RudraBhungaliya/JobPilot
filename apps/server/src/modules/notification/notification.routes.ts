import { Router } from "express";

import authMiddleware from "../auth/auth.middleware.js";
import notificationController from "./notification.controller.js";

const router = Router();

router.use(authMiddleware);

router.get(
    "/",
    notificationController.getNotifications.bind(notificationController),
);

router.post(
    "/",
    notificationController.createNotification.bind(notificationController),
);

router.get(
    "/unread-count",
    notificationController.getUnreadCount.bind(notificationController),
);

router.patch(
    "/read-all",
    notificationController.markAllRead.bind(notificationController),
);

router.patch(
    "/:id/read",
    notificationController.markRead.bind(notificationController),
);

router.get(
    "/:id",
    notificationController.getNotification.bind(notificationController),
);

router.delete(
    "/:id",
    notificationController.delete.bind(notificationController),
);

export default router;