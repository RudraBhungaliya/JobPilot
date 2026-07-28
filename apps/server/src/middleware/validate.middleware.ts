import type {
    Request,
    Response,
    NextFunction,
    RequestHandler,
} from "express";

import type { ZodSchema } from "zod";

import { AppError } from "../core/errors/index.js";

export function validate(
    schema: ZodSchema
): RequestHandler {
    return (
        req: Request,
        _res: Response,
        next: NextFunction
    ) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            return next(
                new AppError(
                    result.error.issues[0]?.message ??
                        "Validation failed",
                    400,
                    "VALIDATION_ERROR"
                )
            );
        }

        req.body = result.data;

        next();
    };
}