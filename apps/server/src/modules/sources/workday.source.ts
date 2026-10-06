import type {
    JobSource,
} from "./source.interface.js";

import type {
    SearchOptions,
    SourceJob,
} from "./source.types.js";

import {
    WORKDAY_TENANTS,
    getWorkdayTenants,
} from "./curated-companies.constants.js";

import { getEnv } from "../../config/env.js";

interface WorkdayJobPosting {
    title?: string;
    externalPath?: string;
    locationsText?: string;
    bulletFields?: Array<{ field?: string; value?: string }>;
}

interface WorkdayApiResponse {
    jobPostings?: WorkdayJobPosting[];
    total?: number;
}

class WorkdaySource implements JobSource {
    readonly name = "workday";

    private fetcher: (url: string, opts?: RequestInit) => Promise<Response> =
        globalThis.fetch.bind(globalThis);

    setFetcher(fn: (url: string, opts?: RequestInit) => Promise<Response>): void {
        this.fetcher = fn;
    }

    private async fetchWithTimeout(
        url: string,
        timeoutMs = 4000,
    ): Promise<Response> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await this.fetcher(url, {
                signal: controller.signal,
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 JobPilotBot/1.0",
                    Accept: "application/json, text/plain, */*",
                },
            });
        } finally {
            clearTimeout(timeout);
        }
    }

    async search(
        options: SearchOptions,
    ): Promise<SourceJob[]> {
        const env = getEnv();
        void env;

        const tier = options.companyTier;

        if (tier === "STARTUP") {
            return Promise.resolve([]);
        }

        const filterTier =
            tier === "ALL" || tier === undefined
                ? undefined
                : (tier as "MNC" | "SEMI_MNC");

        const tenants = getWorkdayTenants({ tier: filterTier });

        if (tenants.length === 0) {
            return Promise.resolve([]);
        }

        const allJobs: SourceJob[] = [];
        const tenantsToQuery = tenants.slice(0, Math.max(3, Math.min(tenants.length, 6)));

        await Promise.allSettled(
            tenantsToQuery.map(async (tenant) => {
                const hostPart = tenant.tenant || tenant.slug;
                const boardPart = tenant.board || "external";
                const url = `https://${hostPart}.myworkdayjobs.com/wday/cxs/${hostPart}/${boardPart}/jobs`;

                try {
                    const res = await this.fetchWithTimeout(url, 4000);
                    if (!res.ok) {
                        return;
                    }

                    const data = (await res.json()) as WorkdayApiResponse;
                    if (!data || !Array.isArray(data.jobPostings)) {
                        return;
                    }

                    for (const posting of data.jobPostings) {
                        if (!posting.title) continue;

                        const jobPath = posting.externalPath || "";
                        const externalId =
                            jobPath ||
                            `wd-${hostPart}-${Buffer.from(posting.title).toString("base64").slice(0, 12)}`;

                        const jobUrl = jobPath.startsWith("http")
                            ? jobPath
                            : `https://${hostPart}.myworkdayjobs.com/${boardPart}${jobPath}`;

                        let description = posting.title;
                        if (Array.isArray(posting.bulletFields)) {
                            const bullets = posting.bulletFields
                                .filter((b) => b.value)
                                .map((b) => b.value)
                                .join("; ");
                            if (bullets) {
                                description = `${posting.title}. ${bullets}`;
                            }
                        }

                        allJobs.push({
                            externalId: `wd-${hostPart}-${externalId}`,
                            title: posting.title,
                            company: tenant.company,
                            url: jobUrl,
                            location: posting.locationsText || "Global / Remote",
                            description,
                            source: "workday",
                        });
                    }
                } catch {
                    // Individual tenant fetch failed; continue with others
                }
            }),
        );

        return allJobs;
    }
}

export default new WorkdaySource();
