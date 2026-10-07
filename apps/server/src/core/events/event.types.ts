export type EventType =
    | "agent.started"
    | "agent.completed"
    | "agent.failed"
    | "agent.waiting_for_user"
    | "application.status_changed"
    | "human_action.required"
    | "human_action.resolved"
    | "notification.created"
    | "loop.started"
    | "loop.completed"
    | "loop.failed"
    | "job.discovered"
    | "queue.job_started"
    | "queue.job_completed"
    | "queue.job_failed"
    | "dashboard.stats_updated";

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
    companyName?: string;
    jobTitle?: string;
    reason?: string;
}

export interface HumanActionEvent extends BaseEvent {
    type: "human_action.required" | "human_action.resolved";
    applicationId: string;
    humanActionId: string;
    questionCount?: number;
    questions?: any[];
}

export interface NotificationEvent extends BaseEvent {
    type: "notification.created";
    notificationId: string;
    notificationType: string;
    title: string;
    message: string;
    applicationId?: string;
}

export interface LoopEvent extends BaseEvent {
    type: "loop.started" | "loop.completed" | "loop.failed";
    loopId: string;
    loopName?: string;
    discoveredCount?: number;
    newlyPersistedCount?: number;
    status?: string;
    error?: string;
}

export interface JobDiscoveredEvent extends BaseEvent {
    type: "job.discovered";
    jobId: string;
    title: string;
    company: string;
    url?: string;
    atsProvider?: string;
    matchScore?: number;
}

export interface QueueJobEvent extends BaseEvent {
    type: "queue.job_started" | "queue.job_completed" | "queue.job_failed";
    queueJobId: string;
    applicationId: string;
    company?: string;
    jobTitle?: string;
    status?: string;
    error?: string;
    confirmationId?: string;
}

export interface DashboardStatsEvent extends BaseEvent {
    type: "dashboard.stats_updated";
    stats?: Record<string, any>;
}

export type AppEvent =
    | AgentEvent
    | ApplicationStatusEvent
    | HumanActionEvent
    | NotificationEvent
    | LoopEvent
    | JobDiscoveredEvent
    | QueueJobEvent
    | DashboardStatsEvent;
