import { prisma } from "@jobpilot/database";

import type {
    CreateCompanyDTO,
    UpdateCompanyDTO,
} from "./company.validators.js";

class CompanyRepository {
    async create (userId: string, data : CreateCompanyDTO){
        return prisma.company.create({
            data : {
                ...data,
                userId,
            },
        });
    }

    async findAll(){
        return prisma.company.findMany({
            orderBy : {
                name : "asc",
            }
        });
    }

    async findById(
        id : string,
    ){
        return  prisma.company.findUnique({
            where : {
                id,
            }
        });
    }

    async update(
        id: string,
        data: UpdateCompanyDTO,
    ) {
        return prisma.company.update({
            where: {
                id,
            },
            data,
        });
    }

    async delete(id: string) {
        return prisma.company.delete({
            where: {
                id,
            },
        });
    }
}

export default new CompanyRepository();