export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        statusCode = 500,
        code = "INTERNAL_SERVER_ERROR",
        isOperational = true
    ) {
        super(message);

        this.name = new.target.name;
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;

        if ("captureStackTrace" in Error) {
            (Error as ErrorConstructor & {
                captureStackTrace(targetObject: object, constructorOpt?: Function): void;
            }).captureStackTrace(this, this.constructor);
        }
    }
}