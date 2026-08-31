import notificationRepository from "./notification.repository.js";

import type {
    CreateNotificationDTO,
    NotificationListDTO,
} from "./notification.validators.js";

class NotificationService {
    async create(
        userId: string,
        data: CreateNotificationDTO,
    ) {
        return notificationRepository.create({
            userId,
            ...data,
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