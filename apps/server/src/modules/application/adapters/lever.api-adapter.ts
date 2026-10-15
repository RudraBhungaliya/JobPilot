import type { ApplyAdapter, ApplyAdapterInput, ApplyResult } from "./apply-adapter.interface.js";

export class LeverApiAdapter implements ApplyAdapter {
  readonly name = "lever-api";

  canApply(url: string, atsProvider?: string): boolean {
    return /lever\.co/i.test(url) || atsProvider?.toLowerCase() === "lever";
  }

  async apply(_input: ApplyAdapterInput): Promise<ApplyResult> {
    return {
      success: false,
      requiresBrowserFallback: true,
      reason: "This ATS does not expose a supported public application submission API.",
    };
  }
}

export default new LeverApiAdapter();
