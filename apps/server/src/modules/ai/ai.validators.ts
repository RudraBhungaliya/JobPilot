import { z } from "zod";

export const rankJobSchema = z.object({
    resumeText: z.string().min(1),

    jobDescription: z.string().min(1),
});

export const tailorResumeSchema = z.object({
    resumeText: z.string().min(1),

    jobDescription: z.string().min(1),
});

export const coverLetterSchema = z.object({
    resumeText: z.string().min(1),

    jobDescription: z.string().min(1),

    company: z.string().min(1),

    role: z.string().min(1),
});

export const formAnalysisSchema = z.object({
    html: z.string().min(1),
});

export type RankJobDTO =
    z.infer<typeof rankJobSchema>;

export type TailorResumeDTO =
    z.infer<typeof tailorResumeSchema>;

export type CoverLetterDTO =
    z.infer<typeof coverLetterSchema>;

export type FormAnalysisDTO =
    z.infer<typeof formAnalysisSchema>;