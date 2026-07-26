export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '30d';

export const ACCESS_TOKEN_COOKIE = "jobpilot_access_token";
export const REFRESH_TOKEN_COOKIE = "jobpilot_refresh_token";

/**
 * Password
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_SALT_ROUNDS = 12;

/**
 * Auth
 */

export const MAX_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCK_TIME = 15 * 60 * 1000; // 15 minutes

/**
 * Cookies
 */

export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
};

/**
 * Refresh Cookie
 */

export const REFRESH_COOKIE_OPTIONS = {
    ...COOKIE_OPTIONS,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

/**
 * Access Cookie
 */

export const ACCESS_COOKIE_OPTIONS = {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutes
};

/**
 * JWT Algorithms
 */

export const JWT_ALGORITHM = "HS256";

/**
 * Messages
 */

export const AUTH_MESSAGES = {
    REGISTER_SUCCESS: "User registered successfully.",
    LOGIN_SUCCESS: "Logged in successfully.",
    LOGOUT_SUCCESS: "Logged out successfully.",
    TOKEN_REFRESHED: "Token refreshed successfully.",

    INVALID_CREDENTIALS: "Invalid email or password.",
    EMAIL_ALREADY_EXISTS: "Email already exists.",
    USER_NOT_FOUND: "User not found.",
    UNAUTHORIZED: "Unauthorized.",
    INVALID_TOKEN: "Invalid token.",
    TOKEN_EXPIRED: "Token expired.",
};