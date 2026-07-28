export type UserRole = "USER" | "ADMIN";

export interface UserEntity {
    id: string;
    email: string;
    password: string;
    role: UserRole;

    createdAt: Date;
    updatedAt: Date;
}

export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
}

export interface RegisterDTO {
    email: string;
    password: string;
}

export interface LoginDTO {
    email: string;
    password: string;
}

export interface RefreshTokenDTO {
    refreshToken: string;
}

export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface RegisterResponse {
    user: AuthUser;
}

export interface LoginResponse {
    user: AuthUser;
    tokens: AuthTokens;
}