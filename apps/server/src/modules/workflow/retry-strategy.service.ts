import { getEnv } from "../../config/env.js";

export type RetryClassification = "PERMANENT" | "TRANSIENT" | "RATE_LIMITED";

export interface ClassificationResult {
  classification: RetryClassification;
  suggestedDelayMs?: number;
  reason?: string;
}

export class RetryStrategyService {
  classifyApplicationError(error: unknown): ClassificationResult {
    const msg = error instanceof Error ? error.message : String(error || "");
    const lower = msg.toLowerCase();

    if (/404|not.?found|job.*closed|closed.*job|no.?longer.*(available|accepting)|position.*filled/i.test(lower)) {
      return { classification: "PERMANENT", reason: "Job closed or 404 not found" };
    }
    if (/captcha|recaptcha|hcaptcha|human.*verification|verification.*required|action.*required|waiting.*for.*user|missing.*field|required.*field.*not.*available/i.test(lower)) {
      return { classification: "PERMANENT", reason: "Human action / CAPTCHA / missing fields" };
    }
    if (/already.*applied|application.*already.*exists|previously.*applied/i.test(lower)) {
      return { classification: "PERMANENT", reason: "Already applied" };
    }
    if (/429|too.?many.?requests|rate.?limit|throttl|quota/i.test(lower)) {
      return { classification: "RATE_LIMITED", reason: "Rate limited / 429" };
    }
    return { classification: "TRANSIENT", reason: "Transient or unknown error" };
  }

  backoffDelayMs(attempt: number, override?: { baseMs?: number; multiplier?: number; maxMs?: number }): number {
    const env = getEnv();
    const baseMs = override?.baseMs ?? env.RETRY_BASE_MS;
    const multiplier = override?.multiplier ?? env.RETRY_MULTIPLIER;
    const maxMs = override?.maxMs ?? env.RETRY_MAX_MS;
    const raw = baseMs * Math.pow(multiplier, Math.max(0, attempt));
    const jitter = raw * (0.8 + Math.random() * 0.4);
    return Math.min(jitter, maxMs);
  }

  async backoff(attempt: number, override?: { baseMs?: number; multiplier?: number; maxMs?: number }): Promise<void> {
    const delay = this.backoffDelayMs(attempt, override);
    await new Promise((r) => setTimeout(r, delay));
  }
}

const retryStrategyService = new RetryStrategyService();
export default retryStrategyService;
export { retryStrategyService };
