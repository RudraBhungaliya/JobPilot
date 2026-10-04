import { prisma, type Prisma } from "@jobpilot/database";

class ResumeRepository {
    async create(data: Prisma.ResumeCreateInput) {
        return prisma.resume.create({
            data,
        });
    }

    async findById(id: string) {
        return prisma.resume.findUnique({
            where: {
                id,
            },
        });
    }

    async findByUserId(userId: string) {
        return prisma.resume.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }

    async update(id: string, data: Prisma.ResumeUpdateInput) {
        return prisma.resume.update({
            where: {
                id,
            },
            data,
        });
    }

    async delete(id: string) {
        return prisma.resume.delete({
            where: {
                id,
            },
        });
    }
}

export default new ResumeRepository();