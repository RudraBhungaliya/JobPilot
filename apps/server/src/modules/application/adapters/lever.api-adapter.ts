import type { ApplyAdapter, ApplyAdapterInput, ApplyResult } from "./apply-adapter.interface.js";

export class LeverApiAdapter implements ApplyAdapter {
  readonly name = "lever-api";
  private fetcher: any = globalThis.fetch.bind(globalThis);

  setFetcher(fn: any): void { this.fetcher = fn; }

  canApply(url: string, atsProvider?: string): boolean {
    return /jobs\.lever\.co/i.test(url) || atsProvider === "lever";
  }

  async apply(input: ApplyAdapterInput): Promise<ApplyResult> {
    const urlMatch = input.jobUrl.match(/jobs\.lever\.co\/([^/]+)\/([^/?#]+)/i);
    if (!urlMatch) {
      return {
        success: false,
        requiresBrowserFallback: true,
        reason: "Could not extract Lever company and job id from URL",
      };
    }

    const [, company, jobId] = urlMatch;
    const endpoint = `https://api.lever.co/v0/postings/${company}/${jobId}?mode=json`;

    const body: Record<string, any> = {};
    if (input.profile) {
      const { firstName, lastName, email, phone } = input.profile;
      if (firstName) body["name"] = `${firstName} ${lastName || ""}`.trim();
      if (email) body["email"] = email;
      if (phone) body["phone"] = phone;
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
          confirmationId: `lever-${timestamp}-${rand}`,
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
        throw new Error(`Lever API server error: HTTP ${res.status}`);
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

export default new LeverApiAdapter();
