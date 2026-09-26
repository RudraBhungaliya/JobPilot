import type { ApplyAdapter, ApplyAdapterInput, ApplyResult } from "./apply-adapter.interface.js";

export class AshbyApiAdapter implements ApplyAdapter {
  readonly name = "ashby-api";
  private fetcher: any = globalThis.fetch.bind(globalThis);

  setFetcher(fn: any): void { this.fetcher = fn; }

  canApply(url: string, atsProvider?: string): boolean {
    return /ashbyhq\.com/i.test(url) || atsProvider === "ashby";
  }

  async apply(input: ApplyAdapterInput): Promise<ApplyResult> {
    const roleMatch = input.jobUrl.match(/ashbyhq\.com\/careers\/role\/([^/?#]+)/i);
    const orgMatch = input.jobUrl.match(/jobs\.ashbyhq\.com\/org\/([^/?#]+)(?:\/.+)?/i);
    if (!roleMatch && !orgMatch) {
      return {
        success: false,
        requiresBrowserFallback: true,
        reason: "Could not extract Ashby job id or company from URL",
      };
    }

    const jobId = roleMatch?.[1] || input.job?.id || "";
    const company = orgMatch?.[1] || "";
    const endpoint = `https://api.ashbyhq.com/posting-api/job-board/${company || "default"}/submit-application`;

    const body: Record<string, any> = { jobId };
    if (input.profile) {
      const { firstName, lastName, email, phone } = input.profile;
      body["name"] = `${firstName || ""} ${lastName || ""}`.trim() || undefined;
      body["email"] = email || undefined;
      body["phone"] = phone || undefined;
    }

    try {
      const res = await this.fetcher(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const timestamp = Date.now();
        const rand = Math.random().toString(36).slice(2, 8);
        return {
          success: true,
          confirmationId: `ashby-${timestamp}-${rand}`,
          requiresBrowserFallback: false,
        };
      }

      if (res.status >= 400 && res.status < 500) {
        return {
          success: false,
          requiresBrowserFallback: true,
          reason: `HTTP ${res.status}`,
        };
      }

      if (res.status >= 500) {
        throw new Error(`Ashby API server error: HTTP ${res.status}`);
      }

      return {
        success: false,
        requiresBrowserFallback: true,
        reason: `HTTP ${res.status}`,
      };
    } catch (err) {
      if (err instanceof Error && /HTTP 5\d\d/.test(err.message)) {
        throw err;
      }
      throw err;
    }
  }
}

export default new AshbyApiAdapter();
