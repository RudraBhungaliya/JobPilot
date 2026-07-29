import * as Database from "@jobpilot/database";

// Fallback to dynamic access in case the package doesn't export a typed `userRepository`
const userRepository = (Database as any).userRepository;
import type { Prisma, User } from "@jobpilot/database";

class AuthRepository {
    async createUser(data: Prisma.UserCreateInput): Promise<User> {
        return userRepository.create(data);
    }

    async findUserByEmail(email: string): Promise<User | null> {
        return userRepository.findByEmail(email);
    }

    async findUserById(id: string): Promise<User | null> {
        return userRepository.findById(id);
    }
}

export default new AuthRepository();