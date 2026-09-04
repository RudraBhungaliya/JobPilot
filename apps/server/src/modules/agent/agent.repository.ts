import { prisma, Prisma } from "@jobpilot/database";

class AgentRepository {
    async createRun(userId: string, threadId: string, query: string) {
        return prisma.agentRun.create({
            data: { userId, threadId, query, status: "RUNNING" },
        });
    }

    async updateRun(
        threadId: string,
        data: {
<<<<<<< HEAD
            status?:
                | "RUNNING"
                | "COMPLETED"
                | "FAILED"
                | "WAITING_FOR_USER";

=======
            status?: "RUNNING" | "WAITING_FOR_USER" | "COMPLETED" | "FAILED";
>>>>>>> 75ce97492af7e4d89d96cb0094053166cd490656
            history?: string[];
            errors?: string[];
            stateSnapshot?: object | typeof Prisma.JsonNull;
        },
    ) {
        return prisma.agentRun.update({
            where: { threadId },
            data,
        });
    }

    async getRun(userId: string, threadId: string) {
        return prisma.agentRun.findFirst({
            where: { userId, threadId },
        });
    }

<<<<<<< HEAD
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
=======
    async getRunByThreadId(threadId: string) {
        return prisma.agentRun.findUnique({
            where: { threadId },
        });
    }

    async getRuns(userId: string) {
>>>>>>> 75ce97492af7e4d89d96cb0094053166cd490656
        return prisma.agentRun.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }
}

export default new AgentRepository();