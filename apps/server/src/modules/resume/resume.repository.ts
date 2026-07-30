import { prisma } from "@jobpilot/database";
import type { Prisma, Resume } from "@jobpilot/database";

class ResumeRepository {
    async create(data : Prisma.ResumeCreateInput) : Promise<Resume> {
        return prisma.resume.create({
            data
        });
    }

    async findById(id : string) : Promise<Resume | null> {
        return prisma.resume.findUnique({
            where : {
                id,
            },
        });
    }

    async findByUserId(userId : string) : Promise<Resume[]>{
        return prisma.resume.findMany({
            where : {
                userId,
            },
            orderBy : {
                createdAt : "desc"
            }
        });
    }

    async update(id : string, data : Prisma.ResumeUpdateInput) : Promise<Resume> {
        return prisma.resume.update({
            where : {
                id,
            },
            data,
        });
    }

    async delete(id : string) : Promise<Resume> {
        return prisma.resume.delete({
            where : {
                id,
            },
        });
    }
}

export default new ResumeRepository();