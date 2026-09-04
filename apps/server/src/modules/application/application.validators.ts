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
<<<<<<< HEAD
            "WAITING_FOR_USER",
        ]),
        attempts: z.number().int().optional(),
        appliedAt: z.coerce.date().optional(),
        failureReason:
            z.string().nullable().optional(),
    });
=======
        ])
        .optional(),
    attempts: z.number().int().optional(),
    failureReason: z.string().nullable().optional(),
    // Tailoring notes persisted by the AI for this specific application
    tailoringNotes: z.record(z.string(), z.unknown()).nullable().optional(),
});
>>>>>>> 75ce97492af7e4d89d96cb0094053166cd490656

export type CreateApplicationDTO = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationDTO = z.infer<typeof updateApplicationSchema>;