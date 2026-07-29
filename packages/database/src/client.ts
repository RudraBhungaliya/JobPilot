import { PrismaClient } from "../generated/prisma/index.js";

declare global {
    // eslint-disable-next-line no-var
    var __prisma__: PrismaClient | undefined;
}

export const prisma =
    global.__prisma__ ??
    new PrismaClient({
        log:
            process.env.NODE_ENV === "development"
                ? ["query", "info", "warn", "error"]
                : ["error"],
    });

if (process.env.NODE_ENV !== "production") {
    global.__prisma__ = prisma;
}

export default prisma;