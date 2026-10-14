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
    private cache = new Map<string, { timestamp: number; jobs: any[] }>();
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
        const requestedTier = (input.tier === "SEMI_MNC" ? "SEMI_MNC" : input.tier === "MNC" ? "MNC" : "ALL");
        const allCompanies = getAllGreenhouseCompanies(requestedTier);
        const specificCompany = this.extractCompanyFromInput(input.keyword, allCompanies);

        const prioritizedGreenhouse = [
            "razorpaysoftwareprivatelimited", "slice", "groww", "inmobi", "thoughtworks",
            "gitlab", "cloudflare", "elastic", "mongodb"
        ];
        const companiesToFetch = specificCompany ? [specificCompany] : Array.from(new Set([...prioritizedGreenhouse, ...allCompanies])).slice(0, 15);

        const jobs: SourceJob[] = [];
        const tasks = companiesToFetch.map(async (company) => {
            const cacheKey = `greenhouse:${company}`;
            let rawJobs = this.getFromCache(cacheKey);

            if (!rawJobs) {
                rawJobs = [];
                try {
                    const res = await this.fetchWithTimeout(
                        `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`,
                    );
                    if (res.ok) {
                        const data = (await res.json()) as { jobs?: GreenhouseJobRaw[] };
                        if (Array.isArray(data.jobs)) {
                            for (const j of data.jobs) {
                                rawJobs.push({
                                    externalId: `greenhouse-${company}-${j.id}`,
                                    title: j.title,
                                    company: this.capitalize(company),
                                    url: j.absolute_url,
                                    location: j.location?.name || "Remote",
                                    description: j.content || j.title,
                                    source: "greenhouse",
                                });
                            }
                        }
                    }
                } catch {
                    // Ignore transient board fetch failure
                }

                if (rawJobs.length > 0) {
                    this.setInCache(cacheKey, rawJobs);
                }
            }

            jobs.push(...rawJobs);
        });

        await Promise.allSettled(tasks);
        return this.filterJobs(jobs, input);
    }

    async searchAshby(input: SourceSearchInput): Promise<SourceJob[]> {
        const requestedTier = (input.tier === "SEMI_MNC" ? "SEMI_MNC" : input.tier === "MNC" ? "MNC" : "ALL");
        const allCompanies = getAllAshbyCompanies(requestedTier);
        const specificCompany = this.extractCompanyFromInput(input.keyword, allCompanies);

        const prioritizedAshby = [
            "supabase", "posthog", "sentry", "cursor", "linear", "resend"
        ];
        const companiesToFetch = specificCompany ? [specificCompany] : Array.from(new Set([...prioritizedAshby, ...allCompanies])).slice(0, 10);

        const jobs: SourceJob[] = [];
        const tasks = companiesToFetch.map(async (company) => {
            const cacheKey = `ashby:${company}`;
            let rawJobs = this.getFromCache(cacheKey);

            if (!rawJobs) {
                rawJobs = [];
                try {
                    const res = await this.fetchWithTimeout(
                        `https://api.ashbyhq.com/posting-api/job-board/${company}`,
                    );
                    if (res.ok) {
                        const data = (await res.json()) as { jobs?: AshbyJobRaw[] };
                        if (Array.isArray(data.jobs)) {
                            for (const j of data.jobs) {
                                rawJobs.push({
                                    externalId: `ashby-${company}-${j.id}`,
                                    title: j.title,
                                    company: this.capitalize(company),
                                    url: j.jobUrl,
                                    location: j.location || "Remote",
                                    description: j.descriptionPlain || j.title,
                                    source: "ashby",
                                });
                            }
                        }
                    }
                } catch {
                    // Ignore board fetch failure
                }

                if (rawJobs.length > 0) {
                    this.setInCache(cacheKey, rawJobs);
                }
            }

            jobs.push(...rawJobs);
        });

        await Promise.allSettled(tasks);
        return this.filterJobs(jobs, input);
    }

    async searchLever(input: SourceSearchInput): Promise<SourceJob[]> {
        const requestedTier = (input.tier === "SEMI_MNC" ? "SEMI_MNC" : input.tier === "MNC" ? "MNC" : "ALL");
        const allCompanies = getAllLeverCompanies(requestedTier);
        const specificCompany = this.extractCompanyFromInput(input.keyword, allCompanies);

        const prioritizedLever = [
            "meesho", "zeta", "paytm", "cred", "freshworks",
            "atlassian", "spotify", "uber"
        ];
        const companiesToFetch = specificCompany ? [specificCompany] : Array.from(new Set([...prioritizedLever, ...allCompanies])).slice(0, 15);

        const jobs: SourceJob[] = [];
        const tasks = companiesToFetch.map(async (company) => {
            const cacheKey = `lever:${company}`;
            let rawJobs = this.getFromCache(cacheKey);

            if (!rawJobs) {
                rawJobs = [];
                try {
                    const res = await this.fetchWithTimeout(
                        `https://api.lever.co/v0/postings/${company}?mode=json`,
                    );
                    if (res.ok) {
                        const data = (await res.json()) as LeverJobRaw[];
                        if (Array.isArray(data)) {
                            for (const j of data) {
                                rawJobs.push({
                                    externalId: `lever-${company}-${j.id}`,
                                    title: j.text,
                                    company: this.capitalize(company),
                                    url: j.hostedUrl,
                                    location: j.categories?.location || "Remote",
                                    description: j.descriptionPlain || j.text,
                                    source: "lever",
                                });
                            }
                        }
                    }
                } catch {
                    // Ignore board fetch failure
                }

                if (rawJobs.length > 0) {
                    this.setInCache(cacheKey, rawJobs);
                }
            }

            jobs.push(...rawJobs);
        });

        await Promise.allSettled(tasks);
        return this.filterJobs(jobs, input);
    }

    async searchRemote(input: SourceSearchInput): Promise<SourceJob[]> {
        const cacheKey = "remote:arbeitnow";
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
            const titleLower = (job.title || "").toLowerCase();

            if (terms.length <= 2) {
                return terms.every((term) => text.includes(term));
            }
            const textMatches = terms.filter((term) => text.includes(term)).length;
            const titleMatches = terms.filter((term) => titleLower.includes(term)).length;
            return textMatches >= Math.ceil(terms.length * 0.5) || titleMatches >= 2;
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
        const [greenhouse, ashby, lever] = await Promise.allSettled([
            this.searchGreenhouse(input),
            this.searchAshby(input),
            this.searchLever(input),
        ]);

        const results = [greenhouse, ashby, lever];
        const failures = results.filter((result) => result.status === "rejected");
        if (failures.length === results.length) {
            throw new AggregateError(
                failures.map((result) => result.reason),
                "All live job sources failed.",
            );
        }

        const allJobs: SourceJob[] = [];
        if (greenhouse.status === "fulfilled") allJobs.push(...greenhouse.value);
        if (ashby.status === "fulfilled") allJobs.push(...ashby.value);
        if (lever.status === "fulfilled") allJobs.push(...lever.value);
        const unique = new Map<string, SourceJob>();
        for (const job of allJobs) unique.set(job.url.toLowerCase().replace(/\/$/, ""), job);
        return Array.from(unique.values());
    }

    private capitalize(str: string): string {
        const lower = str.toLowerCase();
        if (lower === "razorpaysoftwareprivatelimited" || lower === "razorpay") return "Razorpay";
        if (lower === "thoughtworks") return "Thoughtworks";
        if (lower === "inmobi") return "InMobi";
        if (lower === "groww") return "Groww";
        if (lower === "meesho") return "Meesho";
        if (lower === "zeta") return "Zeta";
        if (lower === "paytm") return "Paytm";
        if (lower === "cred") return "CRED";
        if (lower === "freshworks") return "Freshworks";
        if (lower === "postman") return "Postman";
        if (lower === "browserstack") return "BrowserStack";
        if (lower === "clevertap") return "CleverTap";
        if (lower === "hasura") return "Hasura";
        if (lower === "github") return "GitHub";
        if (lower === "gitlab") return "GitLab";
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    private getFromCache(key: string): any[] | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.CACHE_TTL_MS) {
            this.cache.delete(key);
            return null;
        }
        return entry.jobs;
    }

    async getRealtimeIndianOpenings(input: {
        category?: string;
        department?: string;
        city?: string;
        keyword?: string;
        minSalaryLPA?: number;
        remoteOnly?: boolean;
    } = {}): Promise<Array<SourceJob & { department?: string; tags?: string[] }>> {
        const kw = input.keyword || "";
        const [gh, lv, as] = await Promise.all([
            this.searchGreenhouse({ keyword: kw, location: input.city, remote: input.remoteOnly }),
            this.searchLever({ keyword: kw, location: input.city, remote: input.remoteOnly }),
            this.searchAshby({ keyword: kw, location: input.city, remote: input.remoteOnly }),
        ]);
        const combined = [...gh, ...lv, ...as];
        return combined
            .filter((j) => this.isIndiaOrGlobalCompatible(j.location || "", j.description || ""))
            .map((j) => ({
                ...j,
                tags: ["Engineering", "TypeScript", "Node.js"],
            }));
    }

    private setInCache(key: string, jobs: any[]): void {
        this.cache.set(key, { timestamp: Date.now(), jobs });
    }
}

export const liveAtsService = new LiveAtsService();
export { LiveAtsService };
export default liveAtsService;
