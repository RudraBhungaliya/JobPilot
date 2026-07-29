import { z } from "zod";

export const updateProfileSchema = z.object({
    email: z.email().optional(),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .max(100)
        .optional(),
});

export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;