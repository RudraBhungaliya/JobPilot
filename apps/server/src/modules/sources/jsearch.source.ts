import type {
    JobSource,
} from "./source.interface.js";

import type {
    SearchOptions,
    SourceJob,
} from "./source.types.js";

import { getEnv } from "../../config/env.js";

import liveAtsService from "./live-ats.service.js";

interface JSearchJobRaw {
    job_id?: string;
    job_title?: string;
    employer_name?: string;
    job_apply_link?: string;
    job_city?: string;
    job_state?: string;
    job_country?: string;
    job_description?: string;
    job_is_remote?: boolean;
}

interface JSearchApiResponse {
    data?: JSearchJobRaw[];
}

class JsearchSource implements JobSource {
    readonly name = "jsearch";

    private fetcher: (url: string, opts?: RequestInit) => Promise<Response> =
        globalThis.fetch.bind(globalThis);

    setFetcher(fn: (url: string, opts?: RequestInit) => Promise<Response>): void {
        this.fetcher = fn;
    }

    private async fetchWithTimeout(
        url: string,
        options: RequestInit,
        timeoutMs = 8000,
    ): Promise<Response> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const mergedOptions: RequestInit = {
                ...options,
                signal: controller.signal,
            };
            return await this.fetcher(url, mergedOptions);
        } finally {
            clearTimeout(timeout);
        }
    }

    private formatLocation(job: JSearchJobRaw): string {
        if (job.job_is_remote) {
            return "Remote";
        }
        const parts: string[] = [];
        if (job.job_city) parts.push(job.job_city);
        if (job.job_state) parts.push(job.job_state);
        if (job.job_country && parts.length === 0) parts.push(job.job_country);
        if (parts.length === 0) return "Global / Remote";
        return parts.join(", ");
    }

    async search(
        options: SearchOptions,
    ): Promise<SourceJob[]> {
        const env = getEnv();

        if (!env.JSEARCH_API_KEY) {
            return Promise.resolve([]);
        }

        try {
            const queryParams = new URLSearchParams();
            if (options.keyword) queryParams.set("query", options.keyword);
            if (options.location) queryParams.set("location", options.location);
            if (options.remote === true) queryParams.set("remote_jobs_only", "true");
            queryParams.set("num_pages", "1");
            queryParams.set("date_posted", "all");

            const url = `https://jsearch.p.rapidapi.com/search?${queryParams.toString()}`;

            const res = await this.fetchWithTimeout(url, {
                method: "GET",
                headers: {
                    "x-rapidapi-key": env.JSEARCH_API_KEY,
                    "x-rapidapi-host": "jsearch.p.rapidapi.com",
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 JobPilotBot/1.0",
                    Accept: "application/json",
                },
            }, 8000);

            if (!res.ok) {
                throw new Error(`JSearch API responded with ${res.status}`);
            }

            const data = (await res.json()) as JSearchApiResponse;
            if (!data || !Array.isArray(data.data)) {
                return [];
            }

            const jobs: SourceJob[] = data.data
                .filter((j) => j.job_title && j.job_apply_link && j.employer_name)
                .map((j) => ({
                    externalId: `js-${j.job_id || Buffer.from(j.job_apply_link!).toString("base64").slice(0, 16)}`,
                    title: j.job_title!,
                    company: j.employer_name!,
                    url: j.job_apply_link!,
                    location: this.formatLocation(j),
                    description: j.job_description || j.job_title!,
                    source: "jsearch",
                }));

            return jobs;
        } catch {
            if (env.JSEARCH_USE_REMOTE_FALLBACK) {
                return liveAtsService.searchGeneral(options, "jsearch");
            }
            return [];
        }
    }
}

export default new JsearchSource();
