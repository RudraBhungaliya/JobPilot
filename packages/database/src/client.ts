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

export default prisma;