export interface RegisterDTO {
    email : string;
    password : string;
}

export interface LoginDTO {
    email : string;
    password : string;
}

export interface JwtPayload {
    userId : string;
    email : string;
}

export interface AuthTokens {
    accessToken : string;
    refreshToken : string;
}

export interface AuthUser {
    id : string;
    email : string;
    role : "USER" | "ADMIN";
}

export interface LoginResponse {
    user : AuthUser;
    tokens : AuthTokens;
}

export interface RegisterResponse {
    user : AuthUser;
}

export interface RefreshTokenDTO {
    refreshToken : string;
}

export interface AuthRequest {
    user ?: AuthUser;
}