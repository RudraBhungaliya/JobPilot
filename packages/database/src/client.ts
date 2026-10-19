import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

if (!process.env.DATABASE_URL) {
    // Search monorepo root and current working directory
    const candidates = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), "../../.env"),
        path.resolve(process.cwd(), "../.env"),
    ];
    for (const cand of candidates) {
        if (fs.existsSync(cand)) {
            dotenv.config({ path: cand });
            if (process.env.DATABASE_URL) break;
        }
    }
}

import { PrismaClient } from "../generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

declare global {
    // eslint-disable-next-line no-var
    var __prisma__: PrismaClient | undefined;
}

const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/jobpilot?schema=public";


// Sequential query queue per client connection to eliminate concurrent query pipelining
// and prevent 'Calling client.query() when the client is already executing a query' deprecation in pg@8.23+ and failure in pg@9.0
const clientQueryQueueSymbol = Symbol("clientQueryQueue");
const rawClientQuery = pg.Client.prototype.query;

(pg.Client.prototype as any).query = function (...args: any[]) {
    if ((this as any)._ending || (this as any)._queryable === false) {
        return rawClientQuery.apply(this, args as any);
    }

    const prevPromise: Promise<any> = (this as any)[clientQueryQueueSymbol] || Promise.resolve();
    const hasCallback = typeof args[args.length - 1] === "function";

    if (hasCallback) {
        const callback = args[args.length - 1];
        const nextPromise = prevPromise.then(
            () => new Promise<void>((resolve) => {
                args[args.length - 1] = (err: any, res: any) => {
                    resolve();
                    callback(err, res);
                };
                rawClientQuery.apply(this, args as any);
            }),
            () => new Promise<void>((resolve) => {
                args[args.length - 1] = (err: any, res: any) => {
                    resolve();
                    callback(err, res);
                };
                rawClientQuery.apply(this, args as any);
            })
        );
        (this as any)[clientQueryQueueSymbol] = nextPromise;
        return;
    }

    const execute = () => rawClientQuery.apply(this, args as any);
    const chained = prevPromise.then(execute, execute);
    (this as any)[clientQueryQueueSymbol] = chained.catch(() => {});
    return chained;
};

const pool = new pg.Pool({
    connectionString,
    max: parseInt(process.env.PG_POOL_MAX || "10", 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});
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
