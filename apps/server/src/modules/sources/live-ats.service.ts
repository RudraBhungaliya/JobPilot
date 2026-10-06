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

    public normalizeLocationQuery(loc: string): string {
        return normalizeLocation(loc);
    }

    public normalizeLocationForMatch(loc: string): string {
        return normalizeLocation(loc);
    }

    public isRemoteLocation(loc: string): boolean {
        const lower = (loc || "").toLowerCase();
        return (
            lower.includes("remote") ||
            lower.includes("global") ||
            lower.includes("anywhere") ||
            lower.includes("worldwide") ||
            lower.includes("wfh") ||
            lower.includes("work from home")
        );
    }

    public isIndiaLocation(loc: string): boolean {
        const lower = (loc || "").toLowerCase().trim();
        if (/\bindia\b/i.test(lower)) return true;
        
        const canonical = canonicalizeLocation(lower);
        if (canonical) {
            for (const indianHub of Object.keys(INDIAN_LOCATION_ALIASES)) {
                if (canonical === indianHub) return true;
            }
        }
        for (const aliases of Object.values(INDIAN_LOCATION_ALIASES)) {
            for (const alias of aliases) {
                const regex = new RegExp(`\\b${alias.toLowerCase()}\\b`, "i");
                if (regex.test(lower)) return true;
            }
        }
        return false;
    }

    public isExplicitNonIndiaRemote(text: string): boolean {
        const lower = (text || "").toLowerCase();
        const nonIndiaIndicators = [
            "us only", "usa only", "united states only", "u.s. only",
            "us remote", "remote - us", "remote (us", "remote, us",
            "remote (usa", "remote - usa", "remote, usa", "remote - united states",
            "north america", "americas only", "latam",
            "uk only", "uk remote", "remote - uk", "remote (uk",
            "emea only", "emea remote", "remote - emea", "remote (emea",
            "europe only", "europe remote", "remote - europe", "remote (europe",
            "germany only", "within germany", "canada only", "australia only",
            "munich", "berlin", "frankfurt", "hamburg", "london", "dublin", "amsterdam", "paris",
            "san francisco", "new york", "seattle", "austin", "chicago", "boston", "toronto",
            "united states", "usa", "canada", "germany", "france", "netherlands", "ireland"
        ];
        return nonIndiaIndicators.some((indicator) => lower.includes(indicator));
    }

    public isIndiaOrGlobalCompatible(loc: string, extraContext = ""): boolean {
        const lowerLoc = (loc || "").toLowerCase().trim();
        const combined = `${lowerLoc} ${extraContext}`.toLowerCase();
        
        // 1. If job location is strictly in India (city or India tag), accept
        if (this.isIndiaLocation(lowerLoc)) {
            return true;
        }

        // 2. If explicitly non-India or restricted foreign region, reject
        if (this.isExplicitNonIndiaRemote(lowerLoc) || this.isExplicitNonIndiaRemote(combined)) {
            return false;
        }

        // 3. If explicitly global remote, accept
        if (
            lowerLoc.includes("worldwide") ||
            lowerLoc.includes("global") ||
            lowerLoc.includes("anywhere") ||
            lowerLoc.includes("remote (global)") ||
            lowerLoc.includes("remote - global") ||
            lowerLoc.includes("remote - worldwide") ||
            lowerLoc.includes("remote (worldwide)") ||
            lowerLoc.includes("remote - anywhere")
        ) {
            return true;
        }

        // 4. If plain "remote" with no foreign country or city restrictions
        if (lowerLoc === "remote" || lowerLoc === "remote / work from home") {
            return !this.isExplicitNonIndiaRemote(combined);
        }

        return false;
    }

    private async fetchWithTimeout(url: string, timeoutMs = 3500): Promise<Response> {
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
        const companiesToQuery = requestedCompany ? [requestedCompany] : allCompanies.slice(0, 8);
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
        const companiesToQuery = requestedCompany ? [requestedCompany] : allCompanies.slice(0, 8);
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
        const companiesToQuery = requestedCompany ? [requestedCompany] : allCompanies.slice(0, 6);
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

            if (rawJobs.length > 0) {
                this.setInCache(cacheKey, rawJobs);
            }
        }

        return this.filterJobs(rawJobs, input);
    }

    async searchGeneral(input: SourceSearchInput, preferredSource = "general"): Promise<SourceJob[]> {
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
        const requestedLoc = requestedLocRaw ? normalizeLocation(requestedLocRaw) : "";
        const isUsRequested = requestedLoc === "us" || requestedLoc === "usa" || requestedLoc.includes("united states");
        const isGlobalRemoteRequested = requestedLocLower === "global remote";
        const isRemoteIndiaRequested = requestedLocLower === "remote india";

        const isIndiaRequested = requestedLocLower === "india" || isRemoteIndiaRequested;
        const canonicalReq = canonicalizeLocation(requestedLocLower) || (INDIAN_LOCATION_ALIASES[requestedLoc] ? requestedLoc : null);

        return jobs.filter((job) => {
            const jobLocRaw = job.location || "";
            const jobLocLower = jobLocRaw.toLowerCase();

            const context = `${job.location} ${job.title} ${job.description} ${job.url}`.toLowerCase();

            // Strict rejection of explicit foreign regions ONLY if querying India specifically
            if (isIndiaRequested && (this.isExplicitNonIndiaRemote(jobLocRaw) || this.isExplicitNonIndiaRemote(context))) {
                if (!this.isIndiaLocation(jobLocRaw)) {
                    return false;
                }
            }

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
                if (!this.isIndiaLocation(jobLocRaw) && this.isExplicitNonIndiaRemote(context)) {
                    return false;
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
                if (requestedLocLower === "india") {
                    if (!this.isIndiaLocation(jobLocRaw) && !this.isIndiaOrGlobalCompatible(jobLocRaw, context)) {
                        return false;
                    }
                } else if (canonicalReq) {
                    const aliases = INDIAN_LOCATION_ALIASES[canonicalReq] || [];
                    const jobLocCanonical = canonicalizeLocation(jobLocLower) || normalizeLocation(jobLocRaw);
                    const cityMatches =
                        jobLocCanonical === canonicalReq ||
                        aliases.some((alias) => jobLocLower.includes(alias.toLowerCase())) ||
                        jobLocLower.includes(requestedLocLower);

                    if (!cityMatches) {
                        return false;
                    }
                } else {
                    const matched =
                        jobLocLower.includes(requestedLocLower) ||
                        normalizeLocation(jobLocRaw) === requestedLoc;
                    if (!matched) {
                        return false;
                    }
                }
            }

            if (terms.length === 0) return true;

            const text = `${job.title} ${job.company} ${job.description} ${job.location}`.toLowerCase();
            return terms.some((term) => text.includes(term));
        });
    }

    private extractCompanyFromInput(keyword: string, knownCompanies: string[]): string | null {
        const lower = (keyword || "").toLowerCase();
        for (const company of knownCompanies) {
            if (lower.includes(company)) {
                return company;
            }
        }
        return null;
    }

    async searchAll(input: SourceSearchInput): Promise<SourceJob[]> {
        const [greenhouse, ashby, lever, remote] = await Promise.allSettled([
            this.searchGreenhouse(input),
            this.searchAshby(input),
            this.searchLever(input),
            this.searchRemote(input),
        ]);

        const allJobs: SourceJob[] = [];
        if (greenhouse.status === "fulfilled") allJobs.push(...greenhouse.value);
        if (ashby.status === "fulfilled") allJobs.push(...ashby.value);
        if (lever.status === "fulfilled") allJobs.push(...lever.value);
        if (remote.status === "fulfilled") allJobs.push(...remote.value);

        return allJobs;
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

