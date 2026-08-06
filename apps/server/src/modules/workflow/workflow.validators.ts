import { z } from "zod";

export const startWorkflowSchema =
    z.object({
        batchSize:
            z.number()
                .int()
                .positive()
                .optional(),
    });

export const retryWorkflowSchema =
    z.object({
        applicationId:
            z.string().cuid(),
    });

export type StartWorkflowDTO =
    z.infer<
        typeof startWorkflowSchema
    >;

export type RetryWorkflowDTO =
    z.infer<
        typeof retryWorkflowSchema
    >;