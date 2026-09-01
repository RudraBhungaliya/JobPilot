import { prisma } from "@jobpilot/database";

import type {
    CreateAuditLogInput,
    AuditLogListOptions,
} from "./audit.types.js";

class AuditRepository {
    async create(
        data: CreateAuditLogInput,
    ) {
        return prisma.auditLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                description:
                    data.description,
                agentRunId:
                    data.agentRunId,
                applicationId:
                    data.applicationId,
                jobId: data.jobId,
                metadata:
                    (data.metadata ?? undefined) as
                        | import("@jobpilot/database").Prisma.InputJsonValue
                        | undefined,
            },
        });
    }

    async findByUser(
        userId: string,
        options: AuditLogListOptions = {},
    ) {
        return prisma.auditLog.findMany({
            where: {
                userId,

                ...(options.action
                    ? {
                          action:
                              options.action,
                      }
                    : {}),
            },

            orderBy: {
                createdAt: "desc",
            },

            take: options.limit ?? 50,

            skip: options.offset ?? 0,
        });
    }

    async findById(
        id: string,
        userId: string,
    ) {
        return prisma.auditLog.findFirst({
            where: {
                id,
                userId,
            },
        });
    }

    async findByApplication(
        applicationId: string,
        userId: string,
    ) {
        return prisma.auditLog.findMany({
            where: {
                applicationId,
                userId,
            },

            orderBy: {
                createdAt: "asc",
            },
        });
    }

    async findByAgentRun(
        agentRunId: string,
        userId: string,
    ) {
        return prisma.auditLog.findMany({
            where: {
                agentRunId,
                userId,
            },

            orderBy: {
                createdAt: "asc",
            },
        });
    }
}

export default new AuditRepository();