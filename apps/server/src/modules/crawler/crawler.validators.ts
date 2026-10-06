import { z } from "zod";

export const crawlSchema = z.object({
    url: z.string().url().optional(),
    keyword: z.string().optional(),
    location: z.string().optional(),
    remote: z.boolean().optional(),
}).refine((data) => data.url || data.keyword, {
    message: "Either url or keyword must be provided",
});

export type CrawlDTO =
    z.infer<typeof crawlSchema>;