import { z } from "zod";

export const checkpointSchema = z.object({
    threadId: z.string(),
    namespace: z.string(),
    node: z.string(),
    state: z.unknown(),
    metadata: z
        .record(z.string(), z.unknown())
        .optional(),
});

export type CheckpointDTO =
    z.infer<typeof checkpointSchema>;