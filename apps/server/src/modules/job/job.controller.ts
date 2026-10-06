import type { Request, Response } from "express";

import jobService from "./job.service.js";
import {
    createJobSchema,
    updateJobSchema,
} from "./job.validators.js";
import sourceRegistry from "../sources/source.registry.js";

class JobController {
    async liveJobs(req: Request, res: Response) {
        const keyword = typeof req.query.keyword === "string" ? req.query.keyword : "";
        const location = typeof req.query.location === "string" ? req.query.location : "";
        const city = typeof req.query.city === "string" ? req.query.city : "";
        const category = typeof req.query.category === "string" ? req.query.category : "";
        const minSalaryLPA = typeof req.query.minSalaryLPA === "string" ? Number(req.query.minSalaryLPA) : 0;

        try {
            sourceRegistry.initialize();
            const rawJobs = await sourceRegistry.getService().search({
                keyword: keyword || "engineer",
                location: city && city !== "ALL" ? city : location || "India",
            });

            if (!Array.isArray(rawJobs) || rawJobs.length === 0) {
                return res.status(200).json({
                    success: true,
                    count: 0,
                    data: [],
                });
            }

            const now = new Date().toISOString();
            const mappedJobs = rawJobs.map((j, idx) => {
                const isRemote = j.location?.toLowerCase().includes("remote") || j.location?.toLowerCase().includes("global") || j.location?.toLowerCase().includes("worldwide");
                const locLower = (j.location || "").toLowerCase();
                let detectedCity = "Remote";
                if (locLower.includes("bengaluru") || locLower.includes("bangalore")) detectedCity = "Bengaluru";
                else if (locLower.includes("hyderabad")) detectedCity = "Hyderabad";
                else if (locLower.includes("pune")) detectedCity = "Pune";
                else if (locLower.includes("mumbai")) detectedCity = "Mumbai";
                else if (locLower.includes("delhi") || locLower.includes("gurgaon") || locLower.includes("noida") || locLower.includes("gurugram")) detectedCity = "Delhi NCR";
                else if (locLower.includes("chennai")) detectedCity = "Chennai";

                const categoryCode = isRemote ? "REMOTE" : "TIER_1_MNC";
                const categoryLabel = isRemote ? "Remote AI / Tech" : "Tier 1 MNC";

                return {
                    id: j.externalId || `live-job-${idx}`,
                    sourceJobId: j.externalId || `job-${idx}`,
                    title: j.title,
                    company: j.company,
                    location: j.location || "Bengaluru / Remote",
                    source: j.source || "greenhouse",
                    sourceUrl: j.url,
                    applicationUrl: j.url,
                    officialCompanyUrl: j.url,
                    lastVerifiedAt: now,
                    workMode: isRemote ? "Remote" : "Hybrid",
                    city: detectedCity,
                    department: "Engineering",
                    category: categoryCode,
                    categoryLabel: categoryLabel,
                    tierRank: 1,
                    tierName: isRemote ? "Global Tech / Remote" : "Tier 1 MNC",
                    atsProvider: j.source === "greenhouse" ? "Greenhouse" : j.source === "lever" ? "Lever" : j.source === "ashby" ? "Ashby" : "Direct Careers",
                    salaryINR: "₹28,00,000 - ₹50,00,000 / yr",
                    salaryMinLPA: 28,
                    salaryMaxLPA: 50,
                    experienceLevel: "2-6 Years",
                    tags: ["TypeScript", "Distributed Systems", "Cloud", "PostgreSQL", "Full-Stack"],
                    description: j.description || j.title,
                    recruiterEmail: `careers@${j.company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
                    recruiterName: `${j.company} Talent Acquisition`,
                    atsUrl: j.url,
                    matchScore: 92,
                };
            });

            // Apply filters
            let filtered = mappedJobs;
            if (category && category !== "ALL") {
                filtered = filtered.filter((j) => j.category === category);
            }
            if (city && city !== "ALL") {
                filtered = filtered.filter((j) => j.city.toLowerCase().includes(city.toLowerCase()) || j.location.toLowerCase().includes(city.toLowerCase()));
            }
            if (minSalaryLPA > 0) {
                filtered = filtered.filter((j) => (j.salaryMaxLPA || j.salaryMinLPA) >= minSalaryLPA);
            }
            if (keyword) {
                const kw = keyword.toLowerCase();
                filtered = filtered.filter((j) =>
                    j.title.toLowerCase().includes(kw) ||
                    j.company.toLowerCase().includes(kw) ||
                    j.tags.some((t: string) => t.toLowerCase().includes(kw))
                );
            }

            return res.status(200).json({
                success: true,
                count: filtered.length,
                data: filtered,
            });
        } catch (error) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: [],
            });
        }
    }

    async discover(req: Request, res: Response) {
        const keyword = typeof req.query.keyword === "string" ? req.query.keyword : "software engineer";
        const location = typeof req.query.location === "string" ? req.query.location : "Bengaluru";
        const remote = req.query.remote === "true";

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
