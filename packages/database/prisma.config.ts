import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

if (!process.env.DATABASE_URL) {
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

const databaseUrl = process.env.DATABASE_URL;
if (process.env.NODE_ENV === "production" && !process.env.CI && (!databaseUrl || /user:password/.test(databaseUrl))) {
    throw new Error("A reachable production DATABASE_URL is required for Prisma commands.");
}

export default defineConfig({
    schema: "prisma/schema.prisma",

    migrations: {
        path: "prisma/migrations",
    },

    datasource: {
        url: databaseUrl || "postgresql://postgres:postgres@localhost:5432/jobpilot?schema=public",
    },
});
