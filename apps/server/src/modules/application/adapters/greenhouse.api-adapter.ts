import type { ApplyAdapter, ApplyAdapterInput, ApplyResult } from "./apply-adapter.interface.js";

export class GreenhouseApiAdapter implements ApplyAdapter {
  readonly name = "greenhouse-api";
  private fetcher: (input: any, init?: any) => Promise<any> = globalThis.fetch.bind(globalThis);

  setFetcher(fn: typeof globalThis.fetch): void { this.fetcher = fn; }

  canApply(url: string, atsProvider?: string): boolean {
    return /greenhouse\.io/i.test(url) || atsProvider === "greenhouse";
  }

  async apply(input: ApplyAdapterInput): Promise<ApplyResult> {
    const urlMatch = input.jobUrl.match(/boards\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/i);
    if (!urlMatch) {
      return {
        success: false,
        requiresBrowserFallback: true,
        reason: "Could not extract Greenhouse board token and job id from URL",
      };
    }

    const [, boardToken, jobId] = urlMatch;
    const endpoint = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}`;

    const formData = new FormData();
    if (input.profile) {
      const { firstName, lastName, email, phone } = input.profile;
      if (firstName) formData.append("first_name", firstName);
      if (lastName) formData.append("last_name", lastName);
      if (email) formData.append("email", email);
      if (phone) formData.append("phone", phone);
    }

    if (input.resumeBuffer && input.resumeContentType) {
      const buffer = new Uint8Array(input.resumeBuffer);
      const blob = new Blob([buffer], { type: input.resumeContentType });
      formData.append("resume", blob, input.profile?.resumeFileName || "resume.pdf");
    }

    try {
      const res = await this.fetcher(endpoint, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const timestamp = Date.now();
        const rand = Math.random().toString(36).slice(2, 8);
        return {
          success: true,
          confirmationId: `gh-${timestamp}-${rand}`,
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
        throw new Error(`Greenhouse API server error: HTTP ${res.status}`);
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

export default new GreenhouseApiAdapter();
