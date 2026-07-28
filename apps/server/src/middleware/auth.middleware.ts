import type {
    Request,
    Response,
    NextFunction,
    RequestHandler,
} from "express";

import jwt from "jsonwebtoken";

import { AppError } from "../core/errors/index.js";

interface JwtPayload {
    userId: string;
    email: string;
    role: "USER" | "ADMIN";
}

declare module "express-serve-static-core" {
    interface Request {
        user?: JwtPayload;
    }
}

export const authenticate: RequestHandler = (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return next(
            new AppError(
                "Authentication required.",
                401,
                "UNAUTHORIZED"
            )
        );
    }

    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET!
        ) as JwtPayload;

        req.user = payload;

        next();
    } catch {
        next(
            new AppError(
                "Invalid or expired access token.",
                401,
                "INVALID_TOKEN"
            )
        );
    }
};

export default authenticate;