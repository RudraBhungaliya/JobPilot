import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z
    .string()
    .default("8000")
    .transform((v) => Number(v))
    .pipe(z.number().int().min(1).max(65535)),

  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/jobpilot?schema=public"),

  JWT_SECRET: z.string().default("jobpilot-super-secret-jwt-key-2026"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  BCRYPT_ROUNDS: z
    .string()
    .default("10")
    .transform((v) => Number(v))
    .pipe(z.number().int().min(4).max(20)),

  BROWSER_POOL_MAX: z
    .string()
    .default("4")
    .transform((v) => Number(v))
    .pipe(z.number().int().min(1).max(32)),

  QUEUE_CONCURRENCY: z
    .string()
    .default("2")
    .transform((v) => Number(v))
    .pipe(z.number().int().min(1).max(32)),

  APPLY_RATE_PER_HOUR_PER_COMPANY: z
    .string()
    .default("3")
    .transform((v) => Number(v))
    .pipe(z.number().int().min(1).max(1000)),

  APPLY_MIN_DELAY_MS: z
    .string()
    .default("4000")
    .transform((v) => Number(v))
    .pipe(z.number().int().min(0).max(60 * 60 * 1000)),

  APPLY_MAX_DELAY_MS: z
    .string()
    .default("15000")
    .transform((v) => Number(v))
    .pipe(z.number().int().min(0).max(60 * 60 * 1000)),

  HEADLESS: z
    .enum(["new", "true", "false"])
    .default("new"),

  PROXY_URL: z.string().optional(),

  JSEARCH_API_KEY: z.string().optional(),
  GOOGLE_JOBS_API_KEY: z.string().optional(),

  LLM_PROVIDER: z
    .enum(["gemini", "openai"])
    .default("gemini"),

  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default("noreply@jobpilot.local"),

  ATS_USE_LLM: z
    .string()
    .default("false")
    .transform((v) => v === "true" || v === "1"),

  AGENT_MAX_APPLY_ATTEMPTS: z
    .string()
    .default("3")
    .transform((v) => Number(v))
    .pipe(z.number().int().min(1).max(10)),

  AGENT_PAGE_TIMEOUT_MS: z
    .string()
    .default("45000")
    .transform((v) => Number(v))
    .pipe(z.number().int().min(1000).max(10 * 60 * 1000)),

  CACHE_TTL_MS: z
    .string()
    .default(String(5 * 60 * 1000))
    .transform((v) => Number(v))
    .pipe(z.number().int().min(1000)),

  RETRY_BASE_MS: z
    .string()
    .default("1000")
    .transform((v) => Number(v))
    .pipe(z.number().int().min(0).max(60000)),

  RETRY_MAX_MS: z
    .string()
    .default("30000")
    .transform((v) => Number(v))
    .pipe(z.number().int().min(0).max(300000)),

  RETRY_MULTIPLIER: z
    .string()
    .default("2")
    .transform((v) => Number(v))
    .pipe(z.number().int().min(1).max(10)),

  SHUTDOWN_TIMEOUT_S: z
    .string()
    .default("30")
    .transform((v) => Number(v))
    .pipe(z.number().int().min(5).max(300)),

  SCHEDULER_CRON: z.string().default("0 2 * * *"),

  APPLY_MAX_ATTEMPTS: z
    .string()
    .default("3")
    .transform((v) => Number(v))
    .pipe(z.number().int().min(1).max(10)),

  JSEARCH_USE_REMOTE_FALLBACK: z
    .string()
    .default("true")
    .transform((v) => v === "true" || v === "1"),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

let cached: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${missing}`);
  }
  cached = parsed.data;
  return cached;
}

export function resetEnvCacheForTesting(): void {
  cached = null;
}
