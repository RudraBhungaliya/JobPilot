import { z } from "zod";

export const createProfileSchema = z.object({
    firstName: z.string().min(1).max(100),
    middleName: z.string().max(100).optional().nullable(),
    lastName: z.string().min(1).max(100),
    email: z.string().email().optional().nullable(),
    phone: z.string().min(5).max(30),
    dateOfBirth: z.coerce.date().optional().nullable(),
    gender: z.string().optional().nullable(),
    nationality: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    zipCode: z.string().optional().nullable(),
    currentTitle: z.string().optional().nullable(),
    currentCompany: z.string().optional().nullable(),
    yearsOfExperience: z.number().optional().nullable(),
    expectedSalary: z.number().optional().nullable(),
    currentSalary: z.number().optional().nullable(),
    noticePeriod: z.number().optional().nullable(),
    github: z.string().optional().nullable(),
    linkedin: z.string().optional().nullable(),
    portfolio: z.string().optional().nullable(),
    website: z.string().optional().nullable(),
    codeforces: z.string().optional().nullable(),
    leetcode: z.string().optional().nullable(),
    workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]).default("HYBRID"),
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]).default("FULL_TIME"),
    willingToRelocate: z.boolean().default(false),
    willingToTravel: z.boolean().default(false),
    remoteOnly: z.boolean().default(false),
    sponsorshipRequired: z.boolean().default(false),
    visaStatus: z.string().optional().nullable(),
    governmentEmployee: z.boolean().default(false),
    militaryService: z.boolean().default(false),
    veteran: z.boolean().default(false),
    criminalRecord: z.boolean().default(false),
    securityClearance: z.boolean().default(false),
    disability: z.boolean().default(false),
    summary: z.string().optional().nullable(),
});

export const updateProfileSchema = createProfileSchema.partial();

export type CreateProfileDTO = z.infer<typeof createProfileSchema>;
export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;
