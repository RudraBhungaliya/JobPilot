import { prisma, type Prisma, type User } from "@jobpilot/database";

class AuthRepository {
    async createUser(data: Prisma.UserCreateInput): Promise<User> {
        return prisma.user.create({ data });
    }

    async findUserByEmail(email: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { email } });
    }

    async findUserById(id: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { id } });
    }
}

export default new AuthRepository();