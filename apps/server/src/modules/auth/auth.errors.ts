import { AppError } from "../../core/errors/AppError.js";

export class InvalidCredentialsError extends AppError {
    constructor() {
        super("Invalid email or password", 401);
    }
}

export class UserAlreadyExistsError extends AppError {
    constructor() {
        super("User already exists", 409);
    }
}

export class UnauthorizedError extends AppError {
    constructor() {
        super("Unauthorized", 401);
    }
}