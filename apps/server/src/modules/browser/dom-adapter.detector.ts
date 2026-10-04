import type { Page } from "playwright";
import type { DomAtsAdapter, DomAtsDetectorName } from "./dom-adapter.interface.js";
import logger from "../../core/logger/logger.js";

export class DomAtsDetector {
  private adapters: Map<DomAtsDetectorName | string, DomAtsAdapter> = new Map();

  register(name: DomAtsDetectorName | string, adapter: DomAtsAdapter): void {
    this.adapters.set(name, adapter);
  }

  list(): DomAtsAdapter[] {
    return Array.from(this.adapters.values());
  }

  unregisterAll(): void {
    this.adapters.clear();
  }

  /**
   * Detect which ATS serves this page. Returns adapter match or null.
   * TR-10.1: On a GH HTML fixture → greenhouse adapter detected; Lever fixture → Lever adapter.
   */
  async detect(page: Page): Promise<{ name: string; adapter: DomAtsAdapter } | null> {
    for (const [name, adapter] of this.adapters.entries()) {
      try {
        const matched = await adapter.detect(page);
        if (matched) {
          logger.debug("DomAtsDetector: matched", { ats: name, url: page.url() });
          return { name, adapter };
        }
      } catch (err) {
        logger.debug("DomAtsDetector detect error", { ats: name, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return null;
  }
}

const domAtsDetector = new DomAtsDetector();
export { domAtsDetector };
export default domAtsDetector;
