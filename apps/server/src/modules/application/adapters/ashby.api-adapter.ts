import type { ApplyAdapter, ApplyAdapterInput, ApplyResult } from "./apply-adapter.interface.js";

export class AshbyApiAdapter implements ApplyAdapter {
  readonly name = "ashby-api";

  canApply(url: string, atsProvider?: string): boolean {
    return /ashbyhq\.com/i.test(url) || atsProvider?.toLowerCase() === "ashby";
  }

  async apply(_input: ApplyAdapterInput): Promise<ApplyResult> {
    return {
      success: false,
      requiresBrowserFallback: true,
      reason: "This ATS does not expose a supported public application submission API.",
    };
  }
}

export default new AshbyApiAdapter();
