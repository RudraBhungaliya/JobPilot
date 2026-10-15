import type { ApplyAdapter, ApplyAdapterInput, ApplyResult } from "./apply-adapter.interface.js";

export class GreenhouseApiAdapter implements ApplyAdapter {
  readonly name = "greenhouse-api";

  canApply(url: string, atsProvider?: string): boolean {
    return /greenhouse\.io/i.test(url) || atsProvider?.toLowerCase() === "greenhouse";
  }

  async apply(_input: ApplyAdapterInput): Promise<ApplyResult> {
    return {
      success: false,
      requiresBrowserFallback: true,
      reason: "This ATS does not expose a supported public application submission API.",
    };
  }
}

export default new GreenhouseApiAdapter();
