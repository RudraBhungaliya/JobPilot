import type {
    Request,
    Response,
    NextFunction,
} from "express";

import { AppError } from "../core/errors/index.js";

export function errorMiddleware(
    err : Error,
    req : Request,
    res : Response,
    next : NextFunction,
) : void {
    if(res.headersSent){
        next(err);
        return;
    }

    if(err instanceof AppError){
        res.status(err.statusCode).json({
            success : false,
            error : {
                code : err.code,
                message : err.message,
            },
        });
    }

    console.error(err);

    res.status(500).json({
        success : false,
        error : {
            code : "Initial Server Error",
            message : 
            process.env.NODE_ENV === "production"
            ? "Something went wrong."
            : err.message,
        },
    });
}

export default errorMiddleware;