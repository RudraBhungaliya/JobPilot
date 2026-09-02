import { z } from "zod";

export const createApplicationSchema = z.object({
    jobId: z.string().cuid(),

    resumeId: z.string().cuid(),
});

export const updateApplicationSchema =
    z.object({
        status: z.enum([
            "PENDING",
            "MATCHED",
            "QUEUED",
            "RUNNING",
            "SUBMITTED",
            "FAILED",
            "SKIPPED",
            "WAITING_FOR_USER",
        ]),
        attempts: z.number().int().optional(),
        appliedAt: z.coerce.date().optional(),
        failureReason:
            z.string().nullable().optional(),
    });

export type CreateApplicationDTO =
    z.infer<
        typeof createApplicationSchema
    >;

export type UpdateApplicationDTO =
    z.infer<
        typeof updateApplicationSchema
    >;