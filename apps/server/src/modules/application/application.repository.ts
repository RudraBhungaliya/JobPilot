import { prisma } from "@jobpilot/database";

import type {
    CreateApplicationDTO,
    UpdateApplicationDTO,
} from "./application.validators.js";

class ApplicationRepository {
    async create(
        userId: string,
        data: CreateApplicationDTO,
    ) {
        return prisma.application.create({
            data: {
                ...data,
                userId,
            },
        });
    }

    async findById(id: string) {
        return prisma.application.findUnique({
            where: {
                id,
            },
            include: {
                job: true,
                resume: true,
            },
        });
    }

    async findByUser(userId: string) {
        return prisma.application.findMany({
            where: {
                userId,
            },
            include: {
                job: true,
                resume: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    async update(
        id: string,
        data: UpdateApplicationDTO,
    ) {
        return prisma.application.update({
            where: {
                id,
            },
            data,
        });
    }

    async delete(id: string) {
        return prisma.application.delete({
            where: {
                id,
            },
        });
    }
}

export default new ApplicationRepository();