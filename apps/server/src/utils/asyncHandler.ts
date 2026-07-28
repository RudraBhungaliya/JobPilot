import type {
    Request,
    Response,
    NextFunction,
    RequestHandler,
} from "express";

type AsyncHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<unknown>;

export function asyncHandler(
    handler: AsyncHandler
): RequestHandler {
    return (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        Promise.resolve(
            handler(req, res, next)
        ).catch(next);
    };
}