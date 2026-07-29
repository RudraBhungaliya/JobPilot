import type { AuthTokens, AuthUser } from "./auth.types.js";

export interface RegisterResponse {
    success: true;
    message: string;
    user: AuthUser;
}

export interface LoginResponse {
    success: true;
    message: string;
    user: AuthUser;
    tokens: AuthTokens;
}

export interface RefreshTokenResponse {
    success: true;
    tokens: AuthTokens;
}