import test from "node:test";
import assert from "node:assert/strict";
import Bottleneck from "bottleneck";
import { RateLimiterService } from "../modules/workflow/rate-limiter.service.js";
import retryStrategyService from "../modules/workflow/retry-strategy.service.js";
import shutdownService from "../modules/workflow/shutdown.service.js";
import browserPool from "../modules/browser/browser.manager.js";

test("Rate limiter + exponential backoff retry + graceful shutdown (TR-17.1 to TR-17.4)", async (t) => {
  await t.test("TR-17.1: Rate limiter reservoir cap test", async () => {
    // Bottleneck with reservoir of 3 per hour
    const limiter = new Bottleneck({
      reservoir: 3,
      reservoirRefreshAmount: 3,
      reservoirRefreshInterval: 60 * 60 * 1000,
      maxConcurrent: 1,
      minTime: 10,
    });

    let executedCount = 0;
    const task = () => {
      executedCount++;
      return Promise.resolve(executedCount);
    };

    const p1 = limiter.schedule(task);
    const p2 = limiter.schedule(task);
    const p3 = limiter.schedule(task);

    await Promise.all([p1, p2, p3]);
    assert.equal(executedCount, 3);
    const remaining = await limiter.currentReservoir();
    assert.equal(remaining, 0);

    await limiter.stop({ dropWaitingJobs: true });
  });

  await t.test("TR-17.2: Exponential backoff calculation", () => {
    const baseMs = 1000;
    const multiplier = 2;
    const maxMs = 30000;

    const delay0 = retryStrategyService.backoffDelayMs(0, { baseMs, multiplier, maxMs });
    const delay1 = retryStrategyService.backoffDelayMs(1, { baseMs, multiplier, maxMs });
    const delay2 = retryStrategyService.backoffDelayMs(2, { baseMs, multiplier, maxMs });

    // Attempt 0 ~ 1000ms (+/- jitter)
    assert.ok(delay0 >= 700 && delay0 <= 1500, `Delay 0 (${delay0}) within range`);
    // Attempt 1 ~ 2000ms (+/- jitter)
    assert.ok(delay1 >= 1500 && delay1 <= 3000, `Delay 1 (${delay1}) within range`);
    // Attempt 2 ~ 4000ms (+/- jitter)
    assert.ok(delay2 >= 3000 && delay2 <= 6000, `Delay 2 (${delay2}) within range`);
  });

  await t.test("TR-17.3: classifyApplicationError returns PERMANENT on 404 / closed job", () => {
    const err404 = new Error("404: Target job posting has been closed or removed");
    const res404 = retryStrategyService.classifyApplicationError(err404);
    assert.equal(res404.classification, "PERMANENT");
    assert.match(res404.reason || "", /Job closed or 404/i);

    const errCaptcha = new Error("CAPTCHA challenge detected on form submission");
    const resCaptcha = retryStrategyService.classifyApplicationError(errCaptcha);
    assert.equal(resCaptcha.classification, "PERMANENT");

    const err429 = new Error("429 Too Many Requests - Rate limit reached");
    const res429 = retryStrategyService.classifyApplicationError(err429);
    assert.equal(res429.classification, "RATE_LIMITED");

    const errTransient = new Error("Socket connection reset by peer");
    const resTransient = retryStrategyService.classifyApplicationError(errTransient);
    assert.equal(resTransient.classification, "TRANSIENT");
  });

  await t.test("TR-17.4: ShutdownService drains queue and closes browser pool cleanly", async () => {
    shutdownService.resetForTesting();

    const origCloseAll = browserPool.closeAll;
    let browserClosed = false;
    browserPool.closeAll = async () => {
      browserClosed = true;
    };

    try {
      await shutdownService.shutdown();
      assert.equal(shutdownService.phase, "done");
      assert.equal(browserClosed, true);
    } finally {
      browserPool.closeAll = origCloseAll;
      shutdownService.resetForTesting();
    }
  });
});
