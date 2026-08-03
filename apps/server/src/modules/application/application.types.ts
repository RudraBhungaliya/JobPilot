export type ApplicationStatus =
    | "PENDING"
    | "MATCHED"
    | "QUEUED"
    | "RUNNING"
    | "SUBMITTED"
    | "FAILED"
    | "SKIPPED";

export interface JobApplication {
    id: string;

    jobId: string;

    userId: string;

    resumeId: string;

    status: ApplicationStatus;

    attempts: number;

    appliedAt: Date | null;

    failureReason: string | null;

    createdAt: Date;

    updatedAt: Date;
}