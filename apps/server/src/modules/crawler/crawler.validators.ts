import { z } from "zod";

export const crawlSchema = z.object({
    keyword: z.string().min(1),

    location: z.string().optional(),

    remote: z.boolean().optional(),
});

export type CrawlDTO =
    z.infer<typeof crawlSchema>;