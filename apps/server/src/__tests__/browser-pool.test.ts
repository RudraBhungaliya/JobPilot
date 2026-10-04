import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import type { Browser, BrowserContext, Page } from "playwright";

process.env.DATABASE_URL = "postgres://test:test@localhost/test";
process.env.JWT_SECRET = "test-jwt-secret-for-testing-only";
process.env.BROWSER_POOL_MAX = "4";
process.env.NODE_ENV = "test";

const { resetEnvCacheForTesting } = await import("../config/env.js");
const { BrowserPool } = await import("../modules/browser/browser.manager.js");
import type { BrowserCtxFactory } from "../modules/browser/browser.types.js";

function makeMockFactory() {
  let created = 0;
  const instances: Array<{
    id: string;
    browserClosed: boolean;
    contextClosed: boolean;
    browser: Browser;
    context: BrowserContext;
  }> = [];

  const factory: BrowserCtxFactory = async () => {
    const id = `ctx-${++created}`;
    const pages: Page[] = [];
    const instance = {
      id,
      browserClosed: false,
      contextClosed: false,
    } as any;

    const context = {
      id,
      _instance: instance,
      newPage: async () => {
        const page = {
          evaluate: async (_fn: any) => {},
          close: async () => {},
        } as unknown as Page;
        pages.push(page);
        return page;
      },
      pages: () => pages,
      clearCookies: async () => {},
      close: async () => {
        instance.contextClosed = true;
      },
    } as unknown as BrowserContext;

    const browser = {
      id,
      _instance: instance,
      newPage: async () => ({} as Page),
      newContext: async () => context,
      close: async () => {
        instance.browserClosed = true;
      },
    } as unknown as Browser;

    instance.browser = browser;
    instance.context = context;
    instances.push(instance);

    return { browser, context };
  };

  return {
    factory,
    getCreatedCount: () => created,
    getInstances: () => instances,
  };
}

describe("BrowserPool", () => {
  beforeEach(() => {
    process.env.BROWSER_POOL_MAX = "4";
    resetEnvCacheForTesting();
  });

  afterEach(() => {
    process.env.BROWSER_POOL_MAX = "4";
    resetEnvCacheForTesting();
  });

  it("pool size=2: 2 acquires return distinct instances; 3rd acquire waits until release", async () => {
    const { factory, getCreatedCount } = makeMockFactory();
    const pool = new BrowserPool(factory, 2);

    const r1 = await pool.acquire();
    const r2 = await pool.acquire();

    assert.equal(getCreatedCount(), 2);
    assert.notEqual(
      (r1.context as any).id,
      (r2.context as any).id,
      "two acquires should return distinct context instances",
    );

    let thirdAcquired = false;
    let thirdId: string | null = null;
    const thirdPromise = (async () => {
      const r3 = await pool.acquire();
      thirdAcquired = true;
      thirdId = (r3.context as any).id;
      return r3;
    })();

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(thirdAcquired, false, "3rd acquire should wait while pool is full");

    await r1.release();

    const r3 = await thirdPromise;
    assert.equal(thirdAcquired, true, "3rd acquire should proceed after release");
    assert.equal(getCreatedCount(), 2, "should reuse instance, not create new one");
    assert.equal(
      thirdId,
      (r1.context as any).id,
      "should reuse the released context id",
    );

    await r2.release();
    await r3.release();
    await pool.closeAll();
  });

  it("release returns context; acquire after release reuses same context id", async () => {
    const { factory, getCreatedCount } = makeMockFactory();
    const pool = new BrowserPool(factory, 2);

    const r1 = await pool.acquire();
    const firstId = (r1.context as any).id;

    assert.equal(getCreatedCount(), 1);

    await r1.release();

    const r2 = await pool.acquire();
    const secondId = (r2.context as any).id;

    assert.equal(
      firstId,
      secondId,
      "acquire after release should reuse the same context id",
    );
    assert.equal(getCreatedCount(), 1, "factory should not be called again");

    await r2.release();
    await pool.closeAll();
  });

  it("stats() correctly reports available/inUse", async () => {
    const { factory } = makeMockFactory();
    const pool = new BrowserPool(factory, 3);

    assert.deepEqual(pool.stats(), { size: 0, available: 0, inUse: 0 });

    const r1 = await pool.acquire();
    assert.deepEqual(pool.stats(), { size: 1, available: 0, inUse: 1 });

    const r2 = await pool.acquire();
    assert.deepEqual(pool.stats(), { size: 2, available: 0, inUse: 2 });

    await r1.release();
    assert.deepEqual(pool.stats(), { size: 2, available: 1, inUse: 1 });

    const r3 = await pool.acquire();
    assert.deepEqual(pool.stats(), { size: 2, available: 0, inUse: 2 });

    await r2.release();
    await r3.release();
    assert.deepEqual(pool.stats(), { size: 2, available: 2, inUse: 0 });

    await pool.closeAll();
    assert.deepEqual(pool.stats(), { size: 0, available: 0, inUse: 0 });
  });

  it("closeAll closes all browsers and contexts", async () => {
    const { factory, getInstances } = makeMockFactory();
    const pool = new BrowserPool(factory, 3);

    const r1 = await pool.acquire();
    const r2 = await pool.acquire();
    const r3 = await pool.acquire();

    const instances = getInstances();
    assert.equal(instances.length, 3);
    for (const inst of instances) {
      assert.equal(inst.browserClosed, false);
      assert.equal(inst.contextClosed, false);
    }

    await r1.release();
    await pool.closeAll();

    for (const inst of instances) {
      assert.equal(inst.browserClosed, true, "browser should be closed");
      assert.equal(inst.contextClosed, true, "context should be closed");
    }

    assert.deepEqual(pool.stats(), { size: 0, available: 0, inUse: 0 });
  });

  it("legacy getBrowser / setBrowser / close backward compatibility", async () => {
    const { factory } = makeMockFactory();
    const pool = new BrowserPool(factory, 2);

    assert.equal(pool.getBrowser(), null);

    const fakeBrowser = {
      close: async () => {},
    } as unknown as Browser;

    pool.setBrowser(fakeBrowser);
    const got = pool.getBrowser();
    assert.equal(got, fakeBrowser, "getBrowser should return set browser");

    await pool.close();
    assert.deepEqual(pool.stats(), { size: 0, available: 0, inUse: 0 });
  });
});
