import { prisma } from "../client.js";
import type { Prisma, User } from "../../generated/prisma/index.js";

export class UserRepository {
    async create(data : Prisma.UserCreateInput) : Promise<User> {
        return prisma.user.create({ data });
    }

    async findById(
        id : string
    ) : Promise<User | null>{
        return prisma.user.findUnique({
            where : { id },
        });
    }

    async findByEmail(
        email : string
    ) : Promise<User | null>{
        return prisma.user.findUnique({
            where : { email },
        });
    }

    async update(
        id: string,
        data: Prisma.UserUpdateInput
    ): Promise<User> {
        return prisma.user.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<User> {
        return prisma.user.delete({
            where: { id },
        });
    }
}

export default new UserRepository();



