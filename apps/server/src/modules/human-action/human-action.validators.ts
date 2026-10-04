import { z } from "zod";

export const resolveHumanActionSchema = z.object({
    answers: z
        .record(z.string(), z.string())
        .describe(
            "Map of { selector -> value } for each answered question",
        ),
});

export type ResolveHumanActionDTO = z.infer<
    typeof resolveHumanActionSchema
>;
