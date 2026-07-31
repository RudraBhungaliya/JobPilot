export type JobStatus =
    | "SAVED"
    | "APPLIED"
    | "INTERVIEW"
    | "OFFER"
    | "REJECTED";

export interface JobEntity {
    id: string;
    userId: string;

    company: string;
    title: string;
    location: string;
    url: string;

    status: JobStatus;
    notes: string | null;

    createdAt: Date;
    updatedAt: Date;
}