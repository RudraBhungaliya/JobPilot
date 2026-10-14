import jwt from "jsonwebtoken";

import type { JwtPayload } from "./auth.types.js";

function getAccessTokenSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error("A JWT signing secret of at least 32 characters is required.");
    return secret;
}

function getRefreshTokenSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error("A JWT refresh secret of at least 32 characters is required.");
    return secret;
}

function getAccessTokenExpiresIn(): string {
    return process.env.JWT_ACCESS_EXPIRES_IN ?? "15m";
}

function getRefreshTokenExpiresIn(): string {
    return process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";
}

export function generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, getAccessTokenSecret(), {
        expiresIn: getAccessTokenExpiresIn() as any,
    });
}

export function generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, getRefreshTokenSecret(), {
        expiresIn: getRefreshTokenExpiresIn() as any,
    });
}

export function verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, getAccessTokenSecret()) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, getRefreshTokenSecret()) as JwtPayload;
}
