import type { SourceJob, SourceSearchInput } from "./source.types.js";

interface GreenhouseJobRaw {
    id: number | string;
    title: string;
    absolute_url: string;
    location?: { name?: string };
    updated_at?: string;
    content?: string;
}

interface AshbyJobRaw {
    id: string;
    title: string;
    jobUrl: string;
    location?: string;
    department?: string;
    descriptionHtml?: string;
    descriptionPlain?: string;
    publishedAt?: string;
}

interface LeverJobRaw {
    id: string;
    text: string;
    hostedUrl: string;
    categories?: {
        location?: string;
        commitment?: string;
        team?: string;
    };
    descriptionPlain?: string;
}

interface ArbeitnowJobRaw {
    slug: string;
    title: string;
    company_name: string;
    remote: boolean;
    url: string;
    tags?: string[];
    job_types?: string[];
    location?: string;
    description?: string;
}

interface RemoteOkJobRaw {
    id?: string | number;
    position?: string;
    company?: string;
    url?: string;
    location?: string;
    tags?: string[];
    description?: string;
}

const GREENHOUSE_COMPANIES = [
    "stripe",
    "figma",
    "airbnb",
    "pinterest",
    "cloudflare",
    "github",
    "databricks",
    "doordash",
    "instacart",
    "automattic",
    "discord",
    "reddit",
    "gitlab",
    "elastic",
    "mongodb",
    "twilio",
    "okta",
    "hashicorp",
];

const ASHBY_COMPANIES = [
    "openai",
    "linear",
    "ramp",
    "retool",
    "notion",
    "vercel",
    "cursor",
    "supabase",
    "sentry",
    "resend",
    "posthog",
    "glean",
    "monzo",
];

const LEVER_COMPANIES = [
    "netflix",
    "spotify",
    "canva",
    "palantir",
    "twitch",
    "atlassian",
];

class LiveAtsService {
    private cache = new Map<string, { timestamp: number; jobs: SourceJob[] }>();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

