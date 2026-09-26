import type { Browser, BrowserContext, Page, LaunchOptions } from "playwright";
import { getEnv } from "../../config/env.js";
import browserPool from "./browser.manager.js";

export class PlaywrightService {
  getLaunchOptions(): LaunchOptions {
    const env = getEnv();
    const headless = env.HEADLESS === "false" ? false : "new";
    const proxy = env.PROXY_URL ? { server: env.PROXY_URL } : undefined;
    return { headless, proxy } as LaunchOptions;
  }

  async launch() {
    const { context, release } = await browserPool.acquire();

    return {
      newPage: async (): Promise<Page> => {
        return context.newPage();
      },
      close: async (): Promise<void> => {
        await release();
      },
      _context: context,
    };
  }
}

export default new PlaywrightService();
