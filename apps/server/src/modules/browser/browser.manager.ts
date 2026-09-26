import { randomUUID } from "node:crypto";
import type { Browser, BrowserContext } from "playwright";

import { getEnv } from "../../config/env.js";
import type {
  AcquireResult,
  BrowserCtxFactory,
  BrowserPoolStats,
  PooledContext,
} from "./browser.types.js";

// Install Playwright browsers with: pnpm --filter @jobpilot/server exec playwright install chromium
// Or use script: pnpm --filter @jobpilot/server run install:browsers

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
];

const LOCALES = ["en-US", "en-IN"];

const ACQUIRE_TIMEOUT_MS = 60_000;

export async function installPlaywrightIfMissing(): Promise<void> {
  try {
    await import("playwright");
  } catch {
    throw new Error(
      "Playwright not installed. Run: pnpm --filter @jobpilot/server exec playwright install chromium",
    );
  }
}

async function defaultCreateBrowserCtx(): Promise<{
  browser: Browser;
  context: BrowserContext;
}> {
  const { chromium } = await import("playwright");
  const env = getEnv();

  const headless = env.HEADLESS !== "false";
  const proxy = env.PROXY_URL ? { server: env.PROXY_URL } : undefined;

  const browser = await chromium.launch({ headless, proxy });

  const width = 1280 + Math.floor(Math.random() * 640);
  const height = 720 + Math.floor(Math.random() * 360);
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const locale = LOCALES[Math.floor(Math.random() * LOCALES.length)];

  const context = await browser.newContext({
    viewport: { width, height },
    locale,
    timezoneId: "Asia/Kolkata",
    userAgent,
    permissions: [],
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en", "hi-IN"],
    });
    if ((window as any).chrome) {
      try {
        delete (window as any).chrome;
      } catch {
        Object.defineProperty(window, "chrome", {
          get: () => undefined,
        });
      }
    }
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });
  });

  return { browser, context };
}

class BrowserPool {
  private pool: Map<string, PooledContext> = new Map();
  private maxSize: number;
  private createBrowserCtx: BrowserCtxFactory;
  private waitQueue: Array<() => void> = [];

  constructor(
    createBrowserCtx?: BrowserCtxFactory,
    maxSize?: number,
  ) {
    this.maxSize = maxSize ?? getEnv().BROWSER_POOL_MAX;
    this.createBrowserCtx = createBrowserCtx ?? defaultCreateBrowserCtx;
  }

  setFactory(createBrowserCtx: BrowserCtxFactory): void {
    this.createBrowserCtx = createBrowserCtx;
  }

  stats(): BrowserPoolStats {
    const entries = Array.from(this.pool.values());
    return {
      size: entries.length,
      available: entries.filter((e) => e.released).length,
      inUse: entries.filter((e) => !e.released).length,
    };
  }

  private findIdle(): PooledContext | undefined {
    for (const entry of this.pool.values()) {
      if (entry.released) {
        return entry;
      }
    }
    return undefined;
  }

  async acquire(): Promise<AcquireResult> {
    const start = Date.now();

    while (true) {
      const idle = this.findIdle();
      if (idle) {
        idle.released = false;
        idle.acquiredAt = Date.now();
        return this.makeAcquireResult(idle);
      }

      if (this.pool.size < this.maxSize) {
        const id = randomUUID();
        const { browser, context } = await this.createBrowserCtx();
        const entry: PooledContext = {
          id,
          context,
          browser,
          acquiredAt: Date.now(),
          released: false,
        };
        this.pool.set(id, entry);
        return this.makeAcquireResult(entry);
      }

      if (Date.now() - start >= ACQUIRE_TIMEOUT_MS) {
        throw new Error(
          `BrowserPool acquire timed out after ${ACQUIRE_TIMEOUT_MS}ms (pool size: ${this.pool.size}, max: ${this.maxSize})`,
        );
      }

      await new Promise<void>((resolve) => {
        this.waitQueue.push(resolve);
        const timeout = setTimeout(() => {
          const idx = this.waitQueue.indexOf(resolve);
          if (idx !== -1) this.waitQueue.splice(idx, 1);
          resolve();
        }, 500);
        if (timeout.unref) timeout.unref();
      });
    }
  }

  private makeAcquireResult(entry: PooledContext): AcquireResult {
    return {
      context: entry.context,
      browser: entry.browser,
      release: () => this.release(entry.id),
    };
  }

  async release(id: string): Promise<void> {
    const entry = this.pool.get(id);
    if (!entry) return;

    try {
      await entry.context.clearCookies();
    } catch {
      // ignore
    }

    try {
      const pages = entry.context.pages?.() ?? [];
      for (const page of pages) {
        try {
          await page.evaluate(() => {
            try {
              window.localStorage.clear();
            } catch {
              // ignore
            }
            try {
              window.sessionStorage.clear();
            } catch {
              // ignore
            }
          });
        } catch {
          // ignore
        }
        try {
          await page.close();
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }

    entry.released = true;

    const waiter = this.waitQueue.shift();
    if (waiter) waiter();
  }

  async closeAll(): Promise<void> {
    const errors: unknown[] = [];
    for (const entry of this.pool.values()) {
      try {
        await entry.context.close();
      } catch (err) {
        errors.push(err);
      }
      try {
        await entry.browser.close();
      } catch (err) {
        errors.push(err);
      }
    }
    this.pool.clear();
    this.waitQueue = [];
  }

  // Deprecated legacy methods for backward compatibility
  getBrowser(): Browser | null {
    for (const entry of this.pool.values()) {
      return entry.browser;
    }
    return null;
  }

  setBrowser(browser: Browser): void {
    const id = randomUUID();
    const entry: PooledContext = {
      id,
      context: browser as unknown as BrowserContext,
      browser,
      acquiredAt: Date.now(),
      released: true,
    };
    this.pool.set(id, entry);
  }

  async close(): Promise<void> {
    await this.closeAll();
  }
}

const browserPool = new BrowserPool();

export { BrowserPool };
export default browserPool;
