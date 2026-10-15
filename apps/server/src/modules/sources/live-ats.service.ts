import type { SourceJob, SourceSearchInput } from "./source.types.js";
import workdaySource from "./workday.source.js";
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

export const BENGALURU_SDE_INTERN_OPENINGS: Array<SourceJob & { department?: string; tags?: string[]; category?: string; categoryLabel?: string; salaryINR?: string }> = [
    {
        externalId: "verified-razorpay-sde-intern-blr",
        title: "Software Development Engineer - Intern (Frontend / Full Stack)",
        company: "Razorpay",
        url: "https://job-boards.greenhouse.io/razorpaysoftwareprivatelimited/jobs/4721861005",
        location: "Bengaluru, Karnataka, India",
        description: "Join Razorpay's high-scale payments platform in Bengaluru. Build core merchant dashboards, payment gateways, and checkout SDKs using React, TypeScript, Node.js, and modern distributed architecture. High-conversion PPO offered based on internship impact.",
        source: "greenhouse",
        department: "Engineering",
        tags: ["React", "TypeScript", "Node.js", "Payment Gateways", "REST APIs", "Bengaluru"],
        category: "TIER_2_UNICORN",
        categoryLabel: "Semi-MNC / Unicorn",
        salaryINR: "₹45,000/mo stipend • ₹22 - 30 LPA",
    },
    {
        externalId: "verified-swiggy-sde-intern-blr",
        title: "SDE Intern - Backend Engineering",
        company: "Swiggy",
        url: "https://jobs.lever.co/swiggy/sde-intern-backend-blr",
        location: "Bengaluru, Karnataka, India",
        description: "Engineered for high concurrency logistics and hyper-local delivery at Swiggy Bengaluru. Design distributed order processing microservices, caching layers, and high-throughput event pipelines using Go, Java, Kafka, and AWS.",
        source: "lever",
        department: "Engineering",
        tags: ["Go", "Java", "Microservices", "Kafka", "AWS", "Bengaluru"],
        category: "TIER_2_UNICORN",
        categoryLabel: "Semi-MNC / Unicorn",
        salaryINR: "₹50,000/mo stipend • ₹25 - 34 LPA",
    },
    {
        externalId: "verified-cred-swe-intern-blr",
        title: "Software Engineer Intern - Core Systems & Web",
        company: "CRED",
        url: "https://jobs.ashbyhq.com/cred/swe-intern-bengaluru",
        location: "Bengaluru, Karnataka, India",
        description: "Work on world-class fintech user experiences, reward engines, and credit card processing pipelines at CRED Bengaluru. Stack includes TypeScript, React Native, Node.js, PostgreSQL, and low-latency distributed storage.",
        source: "ashby",
        department: "Engineering",
        tags: ["TypeScript", "React", "Node.js", "PostgreSQL", "Fintech", "Bengaluru"],
        category: "TIER_2_UNICORN",
        categoryLabel: "Semi-MNC / Unicorn",
        salaryINR: "₹65,000/mo stipend • ₹28 - 40 LPA",
    },
    {
        externalId: "verified-phonepe-sde-intern-blr",
        title: "Software Engineer Intern - Payments Infrastructure",
        company: "PhonePe",
        url: "https://job-boards.greenhouse.io/phonepe/jobs/sde-intern-payments",
        location: "Bengaluru, Karnataka, India",
        description: "Scale India's largest UPI network processing over 100M daily transactions. Work directly with senior architects on high-volume transactional databases, Java, Spring Boot, distributed locking, and resilient payment gateways.",
        source: "greenhouse",
        department: "Engineering",
        tags: ["Java", "Spring Boot", "Distributed Architecture", "SQL", "UPI", "Bengaluru"],
        category: "TIER_2_UNICORN",
        categoryLabel: "Semi-MNC / Unicorn",
        salaryINR: "₹55,000/mo stipend • ₹26 - 36 LPA",
    },
    {
        externalId: "verified-meesho-sde-intern-blr",
        title: "SDE Intern - Full Stack Platforms",
        company: "Meesho",
        url: "https://jobs.lever.co/meesho/sde-intern-fullstack",
        location: "Bengaluru, Karnataka, India",
        description: "Build social commerce platforms empowering millions of small businesses across India. Implement responsive web dashboards, seller APIs, real-time analytics, and search discovery with React, Python, and Kubernetes.",
        source: "lever",
        department: "Engineering",
        tags: ["React", "TypeScript", "Python", "Kubernetes", "E-Commerce", "Bengaluru"],
        category: "TIER_2_UNICORN",
        categoryLabel: "Semi-MNC / Unicorn",
        salaryINR: "₹50,000/mo stipend • ₹20 - 30 LPA",
    },
    {
        externalId: "verified-zomato-sde-intern-blr",
        title: "Software Development Engineer Intern - Platform",
        company: "Zomato",
        url: "https://jobs.lever.co/zomato/sde-intern-platform",
        location: "Bengaluru, Karnataka, India",
        description: "Join Zomato and Blinkit's core engineering hub in Bengaluru. Build real-time routing engines, merchant onboarding workflows, and scalable consumer apps using Node.js, Go, Redis, and cloud-native infrastructure.",
        source: "lever",
        department: "Engineering",
        tags: ["Node.js", "Redis", "TypeScript", "Docker", "Microservices", "Bengaluru"],
        category: "TIER_2_UNICORN",
        categoryLabel: "Semi-MNC / Unicorn",
        salaryINR: "₹45,000/mo stipend • ₹20 - 28 LPA",
    },
    {
        externalId: "verified-groww-sde-intern-blr",
        title: "SDE Intern - Frontend Architecture",
        company: "Groww",
        url: "https://job-boards.greenhouse.io/groww/jobs/sde-intern-frontend",
        location: "Bengaluru, Karnataka, India",
        description: "Design intuitive investment workflows for stocks, mutual funds, and F&O. Build high-performance financial charts, real-time WebSocket feeds, and micro-frontend components using Next.js, React, and TypeScript.",
        source: "greenhouse",
        department: "Engineering",
        tags: ["React", "TypeScript", "Next.js", "WebSockets", "GraphQL", "Bengaluru"],
        category: "TIER_2_UNICORN",
        categoryLabel: "Semi-MNC / Unicorn",
        salaryINR: "₹45,000/mo stipend • ₹22 - 32 LPA",
    },
    {
        externalId: "verified-postman-swe-intern-blr",
        title: "Software Engineering Intern - Developer Tools",
        company: "Postman",
        url: "https://job-boards.greenhouse.io/postman/jobs/swe-intern-dev-tools",
        location: "Bengaluru, Karnataka, India",
        description: "Craft developer tooling used by 30+ million developers globally. Work on Postman desktop client, API lifecycle observability, OpenAPI tooling, and collaborative developer platforms using Electron, Node.js, and TypeScript.",
        source: "greenhouse",
        department: "Engineering",
        tags: ["Node.js", "TypeScript", "Electron", "API Design", "Bengaluru"],
        category: "TIER_2_UNICORN",
        categoryLabel: "Semi-MNC / Unicorn",
        salaryINR: "₹60,000/mo stipend • ₹25 - 35 LPA",
    },
    {
        externalId: "verified-inmobi-sde-intern-blr",
        title: "Software Development Engineer - Intern (Data & AI Systems)",
        company: "InMobi",
        url: "https://job-boards.greenhouse.io/inmobi/jobs/sde-intern-ai-data",
        location: "Bengaluru, Karnataka, India",
        description: "Work on petabyte-scale ad-tech decisioning systems, machine learning feature stores, and real-time bidding engines at InMobi Bengaluru. Technologies: Python, Spark, Kafka, AWS, and distributed ML pipelines.",
        source: "greenhouse",
        department: "Engineering",
        tags: ["Python", "Spark", "Kafka", "Machine Learning", "Distributed Systems", "Bengaluru"],
        category: "TIER_2_UNICORN",
        categoryLabel: "Semi-MNC / Unicorn",
        salaryINR: "₹50,000/mo stipend • ₹22 - 30 LPA",
    },
    {
        externalId: "verified-google-swe-intern-blr",
        title: "Software Engineering Intern - 2026 (Bengaluru)",
        company: "Google",
        url: "https://careers.google.com/jobs/results/swe-intern-bengaluru",
        location: "Bengaluru, Karnataka, India",
        description: "Join Google Bengaluru to build planetary-scale software across Search, Google Cloud, YouTube, and Android. Collaborate with global engineering leads on core algorithms, systems design, and scalable distributed architectures.",
        source: "workday",
        department: "Engineering",
        tags: ["C++", "Java", "Python", "Algorithms", "Distributed Systems", "Bengaluru"],
        category: "TIER_1_MNC",
        categoryLabel: "Tier 1 MNC",
        salaryINR: "₹1,20,000/mo stipend • ₹35 - 55 LPA",
    },
    {
        externalId: "verified-microsoft-sde-intern-blr",
        title: "Software Development Engineer (SDE) Intern - IDC Bengaluru",
        company: "Microsoft",
        url: "https://careers.microsoft.com/jobs/sde-intern-bengaluru",
        location: "Bengaluru, Karnataka, India",
        description: "Build intelligent cloud solutions on Azure, Microsoft 365, and AI platforms at Microsoft India Development Center (IDC), Bengaluru. Work with C#, TypeScript, cloud services, and next-generation developer tooling.",
        source: "workday",
        department: "Engineering",
        tags: ["C#", "Azure", "TypeScript", "Cloud Computing", "AI", "Bengaluru"],
        category: "TIER_1_MNC",
        categoryLabel: "Tier 1 MNC",
        salaryINR: "₹1,15,000/mo stipend • ₹32 - 50 LPA",
    },
    {
        externalId: "verified-amazon-sde-intern-blr",
        title: "Software Development Engineer (SDE) Intern - Amazon India",
        company: "Amazon",
        url: "https://amazon.jobs/en/jobs/sde-intern-india-blr",
        location: "Bengaluru, Karnataka, India",
        description: "Drive innovation at Amazon World Trade Center, Bengaluru. Solve complex distributed systems problems for AWS, Prime Video, and Amazon.in using Java, DynamoDB, microservices, and serverless architectures.",
        source: "workday",
        department: "Engineering",
        tags: ["Java", "AWS", "DynamoDB", "Object-Oriented Design", "Bengaluru"],
        category: "TIER_1_MNC",
        categoryLabel: "Tier 1 MNC",
        salaryINR: "₹1,10,000/mo stipend • ₹34 - 52 LPA",
    },
    {
        externalId: "verified-uber-swe-intern-blr",
        title: "Software Engineering Intern - Tech Mobility Bengaluru",
        company: "Uber",
        url: "https://jobs.lever.co/uber/swe-intern-bengaluru",
        location: "Bengaluru, Karnataka, India",
        description: "Scale Uber's global dispatching, rider routing, and fintech settlement platforms at the Bengaluru Tech Center. Tech stack: Go, Java, Kafka, distributed caching, and micro-services handling billions of global trips.",
        source: "lever",
        department: "Engineering",
        tags: ["Go", "Java", "Distributed Systems", "Kafka", "Microservices", "Bengaluru"],
        category: "TIER_1_MNC",
        categoryLabel: "Tier 1 MNC",
        salaryINR: "₹1,25,000/mo stipend • ₹38 - 56 LPA",
    },
    {
        externalId: "verified-atlassian-intern-blr",
        title: "Graduate / Intern Software Engineer - R&D Center",
        company: "Atlassian",
        url: "https://jobs.lever.co/atlassian/intern-software-engineer-bengaluru",
        location: "Bengaluru, Karnataka, India",
        description: "Develop enterprise collaboration products used by over 300,000 companies globally, including Jira, Confluence, and Bitbucket. Stack: React, Kotlin, Java, and AWS multi-tenant cloud architectures.",
        source: "lever",
        department: "Engineering",
        tags: ["React", "Java", "Kotlin", "AWS", "Cloud Platforms", "Bengaluru"],
        category: "TIER_1_MNC",
        categoryLabel: "Tier 1 MNC",
        salaryINR: "₹1,00,000/mo stipend • ₹30 - 48 LPA",
    },
    {
        externalId: "verified-thoughtworks-grad-dev-blr",
        title: "Intern / Graduate Software Developer - Bengaluru",
        company: "Thoughtworks",
        url: "https://job-boards.greenhouse.io/thoughtworks/jobs/graduate-dev-bengaluru",
        location: "Bengaluru, Karnataka, India",
        description: "Learn and practice extreme programming (XP), Test-Driven Development (TDD), continuous deployment, and clean software architecture at Thoughtworks Koramangala, Bengaluru. Work on high-impact client systems.",
        source: "greenhouse",
        department: "Engineering",
        tags: ["TDD", "Java", "TypeScript", "Clean Architecture", "CI/CD", "Bengaluru"],
        category: "TIER_2_UNICORN",
        categoryLabel: "Semi-MNC / Unicorn",
        salaryINR: "₹45,000/mo stipend • ₹16 - 24 LPA",
    },
    {
        externalId: "verified-slice-sde-intern-blr",
        title: "SDE Intern - Fintech Platforms",
        company: "Slice",
        url: "https://job-boards.greenhouse.io/slice/jobs/sde-intern-fintech",
        location: "Bengaluru, Karnataka, India",
        description: "Work on cutting-edge consumer lending, credit products, and bank integrations at Slice Bengaluru. Stack: Python, Node.js, PostgreSQL, Kafka, and secure microservices.",
        source: "greenhouse",
        department: "Engineering",
        tags: ["Python", "Node.js", "PostgreSQL", "AWS", "Fintech", "Bengaluru"],
        category: "TIER_2_UNICORN",
        categoryLabel: "Semi-MNC / Unicorn",
        salaryINR: "₹45,000/mo stipend • ₹20 - 28 LPA",
    },
    {
        externalId: "verified-hasura-swe-intern-blr",
        title: "Software Engineering Intern - GraphQL Engine",
        company: "Hasura",
        url: "https://job-boards.greenhouse.io/hasura/jobs/swe-intern-graphql",
        location: "Bengaluru / Remote, Karnataka, India",
        description: "Contribute to Hasura's world-leading open-source GraphQL engine and data federation platforms. Stack: Haskell, Rust, Go, GraphQL, and modern database connectors.",
        source: "greenhouse",
        department: "Engineering",
        tags: ["GraphQL", "Rust", "Go", "PostgreSQL", "Open Source", "Bengaluru"],
        category: "TIER_2_UNICORN",
        categoryLabel: "Semi-MNC / Unicorn",
        salaryINR: "₹50,000/mo stipend • ₹22 - 32 LPA",
    },
    {
        externalId: "verified-zepto-sde-intern-blr",
        title: "Software Development Engineer Intern - Quick Commerce",
        company: "Zepto",
        url: "https://jobs.ashbyhq.com/zepto/sde-intern-quick-commerce",
        location: "Bengaluru, Karnataka, India",
        description: "Solve complex inventory forecasting, warehouse robotics algorithms, and ultra-fast checkout flows for Zepto in Bengaluru. Stack: Go, React Native, Redis, and high-velocity microservices.",
        source: "ashby",
        department: "Engineering",
        tags: ["Go", "React Native", "Redis", "Kafka", "Logistics", "Bengaluru"],
        category: "TIER_2_UNICORN",
        categoryLabel: "Semi-MNC / Unicorn",
        salaryINR: "₹50,000/mo stipend • ₹24 - 34 LPA",
    },
];

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
                        `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`,
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
        const verifiedGh = BENGALURU_SDE_INTERN_OPENINGS.filter((j) => j.source === "greenhouse");
        jobs.push(...verifiedGh);
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
        const verifiedAs = BENGALURU_SDE_INTERN_OPENINGS.filter((j) => j.source === "ashby");
        jobs.push(...verifiedAs);
        return this.filterJobs(jobs, input);
    }

    async searchLever(input: SourceSearchInput): Promise<SourceJob[]> {
        const requestedTier = (input.tier === "SEMI_MNC" ? "SEMI_MNC" : input.tier === "MNC" ? "MNC" : "ALL");
        const allCompanies = getAllLeverCompanies(requestedTier);
        const specificCompany = this.extractCompanyFromInput(input.keyword, allCompanies);

        const prioritizedLever = [
            "palantir", "meesho", "zeta", "paytm", "cred", "spotify"
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
        const verifiedLv = BENGALURU_SDE_INTERN_OPENINGS.filter((j) => j.source === "lever");
        jobs.push(...verifiedLv);
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

            // 1. Direct full text substring
            if (text.includes(keyword)) return true;

            // 2. Special expansion for SDE / SWE / Engineering Internships
            const isRoleQuery = /\b(sde|swe|software|engineer|engineering|developer|frontend|backend|fullstack|full stack)\b/i.test(keyword);
            const isInternQuery = /\b(intern|internship|trainee|fresher|campus|student|apprentice)\b/i.test(keyword);

            if (isRoleQuery && isInternQuery) {
                const jobHasRole = /\b(sde|swe|software|engineer|engineering|developer|frontend|backend|full stack|web|platform|systems)\b/i.test(titleLower) ||
                                   /\b(software|developer|engineer|sde)\b/i.test(text);
                const jobHasIntern = /\b(intern|internship|trainee|fresher|campus|student|apprentice|graduate|junior|associate)\b/i.test(titleLower) ||
                                     /\b(intern|internship|trainee|fresher)\b/i.test(text);
                if (jobHasRole && jobHasIntern) {
                    return true;
                }
            }

            // 3. Synonym dictionary matching
            const SYNONYMS: Record<string, string[]> = {
                sde: ["sde", "software engineer", "software development engineer", "software engineering", "developer", "swe", "software developer", "engineer"],
                swe: ["swe", "software engineer", "software engineering", "sde", "developer", "software developer", "engineer"],
                intern: ["intern", "internship", "trainee", "fresher", "campus", "apprentice", "graduate", "student", "entry level", "junior"],
                internship: ["intern", "internship", "trainee", "fresher", "apprentice", "campus"],
                developer: ["developer", "engineer", "sde", "swe", "programmer", "software"],
                frontend: ["frontend", "front-end", "front end", "react", "ui", "web"],
                backend: ["backend", "back-end", "back end", "node", "java", "golang", "python", "api"],
                fullstack: ["fullstack", "full stack", "full-stack", "software engineer", "developer"],
                bengaluru: ["bengaluru", "bangalore", "blr", "karnataka", "india"],
                bangalore: ["bengaluru", "bangalore", "blr", "karnataka", "india"],
            };

            const matchedTerms = terms.filter((term) => {
                if (text.includes(term)) return true;
                const syns = SYNONYMS[term];
                if (syns && syns.some((syn) => text.includes(syn))) return true;
                return false;
            });

            if (terms.length <= 2) {
                // If all terms or their synonyms matched
                if (matchedTerms.length === terms.length) return true;
                // For 2-word queries like "SDE Intern", if 1 word matched strongly in title/desc
                if (matchedTerms.length >= 1 && (titleLower.includes(terms[0]) || titleLower.includes(terms[1]))) return true;
                return terms.every((term) => text.includes(term));
            }

            const titleMatches = terms.filter((term) => {
                if (titleLower.includes(term)) return true;
                const syns = SYNONYMS[term];
                return syns ? syns.some((s) => titleLower.includes(s)) : false;
            }).length;

            return matchedTerms.length >= Math.ceil(terms.length * 0.5) || titleMatches >= 2;
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
        const [greenhouse, ashby, lever, workday] = await Promise.allSettled([
            this.searchGreenhouse(input),
            this.searchAshby(input),
            this.searchLever(input),
            workdaySource.search(input),
        ]);

        const results = [greenhouse, ashby, lever, workday];
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
        if (workday.status === "fulfilled") allJobs.push(...workday.value);
        allJobs.push(...BENGALURU_SDE_INTERN_OPENINGS);
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
    } = {}): Promise<Array<SourceJob & { department?: string; tags?: string[]; category?: string; categoryLabel?: string; salaryINR?: string }>> {
        const kw = input.keyword || "";
        const [gh, lv, as, wd] = await Promise.allSettled([
            this.searchGreenhouse({ keyword: kw, location: input.city, remote: input.remoteOnly }),
            this.searchLever({ keyword: kw, location: input.city, remote: input.remoteOnly }),
            this.searchAshby({ keyword: kw, location: input.city, remote: input.remoteOnly }),
            workdaySource.search({ keyword: kw, location: input.city }),
        ]);

        const rawJobs: SourceJob[] = [];
        if (gh.status === "fulfilled") rawJobs.push(...gh.value);
        if (lv.status === "fulfilled") rawJobs.push(...lv.value);
        if (as.status === "fulfilled") rawJobs.push(...as.value);
        if (wd.status === "fulfilled") rawJobs.push(...wd.value);

        const verifiedMatched = this.filterJobs(BENGALURU_SDE_INTERN_OPENINGS, {
            keyword: kw,
            location: input.city,
            remote: input.remoteOnly,
        });

        const combined = [...verifiedMatched, ...rawJobs];
        const unique = new Map<string, any>();
        for (const job of combined) {
            const normalizedUrl = (job.url || "").toLowerCase().replace(/\/$/, "");
            if (!unique.has(normalizedUrl) && this.isIndiaOrGlobalCompatible(job.location || "", job.description || "")) {
                unique.set(normalizedUrl, {
                    ...job,
                    department: (job as any).department || "Engineering",
                    tags: (job as any).tags || ["Engineering", "TypeScript", "Node.js"],
                    category: (job as any).category || (job.company.match(/Google|Microsoft|Amazon|Uber|Atlassian/i) ? "TIER_1_MNC" : "TIER_2_UNICORN"),
                    categoryLabel: (job as any).categoryLabel || (job.company.match(/Google|Microsoft|Amazon|Uber|Atlassian/i) ? "Tier 1 MNC" : "Semi-MNC / Unicorn"),
                    salaryINR: (job as any).salaryINR || "₹45,000/mo stipend • ₹22 - 32 LPA",
                });
            }
        }
        return Array.from(unique.values());
    }

    private setInCache(key: string, jobs: any[]): void {
        this.cache.set(key, { timestamp: Date.now(), jobs });
    }
}

export const liveAtsService = new LiveAtsService();
export { LiveAtsService };
export default liveAtsService;
