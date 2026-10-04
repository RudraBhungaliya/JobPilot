export interface RateLimitConfig {
    maxPerMinute: number;
    maxPerHour: number;
    delayBetweenRequestsMs: number;
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
    greenhouse: { maxPerMinute: 10, maxPerHour: 60, delayBetweenRequestsMs: 3000 },
    ashby: { maxPerMinute: 8, maxPerHour: 50, delayBetweenRequestsMs: 4000 },
    lever: { maxPerMinute: 10, maxPerHour: 60, delayBetweenRequestsMs: 3000 },
    default: { maxPerMinute: 5, maxPerHour: 30, delayBetweenRequestsMs: 5000 },
};

class AtsRateLimiter {
    private requestTimestamps = new Map<string, number[]>();
    private lastRequestTime = new Map<string, number>();

    /**
     * Check if a request to a given domain or ATS provider can be executed immediately
     */
    async waitForSlot(providerOrDomain: string): Promise<void> {
        const key = providerOrDomain.toLowerCase().trim();
        const config = DEFAULT_CONFIGS[key] || DEFAULT_CONFIGS.default;

        const now = Date.now();
        const lastTime = this.lastRequestTime.get(key) || 0;
        const timeSinceLast = now - lastTime;

        // 1. Enforce minimum delay between requests
        if (timeSinceLast < config.delayBetweenRequestsMs) {
            const waitMs = config.delayBetweenRequestsMs - timeSinceLast;
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }

        // 2. Sliding window check for rate limits
        const timestamps = (this.requestTimestamps.get(key) || []).filter(
            (t) => now - t < 60 * 60 * 1000 // Keep past hour
        );

        const pastMinuteCount = timestamps.filter((t) => now - t < 60 * 1000).length;
        if (pastMinuteCount >= config.maxPerMinute) {
            const oldestInMinute = timestamps.filter((t) => now - t < 60 * 1000)[0];
            const waitMs = 60 * 1000 - (now - oldestInMinute) + 500;
            console.log(`[RateLimiter] ⏳ Throttling ${key}: waiting ${waitMs}ms to respect ATS rate limits.`);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }

        const updatedNow = Date.now();
        timestamps.push(updatedNow);
        this.requestTimestamps.set(key, timestamps);
        this.lastRequestTime.set(key, updatedNow);
    }
}

export const atsRateLimiter = new AtsRateLimiter();
export default atsRateLimiter;
