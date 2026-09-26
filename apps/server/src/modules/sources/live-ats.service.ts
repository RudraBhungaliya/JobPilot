import type { SourceJob, SourceSearchInput } from "./source.types.js";
import {
    INDIAN_LOCATION_ALIASES,
    canonicalizeLocation,
    normalizeLocation,
    getAllGreenhouseCompanies,
    getAllAshbyCompanies,
    getAllLeverCompanies,
} from "./curated-companies.constants.js";

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

class LiveAtsService {
    private cache = new Map<string, { timestamp: number; jobs: SourceJob[] }>();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

    private normalizeLocationForMatch(loc: string): string {
        return normalizeLocation(loc);
    }

    public normalizeLocationQuery(loc: string): string {
        return normalizeLocation(loc);
    }

    private isRemoteLocation(loc: string): boolean {
        const lower = loc.toLowerCase();
        return (
            lower.includes("remote") ||
            lower.includes("global") ||
            lower.includes("anywhere") ||
            lower.includes("worldwide") ||
            lower.includes("wfh") ||
            lower.includes("work from home")
        );
    }

    private isIndiaLocation(loc: string): boolean {
        const lower = loc.toLowerCase();
        if (lower.includes("india")) return true;
        const canonical = canonicalizeLocation(lower);
        if (canonical) {
            for (const indianHub of Object.keys(INDIAN_LOCATION_ALIASES)) {
                if (canonical === indianHub) return true;
            }
        }
        for (const aliases of Object.values(INDIAN_LOCATION_ALIASES)) {
            for (const alias of aliases) {
                if (lower.includes(alias.toLowerCase())) return true;
            }
        }
        return false;
    }

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
        const tier = input.companyTier ?? 'ALL';
        const allCompanies = getAllGreenhouseCompanies(tier as 'MNC' | 'SEMI_MNC' | 'ALL');
        const requestedCompany = this.extractCompanyFromInput(input.keyword, allCompanies);
        const companiesToQuery = requestedCompany ? [requestedCompany] : allCompanies.slice(0, 5);
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
        const tier = input.companyTier ?? 'ALL';
        const allCompanies = getAllAshbyCompanies(tier as 'MNC' | 'SEMI_MNC' | 'ALL');
        const requestedCompany = this.extractCompanyFromInput(input.keyword, allCompanies);
        const companiesToQuery = requestedCompany ? [requestedCompany] : allCompanies.slice(0, 5);
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
        const tier = input.companyTier ?? 'ALL';
        const allCompanies = getAllLeverCompanies(tier as 'MNC' | 'SEMI_MNC' | 'ALL');
        const requestedCompany = this.extractCompanyFromInput(input.keyword, allCompanies);
        const companiesToQuery = requestedCompany ? [requestedCompany] : allCompanies.slice(0, 4);
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
        const requestedLocRaw = (input.location || "").trim();
        const requestedLocLower = requestedLocRaw.toLowerCase();
        const requestedLoc = requestedLocRaw ? this.normalizeLocationForMatch(requestedLocRaw) : "";
        const isUsRequested = requestedLoc === "us" || requestedLoc === "usa" || requestedLoc.includes("united states");
        const isGlobalRemoteRequested = requestedLocLower === "global remote";
        const isRemoteIndiaRequested = requestedLocLower === "remote india";

        return jobs.filter((job) => {
            const jobLocRaw = job.location || "";
            const jobLocLower = jobLocRaw.toLowerCase();
            const jobLoc = this.normalizeLocationForMatch(jobLocRaw);

            if (remoteOnly && !this.isRemoteLocation(jobLocRaw)) {
                return false;
            }

            if (isGlobalRemoteRequested && !this.isRemoteLocation(jobLocRaw)) {
                return false;
            }

            if (isRemoteIndiaRequested) {
                if (!this.isRemoteLocation(jobLocRaw)) {
                    return false;
                }
                if (!this.isIndiaLocation(jobLocRaw)) {
                    const stripped = jobLocLower
                        .replace(/remote|global|anywhere|worldwide|wfh|work from home|,|\/|-|\(|\)/g, " ")
                        .trim();
                    if (stripped.length > 0) {
                        return false;
                    }
                }
            }

            if (isUsRequested) {
                const isUsMatch =
                    jobLocLower.includes("us") ||
                    jobLocLower.includes("usa") ||
                    jobLocLower.includes("united states") ||
                    this.isRemoteLocation(jobLocRaw);

                if (!isUsMatch) {
                    return false;
                }
            } else if (requestedLoc && !isGlobalRemoteRequested && !isRemoteIndiaRequested) {
                let matched = false;

                if (requestedLoc === jobLoc) {
                    matched = true;
                } else {
                    const aliasesEntry = Object.entries(INDIAN_LOCATION_ALIASES).find(
                        ([canonical]) => canonical === requestedLoc
                    );
                    if (aliasesEntry) {
                        const [, aliases] = aliasesEntry;
                        matched = aliases.some((alias) => jobLocLower.includes(alias.toLowerCase()));
                    }
                    if (!matched) {
                        matched = jobLocLower.includes(requestedLoc);
                    }
                }

                if (!matched) {
                    return false;
                }
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

export { LiveAtsService };
export default new LiveAtsService();
