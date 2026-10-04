import type { ApplicationStatus } from "@jobpilot/database";
export type { ApplicationStatus };

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