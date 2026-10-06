import { PrismaClient } from "../generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

declare global {
    // eslint-disable-next-line no-var
    var __prisma__: PrismaClient | undefined;
}

const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:qwerty@localhost:5432/jobpilot?schema=public";

const pool = new pg.Pool({ connectionString });
pool.on("error", (err) => {
    // Prevent unhandled errors from background pool reconnect attempts
    if (process.env.NODE_ENV === "development") {
        console.warn("[PostgreSQL Pool] Warning on idle client:", err?.message || err);
    }
});
const adapter = new PrismaPg(pool);

export const prisma =
    global.__prisma__ ??
    new PrismaClient({
        adapter,
        log:
            process.env.PRISMA_LOG === "true" || process.env.PRISMA_LOG === "1"
                ? ["query", "info", "warn", "error"]
                : ["warn"],
    });

if (process.env.NODE_ENV !== "production") {
    global.__prisma__ = prisma;
}

/**
 * Helper to check database connectivity without throwing unhandled exceptions.
 */
export async function isDatabaseConnected(): Promise<boolean> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch {
        return false;
    }
}

export default prisma;
