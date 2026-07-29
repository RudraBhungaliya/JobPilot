import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../core/errors/AppError.js";
import { verifyAccessToken } from "./auth.tokens.js";
import type { AuthUser } from "./auth.types.js";

declare global {
    namespace Express {
        interface Request {
            user: AuthUser;
        }
    }
}

export default function authMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new AppError("Unauthorized", 401);
        }

        const token = authHeader.split(" ")[1];

        const payload = verifyAccessToken(token);

        req.user = {
            id: payload.userId,
            email: payload.email,
            role: payload.role,
        };

        next();
    } catch {
        next(new AppError("Unauthorized", 401));
    }
}