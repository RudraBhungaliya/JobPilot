import { z } from "zod";

export const createApplicationSchema = z.object({
    jobId: z.string().optional(),
    resumeId: z.string().optional(),
    jobTitle: z.string().optional(),
    companyName: z.string().optional(),
    companyDomain: z.string().optional(),
    jobUrl: z.string().optional(),
    location: z.string().optional(),
    workMode: z.string().optional(),
    salaryRange: z.string().optional(),
    atsProvider: z.string().optional(),
    matchScore: z.number().int().optional(),
    notes: z.string().optional(),
    status: z
        .enum([
            "SAVED",
            "TAILORING",
            "PENDING",
            "MATCHED",
            "WAITING_FOR_USER",
            "QUEUED",
            "RUNNING",
            "SUBMITTED",
            "INTERVIEW",
            "OFFER",
            "REJECTED",
            "FAILED",
            "SKIPPED",
        ])
        .optional(),
});

export const updateApplicationSchema = z.object({
    status: z
        .enum([
            "SAVED",
            "TAILORING",
            "PENDING",
            "MATCHED",
            "WAITING_FOR_USER",
            "QUEUED",
            "RUNNING",
            "SUBMITTED",
            "INTERVIEW",
            "OFFER",
            "REJECTED",
            "FAILED",
            "SKIPPED",
        ])
        .optional(),
    attempts: z.number().int().optional(),
    appliedAt: z.coerce.date().optional(),
    failureReason: z.string().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
    interviewRound: z.string().nullable().optional(),
    confirmationCode: z.string().nullable().optional(),
    matchScore: z.number().int().optional(),
    scorecard: z.record(z.string(), z.unknown()).nullable().optional(),
    // Tailoring notes persisted by the AI for this specific application
    tailoringNotes: z.record(z.string(), z.unknown()).nullable().optional(),
    // Questions answers submitted during human review
    questions: z.array(z.record(z.string(), z.unknown())).optional(),
});

export type CreateApplicationDTO = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationDTO = z.infer<typeof updateApplicationSchema>;