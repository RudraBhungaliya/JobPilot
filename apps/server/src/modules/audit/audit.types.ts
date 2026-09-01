export type AuditAction =
    | "AGENT_STARTED"
    | "AGENT_COMPLETED"
    | "AGENT_FAILED"
    | "JOB_DISCOVERED"
    | "JOB_SELECTED"
    | "APPLICATION_CREATED"
    | "APPLICATION_STARTED"
    | "APPLICATION_SUBMITTED"
    | "APPLICATION_FAILED"
    | "APPLICATION_RETRIED"
    | "USER_ACTION_REQUIRED"
    | "USER_ACTION_COMPLETED"
    | "SYSTEM";

export interface CreateAuditLogInput {
    userId: string;
    action: AuditAction;
    description: string;
    agentRunId?: string;
    applicationId?: string;
    jobId?: string;
    metadata?: Record<string, unknown>;
}

export interface AuditLogListOptions {
    limit?: number;
    offset?: number;
    action?: AuditAction;
}