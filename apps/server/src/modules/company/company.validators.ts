import { z } from "zod";

export const createCompanySchema = z.object({
    name : z.string().min(1).max(100),
    website : z.string().url().optional(),
    linkedin : z.string().url().optional(),
    location : z.string().min(1).max(100).optional(),
});

export const updateCompanySchema =
    createCompanySchema.partial();

export type CreateCompanyDTO = z.infer<
    typeof createCompanySchema
>;

export type UpdateCompanyDTO = z.infer<
    typeof updateCompanySchema
>;