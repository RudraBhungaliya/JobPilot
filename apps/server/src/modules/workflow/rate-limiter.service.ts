import Bottleneck from "bottleneck";
import { getEnv } from "../../config/env.js";
import logger from "../../core/logger/logger.js";

export interface RateLimitKey {
  companyKey: string;
}

export class RateLimiterService {
  private limiters = new Map<string, Bottleneck>();

  private createLimiter(companyKey: string): Bottleneck {
    const env = getEnv();
    const limiter = new Bottleneck({
      minTime: env.APPLY_MIN_DELAY_MS,
      maxConcurrent: 1,
      reservoir: env.APPLY_RATE_PER_HOUR_PER_COMPANY,
      reservoirRefreshAmount: env.APPLY_RATE_PER_HOUR_PER_COMPANY,
      reservoirRefreshInterval: 60 * 60 * 1000,
      highWater: 100,
      strategy: Bottleneck.strategy.BLOCK,
    });
    limiter.on("failed", (error, jobInfo) => {
      logger.warn("RateLimiter job failed", { companyKey, jobInfo, error: error instanceof Error ? error.message : String(error) });
    });
    return limiter;
  }

  getOrCreate(companyKey: string): Bottleneck {
    let limiter = this.limiters.get(companyKey);
    if (!limiter) {
      limiter = this.createLimiter(companyKey);
      this.limiters.set(companyKey, limiter);
    }
    return limiter;
  }

  async schedule<T>(companyKey: string, job: () => Promise<T>): Promise<T> {
    const limiter = this.getOrCreate(companyKey);
    return limiter.schedule({ id: companyKey + "-" + Math.random().toString(36).slice(2, 8) }, job);
  }

  async stats(companyKey?: string): Promise<Record<string, any>> {
    if (companyKey) {
      const l = this.limiters.get(companyKey);
      if (!l) return {};
      const res = await l.currentReservoir();
      return {
        companyKey,
        reservoir: res,
        running: l.counts().RUNNING,
        queued: l.counts().QUEUED,
      };
    }
    const result: Record<string, any> = {};
    for (const [key, l] of this.limiters.entries()) {
      const res = await l.currentReservoir();
      result[key] = {
        reservoir: res,
        running: l.counts().RUNNING,
        queued: l.counts().QUEUED,
      };
    }
    return result;
  }

  clear(): void {
    for (const l of this.limiters.values()) {
      l.stop({ dropWaitingJobs: true }).catch(() => {});
    }
    this.limiters.clear();
  }
}

const rateLimiterService = new RateLimiterService();
export default rateLimiterService;
export { rateLimiterService };
