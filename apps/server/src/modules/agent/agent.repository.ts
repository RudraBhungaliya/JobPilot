import { prisma } from "@jobpilot/database";

class AgentRepository {
    async createRun(
        userId: string,
        threadId: string,
        query: string,
    ) {
        return prisma.agentRun.create({
            data: {
                userId,
                threadId,
                query,
                status: "RUNNING",
            },
        });
    }

    async updateRun(
        threadId: string,
        data: {
            status?:
                | "RUNNING"
                | "COMPLETED"
                | "FAILED";

            history?: string[];

            errors?: string[];
        },
    ) {
        return prisma.agentRun.update({
            where: {
                threadId,
            },
            data,
        });
    }

    async getRun(
        userId: string,
        threadId: string,
    ) {
        return prisma.agentRun.findFirst({
            where: {
                userId,
                threadId,
            },
        });
    }

    async getRuns(
        userId: string,
    ) {
        return prisma.agentRun.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }
}

export default new AgentRepository();