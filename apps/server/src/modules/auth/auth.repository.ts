import type {
    RegisterDTO,
    AuthUser,
} from "./auth.types.js";

export interface AuthRepository {
    create(data : RegisterDTO) : Promise<AuthUser>;

    findById(id : string) : Promise<AuthUser | null>;

    findByEmail(email : string) : Promise<AuthUser | null>;

    saveRefreshToken(
        userId : string,
        refreshToken : string,
    ) : Promise<void>;
}

export class AuthRepository implements IAuthRepository {
    async create(_ : RegisterDTO) : Promise<AuthUser> {
        throw new Error("Not implemented");
    }

    async fundById(_: string) : Promise<AuthUser | null> {
        throw new Error("Not implemented");
    }

    async findByEmail(_: string) : Promise<AuthUser | null> {
        throw new Error  ("Not implemented");
    }

    async saveRefreshToken(
        _: string,
        __: string
    ): Promise<void> {
        throw new Error("Not implemented.");
    }

    async revokeRefreshToken(
        _: string
    ): Promise<void> {
        throw new Error("Not implemented.");
    }
}

export default new AuthRepository();