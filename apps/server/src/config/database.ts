import { getEnv } from "./env.js";

export function getDatabaseUrl(): string {
  return getEnv().DATABASE_URL;
}
