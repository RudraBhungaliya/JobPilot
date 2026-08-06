export type WorkflowStatus =
    | "IDLE"
    | "RUNNING"
    | "PAUSED"
    | "COMPLETED"
    | "FAILED";

export interface WorkflowJob {
    applicationId: string;

    jobId: string;

    resumeId: string;

    priority: number;
}

export interface WorkflowResult {
    success: boolean;

    message: string;
}