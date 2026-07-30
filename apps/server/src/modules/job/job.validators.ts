import { z } from "zod";

export const createJobSchema = z.object({
    company : z.string().min(1).max(100),
    title : z.string().min(1).max(100),
    location : z.string().min(1).max(100),
    url : z.url(),
});

export const updateJobSchema = z.object({
    status: z.enum([
        "SAVED",
        "APPLIED",
        "INTERVIEW",
        "OFFER",
        "REJECTED",
    ]).optional(),

    notes: z.string().max(5000).optional(),
});

export type CreateJobDTO = z.infer<typeof createJobSchema>;
export type UpdateJobDTO = z.infer<typeof updateJobSchema>;