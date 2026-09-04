import { z } from "zod";

export const createApplicationSchema = z.object({
    jobId: z.string().cuid(),
    resumeId: z.string().cuid(),
});

export const updateApplicationSchema = z.object({
    status: z
        .enum([
            "PENDING",
            "MATCHED",
            "QUEUED",
            "RUNNING",
            "WAITING_FOR_USER",
            "SUBMITTED",
            "FAILED",
            "SKIPPED",
        ])
        .optional(),
    attempts: z.number().int().optional(),
    failureReason: z.string().nullable().optional(),
    // Tailoring notes persisted by the AI for this specific application
    tailoringNotes: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type CreateApplicationDTO = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationDTO = z.infer<typeof updateApplicationSchema>;