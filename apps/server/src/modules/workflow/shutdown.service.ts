import { getEnv } from "../../config/env.js";
import logger from "../../core/logger/logger.js";
import browserPool from "../browser/browser.manager.js";
import queueWorker from "../queue/queue.worker.js";
import rateLimiterService from "./rate-limiter.service.js";

export type ShutdownPhase = "idle" | "stopping-queue" | "draining-workers" | "closing-browsers" | "stopping-limiter" | "done";

export class ShutdownService {
  phase: ShutdownPhase = "idle";
  private signalListenersInstalled = false;
  private shutdownPromise: Promise<void> | null = null;

  installSignalHandlers(): void {
    if (this.signalListenersInstalled) return;
    this.signalListenersInstalled = true;
    const handler = (sig: string) => {
      logger.info(`ShutdownService: received ${sig}, initiating graceful shutdown`);
      this.shutdown().catch((err) => {
        logger.error("ShutdownService: shutdown failed, forcing exit", { error: err instanceof Error ? err.message : String(err) });
        process.exit(1);
      });
    };
    process.on("SIGTERM", () => handler("SIGTERM"));
    process.on("SIGINT", () => handler("SIGINT"));
  }

  async shutdown(): Promise<void> {
    if (this.shutdownPromise) return this.shutdownPromise;
    const env = getEnv();
    const deadlineMs = env.SHUTDOWN_TIMEOUT_S * 1000;
    const start = Date.now();

    this.shutdownPromise = (async () => {
      try {
        this.phase = "stopping-queue";
        queueWorker.stop();
        logger.info(`ShutdownService: queue stopped (${Date.now() - start}ms)`);

        this.phase = "draining-workers";
        const remaining = deadlineMs - (Date.now() - start);
        await queueWorker.drain(Math.max(1000, remaining));
        logger.info(`ShutdownService: workers drained (${Date.now() - start}ms, active=${queueWorker.activeCount})`);

        this.phase = "closing-browsers";
        await browserPool.closeAll();
        logger.info(`ShutdownService: browsers closed (${Date.now() - start}ms)`);

        this.phase = "stopping-limiter";
        rateLimiterService.clear();
        logger.info(`ShutdownService: rate limiter stopped (${Date.now() - start}ms)`);

        this.phase = "done";
        logger.info(`ShutdownService: graceful shutdown complete (total ${Date.now() - start}ms)`);
      } catch (err) {
        logger.error("ShutdownService: error during shutdown", { error: err instanceof Error ? err.message : String(err) });
      }
    })();
    return this.shutdownPromise;
  }

  resetForTesting(): void {
    this.phase = "idle";
    this.shutdownPromise = null;
  }
}

const shutdownService = new ShutdownService();
export default shutdownService;
export { shutdownService };
