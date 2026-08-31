import { z } from "zod";

export const createNotificationSchema =
    z.object({
        type: z.enum([
            "APPLICATION_SUBMITTED",
            "APPLICATION_FAILED",
            "APPLICATION_STATUS",
            "AGENT_COMPLETED",
            "AGENT_FAILED",
            "SYSTEM",
        ]),

        title: z.string().min(1).max(200),

        message: z.string().min(1).max(2000),

        applicationId: z
            .string()
            .cuid()
            .optional(),

        agentRunId: z
            .string()
            .cuid()
            .optional(),
    });

export const notificationListSchema =
    z.object({
        unreadOnly: z
            .coerce
            .boolean()
            .default(false),

        limit: z
            .coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .default(20),

        offset: z
            .coerce
            .number()
            .int()
            .min(0)
            .default(0),
    });

export type CreateNotificationDTO =
    z.infer<
        typeof createNotificationSchema
    >;

export type NotificationListDTO =
    z.infer<
        typeof notificationListSchema
    >;