import type { Browser, BrowserContext } from "playwright";

export interface PooledContext {
  id: string;
  context: BrowserContext;
  browser: Browser;
  acquiredAt: number;
  released: boolean;
}

export interface AcquireResult {
  context: BrowserContext;
  browser: Browser;
  release: () => Promise<void>;
}

export interface BrowserPoolStats {
  size: number;
  available: number;
  inUse: number;
}

export type BrowserCtxFactory = () => Promise<{
  browser: Browser;
  context: BrowserContext;
}>;
