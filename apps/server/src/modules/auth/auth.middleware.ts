import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../core/errors/AppError.js";
import { verifyAccessToken } from "./auth.tokens.js";
import type { AuthUser } from "./auth.types.js";
import { prisma } from "@jobpilot/database";

declare global {
    namespace Express {
        interface Request {
            user: AuthUser;
        }
    }
}

let devUserEnsured = false;
let lastDevUserAttempt = 0;
const DEV_USER_RETRY_INTERVAL_MS = 60000;

async function ensureDevUser(userId = "usr_dev_candidate_default") {
    if (devUserEnsured) return;
    const now = Date.now();
    if (now - lastDevUserAttempt < DEV_USER_RETRY_INTERVAL_MS) {
        return;
    }
    lastDevUserAttempt = now;
    try {
        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                email: "candidate@jobpilot.io",
                password: "dev_hashed_password",
                role: "USER",
            },
        });
        devUserEnsured = true;
    } catch {
        // Database not reachable yet; retry after cooldown
    }
}

export default async function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
) {
    const authHeader = req.headers.authorization;
    const queryToken = typeof req.query?.token === "string" ? req.query.token : undefined;
    const rawToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : queryToken;

    if (rawToken) {
        try {
            const payload = verifyAccessToken(rawToken);
            req.user = {
                id: payload.userId,
                email: payload.email,
                role: payload.role,
            };
            return next();
        } catch {
            if (process.env.NODE_ENV === "production") {
                return next(new AppError("Unauthorized", 401));
            }
        }
    }

    if (process.env.NODE_ENV === "production" && !rawToken) {
        return next(new AppError("Unauthorized", 401));
    }

    const devUserId = (req.headers["x-user-id"] as string) || "usr_dev_candidate_default";
    await ensureDevUser(devUserId);
    req.user = {
        id: devUserId,
        email: "candidate@jobpilot.io",
        role: "USER",
    };
    next();
}