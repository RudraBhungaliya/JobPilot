import { z } from "zod";

export const createProfileSchema = z.object({
    firstName: z.string().min(1).max(100),

    middleName: z.string().max(100).optional(),

    lastName: z.string().min(1).max(100),

    phone: z.string().min(5).max(30),

    github: z.string().url().optional(),

    linkedin: z.string().url().optional(),

    portfolio: z.string().url().optional(),

    website: z.string().url().optional(),

    codeforces: z.string().optional(),

    leetcode: z.string().optional(),

    workMode: z.enum([
        "REMOTE",
        "HYBRID",
        "ONSITE",
    ]),

    employmentType: z.enum([
        "FULL_TIME",
        "PART_TIME",
        "CONTRACT",
        "INTERNSHIP",
    ]),
});

export const updateProfileSchema =
    createProfileSchema.partial();

export type CreateProfileDTO =
    z.infer<typeof createProfileSchema>;

export type UpdateProfileDTO =
    z.infer<typeof updateProfileSchema>;