import { z } from "zod";
export type { Resume } from "@jobpilot/database";

export const uploadResumeSchema = z.object({
    title: z.string().min(1, "Title is required"),
});

export type UploadResumeDTO = z.infer<typeof uploadResumeSchema>;
