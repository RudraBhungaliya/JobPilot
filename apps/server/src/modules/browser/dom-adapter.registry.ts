import type { Page } from "playwright";

import logger from "../../core/logger/logger.js";
import type { ApplyAdapterInput, ApplyResult } from "../application/adapters/apply-adapter.interface.js";
import type { DomAtsAdapter } from "./dom-adapter.interface.js";

const FALLBACK_RESULT: ApplyResult = {
  success: false,
  requiresBrowserFallback: true,
};

export class DomAdapterRegistry {
  private adapters: DomAtsAdapter[] = [];

  register(adapter: DomAtsAdapter): void {
    this.adapters.push(adapter);
    logger.debug("DomAdapterRegistry: registered adapter", { name: adapter.name });
  }

  unregisterAll(): void {
    this.adapters = [];
  }

  list(): readonly DomAtsAdapter[] {
    return this.adapters;
  }

  async detect(page: Page): Promise<DomAtsAdapter | null> {
    for (const adapter of this.adapters) {
      try {
        if (await adapter.detect(page)) {
          logger.debug("DomAdapterRegistry: detected adapter", { name: adapter.name, url: page.url() });
          return adapter;
        }
      } catch (err) {
        logger.debug("DomAdapterRegistry: detect threw, continuing", {
          adapter: adapter.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return null;
  }

  async tryDomApply(page: Page, input: ApplyAdapterInput): Promise<ApplyResult & { adapterName?: string; lastFillCount?: number }> {
    const adapter = await this.detect(page);
    if (!adapter) {
      return { ...FALLBACK_RESULT, reason: "No matching DOM adapter detected for page" };
    }

    logger.debug("DomAdapterRegistry: attempting DOM apply", { adapter: adapter.name, url: page.url() });

    try {
      const result = await adapter.apply(page, input);
      return {
        ...result,
        adapterName: adapter.name,
        lastFillCount: adapter.lastFillCount,
      };
    } catch (err) {
      logger.debug("DomAdapterRegistry: adapter threw", {
        adapter: adapter.name,
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        ...FALLBACK_RESULT,
        adapterName: adapter.name,
        lastFillCount: adapter.lastFillCount,
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

const domAdapterRegistry = new DomAdapterRegistry();

export { domAdapterRegistry };

export default domAdapterRegistry;
