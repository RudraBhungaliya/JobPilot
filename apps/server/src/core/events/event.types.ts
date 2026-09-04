export type EventType =
    | "agent.started"
    | "agent.completed"
    | "agent.failed"
    | "agent.waiting_for_user"
    | "application.status_changed"
    | "human_action.required"
    | "human_action.resolved"
    | "notification.created";

export interface BaseEvent {
    type: EventType;
    userId: string;
    timestamp: string;
}

export interface AgentEvent extends BaseEvent {
    type:
        | "agent.started"
        | "agent.completed"
        | "agent.failed"
        | "agent.waiting_for_user";
    threadId: string;
    status: string;
    message?: string;
}

export interface ApplicationStatusEvent extends BaseEvent {
    type: "application.status_changed";
    applicationId: string;
    status: string;
    jobId: string;
}

export interface HumanActionEvent extends BaseEvent {
    type: "human_action.required" | "human_action.resolved";
    applicationId: string;
    humanActionId: string;
    questionCount?: number;
}

export interface NotificationEvent extends BaseEvent {
    type: "notification.created";
    notificationId: string;
    title: string;
    message: string;
}

export type AppEvent =
    | AgentEvent
    | ApplicationStatusEvent
    | HumanActionEvent
    | NotificationEvent;
