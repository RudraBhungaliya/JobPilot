import type {
    Request,
    Response,
} from "express";

import notificationService from "./notification.service.js";

import {
    createNotificationSchema,
    notificationListSchema,
} from "./notification.validators.js";

class NotificationController {
    async getNotifications(
        req: Request,
        res: Response,
    ) {
        const userId = req.user.id;

        const options =
            notificationListSchema.parse(
                req.query,
            );

        const notifications =
            await notificationService.getNotifications(
                userId,
                options,
            );

        return res.status(200).json(
            notifications,
        );
    }

    async getNotification(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const notification =
            await notificationService.getNotification(
                req.user.id,
                id,
            );

        if (!notification) {
            return res
                .status(404)
                .json({
                    message:
                        "Notification not found.",
                });
        }

        return res.status(200).json(
            notification,
        );
    }

    async createNotification(
        req: Request,
        res: Response,
    ) {
        const data =
            createNotificationSchema.parse(
                req.body,
            );

        const notification =
            await notificationService.create(
                req.user.id,
                data,
            );

        return res
            .status(201)
            .json(notification);
    }

    async markRead(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        await notificationService.markRead(
            req.user.id,
            id,
        );

        return res.status(204).send();
    }

    async markAllRead(
        req: Request,
        res: Response,
    ) {
        await notificationService.markAllRead(
            req.user.id,
        );

        return res.status(204).send();
    }

    async getUnreadCount(
        req: Request,
        res: Response,
    ) {
        const count =
            await notificationService.getUnreadCount(
                req.user.id,
            );

        return res.status(200).json({
            count,
        });
    }

    async delete(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        await notificationService.delete(
            req.user.id,
            id,
        );

        return res.status(204).send();
    }
}

export default new NotificationController();