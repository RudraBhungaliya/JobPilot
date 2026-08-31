import { prisma } from "@jobpilot/database";

import type {
    CreateNotificationInput,
    NotificationListOptions,
} from "./notification.types.js";

class NotificationRepository {
    async create(
        data: CreateNotificationInput,
    ) {
        return prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                applicationId:
                    data.applicationId,
                agentRunId:
                    data.agentRunId,
            },
        });
    }

    async findByUser(
        userId: string,
        options: NotificationListOptions = {},
    ) {
        return prisma.notification.findMany({
            where: {
                userId,
                ...(options.unreadOnly
                    ? {
                          readAt: null,
                      }
                    : {}),
            },

            orderBy: {
                createdAt: "desc",
            },

            take: options.limit ?? 20,

            skip: options.offset ?? 0,
        });
    }

    async findById(
        id: string,
        userId: string,
    ) {
        return prisma.notification.findFirst({
            where: {
                id,
                userId,
            },
        });
    }

    async markRead(
        id: string,
        userId: string,
    ) {
        return prisma.notification.updateMany({
            where: {
                id,
                userId,
                readAt: null,
            },

            data: {
                readAt: new Date(),
            },
        });
    }

    async markAllRead(
        userId: string,
    ) {
        return prisma.notification.updateMany({
            where: {
                userId,
                readAt: null,
            },

            data: {
                readAt: new Date(),
            },
        });
    }

    async countUnread(
        userId: string,
    ) {
        return prisma.notification.count({
            where: {
                userId,
                readAt: null,
            },
        });
    }

    async delete(
        id: string,
        userId: string,
    ) {
        return prisma.notification.deleteMany({
            where: {
                id,
                userId,
            },
        });
    }
}

export default new NotificationRepository();