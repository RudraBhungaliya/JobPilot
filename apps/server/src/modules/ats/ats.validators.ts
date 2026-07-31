import { z } from "zod";

export const analyzeResumeSchema = z.object({
    resumeId: z.string().cuid(),
});

export type AnalyzeResumeDTO = z.infer<
    typeof analyzeResumeSchema
>;