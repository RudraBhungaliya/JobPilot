import notificationRepository from "./notification.repository.js";
import { eventEmitter } from "../../core/events/index.js";
import emailProvider from "./providers/email.provider.js";

import type {
    CreateNotificationDTO,
    NotificationListDTO,
} from "./notification.validators.js";

class NotificationService {
    async create(
        userId: string,
        data: CreateNotificationDTO,
    ) {
        const notification =
            await notificationRepository.create({
                userId,
                ...data,
            });

        // Push real-time SSE event to all connected clients for this user
        eventEmitter.emit({
            type: "notification.created",
            userId,
            notificationId: notification.id,
            notificationType: notification.type,
            title: notification.title,
            message: notification.message,
            timestamp:
                notification.createdAt.toISOString(),
        });

        return notification;
    }

    async sendEmailNotification(
        to: string,
        subject: string,
        html: string,
        text?: string,
    ) {
        return emailProvider.send({
            to,
            subject,
            html,
            text,
        });
    }

    async getNotifications(
        userId: string,
        options: NotificationListDTO,
    ) {
        return notificationRepository.findByUser(
            userId,
            options,
        );
    }

    async getNotification(
        userId: string,
        id: string,
    ) {
        return notificationRepository.findById(
            id,
            userId,
        );
    }

    async markRead(
        userId: string,
        id: string,
    ) {
        return notificationRepository.markRead(
            id,
            userId,
        );
    }

    async markAllRead(
        userId: string,
    ) {
        return notificationRepository.markAllRead(
            userId,
        );
    }

    async getUnreadCount(
        userId: string,
    ) {
        return notificationRepository.countUnread(
            userId,
        );
    }

    async delete(
        userId: string,
        id: string,
    ) {
        return notificationRepository.delete(
            id,
            userId,
        );
    }
}

export default new NotificationService();