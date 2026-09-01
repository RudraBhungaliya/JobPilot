export type QueueJobType =
    | "AGENT_RUN";

export type QueueJobStatus =
    | "QUEUED"
    | "RUNNING"
    | "COMPLETED"
    | "FAILED";

export interface QueueJob {
    id: string;
    type: QueueJobType;
    runId?: string;
    userId: string;
    query: string;
    resumeId?: string;
    status: QueueJobStatus;
    attempts: number;
    maxAttempts: number;
    error?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}

export interface EnqueueAgentRunInput {
    runId?: string;
    userId: string;
    query: string;
    resumeId?: string;
    maxAttempts?: number;
}