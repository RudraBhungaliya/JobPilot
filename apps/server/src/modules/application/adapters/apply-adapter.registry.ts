import logger from "../../../core/logger/logger.js";
import type { ApplyAdapter, ApplyAdapterInput, ApplyResult } from "./apply-adapter.interface.js";

const FALLBACK_RESULT: ApplyResult = {
  success: false,
  requiresBrowserFallback: true,
};

export class ApplyAdapterRegistry {
  private adapters: ApplyAdapter[] = [];

  register(adapter: ApplyAdapter): void {
    this.adapters.push(adapter);
  }

  unregisterAll(): void {
    this.adapters = [];
  }

  list(): readonly ApplyAdapter[] {
    return this.adapters;
  }

  async tryApiApply(input: ApplyAdapterInput): Promise<ApplyResult> {
    for (const adapter of this.adapters) {
      const canHandle = adapter.canApply(input.jobUrl, input.atsProvider);
      logger.debug("ApplyAdapterRegistry: checking canApply", {
        adapter: adapter.name,
        jobUrl: input.jobUrl,
        atsProvider: input.atsProvider,
        canHandle,
      });

      if (!canHandle) {
        continue;
      }

      try {
        const result = await adapter.apply(input);
        if (result.success) {
          return result;
        }
      } catch (err) {
        logger.debug("ApplyAdapterRegistry: adapter threw, continuing", {
          adapter: adapter.name,
          error: err instanceof Error ? err.message : String(err),
        });
        continue;
      }
    }

    return FALLBACK_RESULT;
  }
}

const applyAdapterRegistry = new ApplyAdapterRegistry();

export { applyAdapterRegistry };

export default applyAdapterRegistry;
