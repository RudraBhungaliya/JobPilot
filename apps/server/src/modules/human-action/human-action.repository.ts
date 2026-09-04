import { prisma } from "@jobpilot/database";

import type {
    CreateHumanActionInput,
    HumanActionAnswers,
} from "./human-action.types.js";

class HumanActionRepository {
    async create(input: CreateHumanActionInput) {
        return prisma.humanAction.create({
            data: {
                userId: input.userId,
                applicationId: input.applicationId,
                agentRunId: input.agentRunId,
                questions: input.questions as object[],
            },
        });
    }

    async findById(id: string) {
        return prisma.humanAction.findUnique({
            where: { id },
        });
    }

    async findByApplication(
        applicationId: string,
        userId: string,
    ) {
        return prisma.humanAction.findMany({
            where: {
                applicationId,
                userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    async findPendingByApplication(
        applicationId: string,
        userId: string,
    ) {
        return prisma.humanAction.findMany({
            where: {
                applicationId,
                userId,
                resolvedAt: null,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    async resolve(
        id: string,
        answers: HumanActionAnswers,
    ) {
        return prisma.humanAction.update({
            where: { id },
            data: {
                answers: answers as object,
                resolvedAt: new Date(),
            },
        });
    }
}

export default new HumanActionRepository();
