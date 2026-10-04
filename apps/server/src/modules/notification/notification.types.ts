export type NotificationType =
    | "APPLICATION_SUBMITTED"
    | "APPLICATION_FAILED"
    | "APPLICATION_STATUS"
    | "AGENT_COMPLETED"
    | "AGENT_FAILED"
    | "HUMAN_ACTION_REQUIRED"
    | "SYSTEM";

export interface CreateNotificationInput {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    applicationId?: string;
    agentRunId?: string;
}

export interface NotificationListOptions {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
}