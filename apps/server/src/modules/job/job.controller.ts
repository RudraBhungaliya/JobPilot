import type { Request, Response } from "express";

import jobService from "./job.service.js";
import {
    createJobSchema,
    updateJobSchema,
} from "./job.validators.js";
import sourceRegistry from "../sources/source.registry.js";
import crawlerService from "../crawler/crawler.service.js";
import { crawlSchema } from "../crawler/crawler.validators.js";
import { prisma } from "@jobpilot/database";

class JobController {
    async liveJobs(req: Request, res: Response) {
        const keyword = typeof req.query.keyword === "string" ? req.query.keyword : "";
        const location = typeof req.query.location === "string" ? req.query.location : "";
        const city = typeof req.query.city === "string" ? req.query.city : "";
        const category = typeof req.query.category === "string" ? req.query.category : "";
        try {
            sourceRegistry.initialize();
            const rawJobs = await sourceRegistry.getService().search({
                keyword,
                location: city && city !== "ALL" ? city : location || undefined,
            });
            const terms = keyword.toLowerCase().trim().split(/\s+/).filter((term) => term.length > 1);
            const seenUrls = new Set<string>();
            const filtered = rawJobs.filter((job) => {
                let parsed: URL;
                try { parsed = new URL(job.url); } catch { return false; }
                if (parsed.protocol !== "https:") return false;
                const host = parsed.hostname.toLowerCase();
                const officialHost = job.source === "greenhouse"
                    ? (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io" || host.endsWith(".greenhouse.io"))
                    : job.source === "ashby"
                    ? (host === "jobs.ashbyhq.com" || host.endsWith(".ashbyhq.com"))
                    : job.source === "lever"
                    ? (host === "jobs.lever.co" || host.endsWith(".lever.co"))
                    : job.source === "workday"
                    ? host.endsWith(".myworkdayjobs.com")
                    : false;
                if (!officialHost) return false;
                const normalizedUrl = parsed.toString().replace(/\/$/, "").toLowerCase();
                if (seenUrls.has(normalizedUrl)) return false;
                seenUrls.add(normalizedUrl);

                if (terms.length === 0) return true;

                const text = `${job.title} ${job.company} ${job.description} ${job.location || ""}`.toLowerCase();
                const titleLower = (job.title || "").toLowerCase();

                // If query is technical/engineering, eliminate non-engineering noise (Account Executive, Sales, etc.)
                const isTechQuery = /software|engineer|developer|frontend|backend|full.?stack|devops|data|machine learning|sdet/i.test(keyword);
                if (isTechQuery) {
                    const isNonTech = /account executive|business development|sales executive|sales manager|recruiter|legal counsel|workplace|payroll/i.test(titleLower);
                    if (isNonTech && !/engineer|developer|architect|tech/i.test(titleLower)) {
                        return false;
                    }
                }

                // If short search (1-2 terms), all must appear
                if (terms.length <= 2) {
                    return terms.every((term) => text.includes(term));
                }

                // If longer search (e.g. "Senior Full Stack Engineer"):
                // Check if title or text has majority of terms, or key discipline matches
                const textMatches = terms.filter((term) => text.includes(term)).length;
                const titleMatches = terms.filter((term) => titleLower.includes(term)).length;
                return textMatches >= Math.ceil(terms.length * 0.5) || titleMatches >= 2;
            });

            const currentUserId = req.user?.id;
            let candidateContext: any;
            if (currentUserId) {
                try {
                    const { jobMatchingService } = await import("../matching/job-matching.service.js");
                    candidateContext = await jobMatchingService.getRealCandidateContext(currentUserId);
                } catch {
                    // Candidate context not yet initialized
                }
            }

            const mappedJobs = await Promise.all(filtered.map(async (job) => {
                let evaluation: any = { status: "unavailable", reason: "Authentication and a saved profile are required for match evaluation." };
                if (candidateContext) {
                    try {
                        const { jobMatchingService } = await import("../matching/job-matching.service.js");
                        const result = jobMatchingService.matchJob(candidateContext, {
                            title: job.title, company: job.company, description: job.description,
                            location: job.location || "", url: job.url,
                        });
                        evaluation = { status: "available", matchScore: result.matchScore, matchedSkills: result.matchedSkills, missingSkills: result.missingSkills };
                    } catch {
                        evaluation = { status: "unavailable", reason: "Candidate or job data could not be evaluated." };
                    }
                }

                const matchedTags = evaluation.matchedSkills || [];
                const defaultTags = ["TypeScript", "React", "Node.js", "Python", "Cloud", "Distributed Systems"];
                const jobText = `${job.title} ${job.description || ""}`.toLowerCase();
                const inferredTags = defaultTags.filter((t) => jobText.includes(t.toLowerCase()));

                return {
                    id: job.externalId || job.url,
                    sourceJobId: job.externalId,
                    title: job.title,
                    company: job.company,
                    location: job.location,
                    source: job.source,
                    sourceUrl: job.url,
                    applicationUrl: job.url,
                    atsUrl: job.url,
                    description: job.description,
                    tags: matchedTags.length > 0 ? matchedTags : (inferredTags.length > 0 ? inferredTags : ["Engineering"]),
                    matchScore: evaluation.matchScore,
                    matchedSkills: evaluation.matchedSkills,
                    missingSkills: evaluation.missingSkills,
                    evaluationStatus: evaluation.status,
                    evaluationReason: evaluation.reason,
                    salaryRange: undefined,
                };
            }));

            // Location Priority: strictly prioritize Indian hubs, Remote India, and Global Remote over foreign onsite/regional roles
            const getLocationPriority = (location: string = "", title: string = "", description: string = ""): number => {
                const locLower = (location || "").toLowerCase().trim();
                const locTitle = `${locLower} ${(title || "").toLowerCase()}`;

                const indianCities = [
                    "bengaluru", "bangalore", "hyderabad", "pune", "mumbai", "delhi", "gurgaon", "gurugram",
                    "noida", "chennai", "kolkata", "ahmedabad", "jaipur", "kochi", "chandigarh", "indore"
                ];
                const isIndiaHub = indianCities.some((c) => locLower.includes(c));
                const hasIndiaWord = /\bindia\b/i.test(locTitle);

                if (isIndiaHub || hasIndiaWord) {
                    if (locLower.includes("remote") || locTitle.includes("remote")) return 95;
                    return 100;
                }

                if (
                    locLower.includes("worldwide") ||
                    locLower.includes("global") ||
                    locLower.includes("anywhere") ||
                    locLower.includes("work from anywhere")
                ) return 85;

                // Explicit foreign country or regional indicator (e.g. Remote US, Remote UK, Canada, London, SF)
                const isForeignRestricted = /\b(united states|\bus\b|\busa\b|u\.s\.|united kingdom|\buk\b|canada|germany|france|poland|ireland|israel|australia|singapore|korea|austria|japan|malaysia|netherlands|brazil|spain|italy|sweden|mexico|colombia|latam|emea|apac|north america)\b/i.test(locLower) ||
                    /san francisco|new york|seattle|austin|chicago|boston|toronto|london|berlin|paris|dublin|sydney|tokyo/i.test(locLower);

                if (isForeignRestricted) {
                    return 10;
                }

                if (locLower.includes("remote")) {
                    return 75;
                }

                return 20;
            };

            // Unless the caller specifically requested a foreign location, omit foreign onsite roles (North America, Europe, etc.)
            const isForeignExplicitSearch = /san francisco|new york|london|seattle|austin|chicago|boston|berlin|tokyo|toronto|canada|united states|\bus\b|\bca\b/i.test(`${location} ${city}`);
            const finalJobs = isForeignExplicitSearch
                ? mappedJobs
                : mappedJobs.filter((job) => getLocationPriority(job.location, job.title, job.description) >= 70);

            // Sort jobs: Prioritize India Hubs (100) -> Remote India (95) -> Global Remote (85) -> General Remote (75)
            // Within same tier, prioritize Indian Unicorns / MNCs and candidate match score
            finalJobs.sort((a, b) => {
                const aLocTier = getLocationPriority(a.location, a.title, a.description);
                const bLocTier = getLocationPriority(b.location, b.title, b.description);

                if (aLocTier !== bLocTier) {
                    return bLocTier - aLocTier;
                }

                const aScore = a.matchScore ?? 0;
                const bScore = b.matchScore ?? 0;
                if (bScore !== aScore) {
                    return bScore - aScore;
                }

                // Prioritize Indian MNCs / Semi-MNCs and top tech organizations
                const topOrgs = /razorpay|groww|meesho|zeta|paytm|cred|inmobi|thoughtworks|postman|freshworks|swiggy|zomato|figma|stripe|discord|github/i;
                const aTop = topOrgs.test(a.company) ? 1 : 0;
                const bTop = topOrgs.test(b.company) ? 1 : 0;
                return bTop - aTop;
            });

            return res.status(200).json({
                success: true,
                count: finalJobs.length,
                data: finalJobs,
            });
        } catch (error) {
            return res.status(502).json({
                success: false,
                count: 0,
                message: "Live job sources are unavailable.",
            });
        }
    }

    async discover(req: Request, res: Response) {
        const keyword = typeof req.query.keyword === "string" ? req.query.keyword.trim() : "";
        const location = typeof req.query.location === "string" ? req.query.location : undefined;
        const remote = req.query.remote === "true";
        if (!keyword) return res.status(400).json({ success: false, message: "A search keyword is required." });

        const jobs = await sourceRegistry.getService().search({ keyword, location, remote });

        return res.status(200).json({
            success: true,
            data: jobs,
            meta: {
                location,
                sources: sourceRegistry.getService().getSources(),
                fetchedAt: new Date().toISOString(),
            },
        });
    }

    async ingest(req: Request, res: Response) {
        const { url: inputUrl } = crawlSchema.parse({ url: req.body?.url });
        const url = new URL(inputUrl!);
        if (url.protocol !== "https:") return res.status(400).json({ success: false, message: "Only HTTPS job URLs can be ingested." });
        const [job] = await crawlerService.crawl({ url: url.toString() });
        if (!job?.title?.trim() || !job.company?.trim() || !job.location?.trim() || !job.url) {
            return res.status(422).json({ success: false, message: "The source did not provide the required job title, company, location, and URL." });
        }
        const atsProvider = job.platform === "GREENHOUSE" ? "Greenhouse" : job.platform === "LEVER" ? "Lever" : job.platform === "ASHBY" ? "Ashby" : job.platform === "WORKDAY" ? "Workday" : undefined;
        const result = await prisma.$transaction(async (tx) => {
            const company = await tx.company.upsert({
                where: { userId_name: { userId: req.user.id, name: job.company } },
                update: {},
                create: {
                    userId: req.user.id,
                    name: job.company,
                    website: `${url.protocol}//${url.host}`,
                    domain: url.hostname,
                    verifiedAts: atsProvider,
                },
            });
            const existing = await tx.job.findFirst({ where: { userId: req.user.id, url: job.url }, include: { company: true } });
            if (existing) return { job: existing, created: false };
            const saved = await tx.job.create({
                data: {
                    userId: req.user.id,
                    companyId: company.id,
                    title: job.title,
                    location: job.location,
                    url: job.url,
                    description: job.description || null,
                    atsProvider,
                },
                include: { company: true },
            });
            return { job: saved, created: true };
        });
        return res.status(result.created ? 201 : 200).json({ success: true, data: result.job, created: result.created });
    }

    async create(
        req: Request,
        res: Response,
    ) {
        const data = createJobSchema.parse(req.body);

        const job = await jobService.createJob(
            req.user.id,
            data,
        );

        return res.status(201).json({
            success: true,
            data: job,
        });
    }

    async getAll(
        req: Request,
        res: Response,
    ) {
        const jobs = await jobService.getJobs(req.user.id);

        return res.status(200).json({
            success: true,
            data: jobs,
        });
    }

    async getOne(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const job = await jobService.getJob(id);

        if (!job || job.userId !== req.user.id) {
            return res.status(404).json({
                message: "Job not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: job,
        });
    }

    async update(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const existing = await jobService.getJob(id);
        if (!existing || existing.userId !== req.user.id) {
            return res.status(404).json({
                message: "Job not found.",
            });
        }

        const body = updateJobSchema.parse(req.body);

        const job = await jobService.updateJob(
            id,
            body,
        );

        return res.status(200).json({
            success: true,
            data: job,
        });
    }

    async delete(
        req: Request,
        res: Response,
    ) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const existing = await jobService.getJob(id);
        if (!existing || existing.userId !== req.user.id) {
            return res.status(404).json({
                message: "Job not found.",
            });
        }

        await jobService.deleteJob(id);

        return res.sendStatus(204);
    }
}

export default new JobController();