    private async fetchWithTimeout(url: string, timeoutMs = 4000): Promise<Response> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(url, {
                signal: controller.signal,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 JobPilotBot/1.0",
                    Accept: "application/json, text/plain, */*",
                },
            });
        } finally {
            clearTimeout(timeout);
        }
    }

    async searchGreenhouse(input: SourceSearchInput): Promise<SourceJob[]> {
        const requestedCompany = this.extractCompanyFromInput(input.keyword, GREENHOUSE_COMPANIES);
        const companiesToQuery = requestedCompany ? [requestedCompany] : GREENHOUSE_COMPANIES.slice(0, 5);
        const allJobs: SourceJob[] = [];

        await Promise.allSettled(
            companiesToQuery.map(async (company) => {
                const cacheKey = `gh:${company}`;
                const cached = this.getFromCache(cacheKey);
                if (cached) {
                    allJobs.push(...this.filterJobs(cached, input));
                    return;
                }

                try {
                    const res = await this.fetchWithTimeout(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs`);
                    if (!res.ok) return;
                    const data = (await res.json()) as { jobs?: GreenhouseJobRaw[] };
                    if (!Array.isArray(data.jobs)) return;

                    const jobs: SourceJob[] = data.jobs.map((j) => ({
                        externalId: `gh-${company}-${j.id}`,
                        title: j.title,
                        company: this.capitalize(company),
                        url: j.absolute_url,
                        location: j.location?.name || "Global / Remote",
                        description: j.title,
                        source: "greenhouse",
                    }));

                    this.setInCache(cacheKey, jobs);
                    allJobs.push(...this.filterJobs(jobs, input));
                } catch {
                    // Ignore individual company fetch timeout/error
                }
            })
        );

        return allJobs;
    }

    async searchAshby(input: SourceSearchInput): Promise<SourceJob[]> {
        const requestedCompany = this.extractCompanyFromInput(input.keyword, ASHBY_COMPANIES);
        const companiesToQuery = requestedCompany ? [requestedCompany] : ASHBY_COMPANIES.slice(0, 5);
        const allJobs: SourceJob[] = [];

        await Promise.allSettled(
            companiesToQuery.map(async (company) => {
                const cacheKey = `ashby:${company}`;
                const cached = this.getFromCache(cacheKey);
                if (cached) {
                    allJobs.push(...this.filterJobs(cached, input));
                    return;
                }

                try {
                    const res = await this.fetchWithTimeout(`https://api.ashbyhq.com/posting-api/job-board/${company}`);
                    if (!res.ok) return;
                    const data = (await res.json()) as { jobs?: AshbyJobRaw[] };
                    if (!Array.isArray(data.jobs)) return;

                    const jobs: SourceJob[] = data.jobs.map((j) => ({
                        externalId: `ashby-${company}-${j.id}`,
                        title: j.title,
                        company: this.capitalize(company),
                        url: j.jobUrl,
                        location: j.location || "Remote",
                        description: j.descriptionPlain || j.title,
                        source: "ashby",
                    }));

                    this.setInCache(cacheKey, jobs);
                    allJobs.push(...this.filterJobs(jobs, input));
                } catch {
                    // Ignore individual company fetch timeout/error
                }
            })
        );

        return allJobs;
    }

    async searchLever(input: SourceSearchInput): Promise<SourceJob[]> {
        const requestedCompany = this.extractCompanyFromInput(input.keyword, LEVER_COMPANIES);
        const companiesToQuery = requestedCompany ? [requestedCompany] : LEVER_COMPANIES.slice(0, 4);
        const allJobs: SourceJob[] = [];

        await Promise.allSettled(
            companiesToQuery.map(async (company) => {
                const cacheKey = `lever:${company}`;
                const cached = this.getFromCache(cacheKey);
                if (cached) {
                    allJobs.push(...this.filterJobs(cached, input));
                    return;
                }

                try {
                    const res = await this.fetchWithTimeout(`https://api.lever.co/v0/postings/${company}?mode=json`);
                    if (!res.ok) return;
                    const data = (await res.json()) as LeverJobRaw[];
                    if (!Array.isArray(data)) return;

                    const jobs: SourceJob[] = data.map((j) => ({
                        externalId: `lever-${company}-${j.id}`,
                        title: j.text,
                        company: this.capitalize(company),
                        url: j.hostedUrl,
                        location: j.categories?.location || "Remote",
                        description: j.descriptionPlain || j.text,
                        source: "lever",
                    }));

                    this.setInCache(cacheKey, jobs);
                    allJobs.push(...this.filterJobs(jobs, input));
                } catch {
                    // Ignore individual company fetch timeout/error
                }
            })
        );

        return allJobs;
    }

    async searchRemote(input: SourceSearchInput): Promise<SourceJob[]> {
        const cacheKey = "remote:openings";
        let rawJobs = this.getFromCache(cacheKey);

        if (!rawJobs) {
            rawJobs = [];
            // Fetch from Arbeitnow (returns real remote jobs)
            try {
                const res = await this.fetchWithTimeout("https://www.arbeitnow.com/api/job-board-api");
                if (res.ok) {
                    const data = (await res.json()) as { data?: ArbeitnowJobRaw[] };
                    if (Array.isArray(data.data)) {
                        for (const j of data.data) {
                            rawJobs.push({
                                externalId: `arbeitnow-${j.slug}`,
                                title: j.title,
                                company: j.company_name,
                                url: j.url,
                                location: j.remote ? "Remote" : (j.location || "Remote"),
                                description: (j.tags || []).join(", ") + " " + j.title,
                                source: "remote",
                            });
                        }
                    }
                }
            } catch {
                // Ignore Arbeitnow failure
            }

            // Fetch from RemoteOK
            try {
                const res = await this.fetchWithTimeout("https://remoteok.com/api");
                if (res.ok) {
                    const data = (await res.json()) as RemoteOkJobRaw[];
                    if (Array.isArray(data)) {
                        for (const j of data) {
                            if (j.position && j.company && j.url) {
                                rawJobs.push({
                                    externalId: `remoteok-${j.id || Math.random().toString(36).slice(2)}`,
                                    title: j.position,
                                    company: j.company,
                                    url: j.url.startsWith("http") ? j.url : `https://remoteok.com${j.url}`,
                                    location: j.location || "Remote",
                                    description: (j.tags || []).join(", ") + " " + j.position,
                                    source: "remote",
                                });
                            }
                        }
                    }
                }
            } catch {
                // Ignore RemoteOK failure
            }

            if (rawJobs.length > 0) {
                this.setInCache(cacheKey, rawJobs);
            }
        }

        return this.filterJobs(rawJobs, input);
    }

    async searchGeneral(input: SourceSearchInput, preferredSource = "general"): Promise<SourceJob[]> {
        // Query live Arbeitnow feed for live tech jobs matching keywords
        const cacheKey = "general:arbeitnow";
        let rawJobs = this.getFromCache(cacheKey);

        if (!rawJobs) {
            rawJobs = [];
            try {
                const res = await this.fetchWithTimeout("https://www.arbeitnow.com/api/job-board-api");
                if (res.ok) {
                    const data = (await res.json()) as { data?: ArbeitnowJobRaw[] };
                    if (Array.isArray(data.data)) {
                        rawJobs = data.data.map((j) => ({
                            externalId: `live-${j.slug}`,
                            title: j.title,
                            company: j.company_name,
                            url: j.url,
                            location: j.remote ? "Remote" : (j.location || "Hybrid"),
                            description: (j.tags || []).join(", ") + " " + j.title,
                            source: preferredSource,
                        }));
                        this.setInCache(cacheKey, rawJobs);
                    }
                }
            } catch {
                // Ignore
            }
        }

        return this.filterJobs(rawJobs, input);
    }

    private filterJobs(jobs: SourceJob[], input: SourceSearchInput): SourceJob[] {
        const keyword = (input.keyword || "").toLowerCase().trim();
        const terms = keyword.split(/\s+/).filter((t) => t.length > 1);
        const remoteOnly = input.remote === true;
        const requestedLoc = (input.location || "").toLowerCase().trim();
        const isUsRequested = requestedLoc === "us" || requestedLoc === "usa" || requestedLoc.includes("united states");

        return jobs.filter((job) => {
            const loc = (job.location || "").toLowerCase();

            if (remoteOnly && !loc.includes("remote") && !loc.includes("global") && !loc.includes("anywhere")) {
                return false;
            }

            if (isUsRequested) {
                const isUsMatch =
                    loc.includes("us") ||
                    loc.includes("usa") ||
                    loc.includes("united states") ||
                    loc.includes("remote") ||
                    loc.includes("global") ||
                    loc.includes("anywhere");

                if (!isUsMatch) {
                    return false;
                }
            } else if (requestedLoc && !loc.includes(requestedLoc)) {
                return false;
            }

            if (terms.length === 0) return true;

            const text = `${job.title} ${job.company} ${job.description} ${job.location}`.toLowerCase();
            return terms.some((term) => text.includes(term));
        });
    }

    private extractCompanyFromInput(keyword: string, knownCompanies: string[]): string | null {
        const lower = keyword.toLowerCase();
        for (const company of knownCompanies) {
            if (lower.includes(company)) {
                return company;
            }
        }
        return null;
    }

    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    private getFromCache(key: string): SourceJob[] | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.CACHE_TTL_MS) {
            this.cache.delete(key);
            return null;
        }
        return entry.jobs;
    }

    private setInCache(key: string, jobs: SourceJob[]): void {
        this.cache.set(key, { timestamp: Date.now(), jobs });
    }
}

export default new LiveAtsService();
