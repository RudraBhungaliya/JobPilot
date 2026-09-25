import { z } from "zod";
export type { Resume } from "@jobpilot/database";

export const uploadResumeSchema = z.object({
    // The UI can send a friendly title, but a file-only upload should work too.
    title: z.string().trim().min(1, "Title cannot be empty").optional(),
});

export type UploadResumeDTO = z.infer<typeof uploadResumeSchema>;
