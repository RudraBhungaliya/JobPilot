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
                | "FAILED"
                | "WAITING_FOR_USER";

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

    async findActiveRun(userId: string) {
        return prisma.agentRun.findFirst({
            where: {
                userId,
                status: {
                    in: ["RUNNING", "WAITING_FOR_USER"],
                },
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