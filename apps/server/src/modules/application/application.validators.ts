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
        ]),
        attempts: z.number().int().optional(),
        failureReason:
            z.string().optional(),
    });

export type CreateApplicationDTO =
    z.infer<
        typeof createApplicationSchema
    >;

export type UpdateApplicationDTO =
    z.infer<
        typeof updateApplicationSchema
    >;