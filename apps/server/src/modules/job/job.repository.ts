import { prisma } from "@jobpilot/database";

import type {
    CreateJobDTO,
    UpdateJobDTO,
} from "./job.validators.js";

class JobRepository {
    async create (
        userId : string,
        data : CreateJobDTO,
    ){
        return prisma.job.create({
            data : {
                ...data,
                userId,
            },
        });
    }

    async findAllbyUser(
        userId : string,
    ){
        return prisma.job.findMany({
            where : {
                userId,
            },
            orderBy : {
                createdAt : "desc",
            },
        });
    }

    async findById(
        id : string,
    ){
        return prisma.job.findUnique({
            where : {
                id,
            },
        });
    }

    async update(
        id : string,
        data : UpdateJobDTO,
    ){
        return prisma.job.update({
            where : {
                id
            },
            data,
        });
    }

    async delete(id : string){
        return prisma.job.delete({
            where : {
                id,
            },
        });
    }
}

export default new JobRepository();