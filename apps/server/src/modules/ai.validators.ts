import { z } from "zod";

export const rankJobSchema = z.object({
    resumeText : z.string(),
    jobDescription : z.string(),
});

export const tailorResumeSchema = z.object({
    resumeText: z.string(),

    jobDescription: z.string(),
});

export const coverLetterSchema = z.object({
    resumeText: z.string(),

    jobDescription: z.string(),

    company: z.string(),

    role: z.string(),
});

export type RankJobDTO =
    z.infer<typeof rankJobSchema>;

export type TailorResumeDTO =
    z.infer<typeof tailorResumeSchema>;

export type CoverLetterDTO =
    z.infer<typeof coverLetterSchema>;