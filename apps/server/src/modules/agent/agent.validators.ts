import { z } from "zod";

export const executeAgentSchema =
    z.object({
        userId: z.string().cuid(),

        query: z.string().min(1),

        limit: z.number().positive().optional(),
    });

export type ExecuteAgentDTO =
    z.infer<
        typeof executeAgentSchema
    >;