import { AppError } from "../../core/errors/index.js";

export class InvalidCredentialsError extends AppError {
    constructor() {
        super(
            "Invalid email or password.",
            401,
            "INVALID_CREDENTIALS"
        );
    }
}

export class EmailAlreadyExistsError extends AppError {
    constructor() {
        super(
            "Email already exists.",
            409,
            "EMAIL_ALREADY_EXISTS"
        );
    }
}

export class UserNotFoundError extends AppError {
    constructor() {
        super(
            "User not found.",
            404,
            "USER_NOT_FOUND"
        );
    }
}

export class InvalidTokenError extends AppError {
    constructor() {
        super(
            "Invalid token.",
            401,
            "INVALID_TOKEN"
        );
    }
}

export class TokenExpiredError extends AppError {
    constructor() {
        super(
            "Token expired.",
            401,
            "TOKEN_EXPIRED"
        );
    }
}

export class UnauthorizedError extends AppError {
    constructor() {
        super(
            "Unauthorized.",
            401,
            "UNAUTHORIZED"
        );
    }
}