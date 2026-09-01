import { z } from "zod";

export const createAuditLogSchema = z.object({
    action: z.enum([
        "AGENT_STARTED",
        "AGENT_COMPLETED",
        "AGENT_FAILED",
        "JOB_DISCOVERED",
        "JOB_SELECTED",
        "APPLICATION_CREATED",
        "APPLICATION_STARTED",
        "APPLICATION_SUBMITTED",
        "APPLICATION_FAILED",
        "APPLICATION_RETRIED",
        "USER_ACTION_REQUIRED",
        "USER_ACTION_COMPLETED",
        "SYSTEM",
    ]),
    description: z.string().min(1).max(2000),
    agentRunId: z.string().cuid().optional(),
    applicationId: z.string().cuid().optional(),
    jobId: z.string().cuid().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export const auditLogListSchema = z.object({
    action: z
        .enum([
            "AGENT_STARTED",
            "AGENT_COMPLETED",
            "AGENT_FAILED",
            "JOB_DISCOVERED",
            "JOB_SELECTED",
            "APPLICATION_CREATED",
            "APPLICATION_STARTED",
            "APPLICATION_SUBMITTED",
            "APPLICATION_FAILED",
            "APPLICATION_RETRIED",
            "USER_ACTION_REQUIRED",
            "USER_ACTION_COMPLETED",
            "SYSTEM",
        ])
        .optional(),
    limit: z
        .coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50),
    offset: z
        .coerce
        .number()
        .int()
        .min(0)
        .default(0),
});

export type CreateAuditLogDTO = z.infer<
    typeof createAuditLogSchema
>;

export type AuditLogListDTO = z.infer<
    typeof auditLogListSchema
>;
