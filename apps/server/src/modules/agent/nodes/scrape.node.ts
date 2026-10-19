import crypto from "node:crypto";
import webScraperSource, { isCanonicalJobUrl } from "../../sources/web-scraper.source.js";
import candidateTool from "../candidate/candidate.tool.js";
import applicationRepository from "../../application/application.repository.js";
import logger from "../../../core/logger/logger.js";
import type { AgentStateType, AgentStateUpdate } from "../graph/state.js";
import type { AgentJob } from "../agent.types.js";

/**
 * LangGraph Web Scraping Node
 * 
 * Specifically dedicated to web scraping job openings across:
 * - Top tech MNC career portals (Uber, Stripe, Atlassian, Netflix, Google, Amazon, Microsoft, etc.)
 * - Known tech company career feeds & public open web job boards
 * - Eliminates sole dependency on ATS APIs (Greenhouse/Ashby/Lever) by functioning as a primary web scraping engine.
 */
export class ScrapeNode {
    async execute(state: AgentStateType): Promise<AgentStateUpdate> {
        logger.info({ userId: state.userId, query: state.query }, "ScrapeNode: initiating web scraping for live tech openings");

        const queries: string[] = state.query?.trim() ? [state.query.trim()] : [];
        let remoteOnly = false;
        const candidateSkills: string[] = [];

        // 1. Analyze candidate profile context (skills, title, remote preferences)
        try {
            const context = await candidateTool.getContext(
                state.userId,
                state.resumeId || state.resume?.id,
            );

            if (context.remoteOnly) {
                remoteOnly = true;
            }

            if (Array.isArray(context.skills)) {
                const skillNames = context.skills
                    .map((s: any) => (typeof s === "string" ? s : s?.name || ""))
                    .filter(Boolean);
                candidateSkills.push(...skillNames);
            }

            // Extract keywords from resume text if available
            if (context.resumeText) {
                const resumeParser = (await import("../../resume/resume.parser.js")).default;
                const keywords = resumeParser.extractKeywords(context.resumeText);
                for (const kw of keywords) {
                    if (!candidateSkills.includes(kw)) {
                        candidateSkills.push(kw);
                    }
                }
            }

            // If query is empty, use candidate's current title or top skills
            if (queries.length === 0) {
                if (context.currentTitle) {
                    queries.push(context.currentTitle);
                } else if (candidateSkills.length > 0) {
                    queries.push(`${candidateSkills[0]} engineer`);
                } else {
                    queries.push("software engineer");
                }
            }

            // Formulate targeted queries from top resume skills
            const topSkills = candidateSkills.slice(0, 3);
            for (const skill of topSkills) {
                const combined = state.query ? `${skill} ${state.query}`.trim() : `${skill} developer`;
                if (!queries.includes(combined) && queries.length < 3) {
                    queries.push(combined);
                }
            }
        } catch (err) {
            logger.debug({ err }, "ScrapeNode: candidate context extraction fallback");
            if (queries.length === 0) {
                queries.push("software engineer");
            }
        }

        // 2. Perform live web scraping across targeted queries
        const scrapeResults = await Promise.allSettled(
            queries.map((q) =>
                webScraperSource.search({
                    keyword: q,
                    remote: remoteOnly ? true : undefined,
                }),
            ),
        );

        const seenUrls = new Set<string>();
        // Preserve existing jobs from state if already present
        for (const existing of state.jobs || []) {
            if (existing.url) seenUrls.add(existing.url.toLowerCase().replace(/\/$/, ""));
        }

        const scrapedJobs: AgentJob[] = [];

        for (const res of scrapeResults) {
            if (res.status !== "fulfilled" || !Array.isArray(res.value)) continue;

            for (const rawJob of res.value) {
                if (!rawJob.url || !rawJob.title || !rawJob.company) continue;
                if (!isCanonicalJobUrl(rawJob.url)) continue;

                const normalizedUrl = rawJob.url.toLowerCase().replace(/\/$/, "");
                if (seenUrls.has(normalizedUrl)) continue;
                seenUrls.add(normalizedUrl);

                const id = crypto
                    .createHash("sha256")
                    .update(rawJob.url)
                    .digest("hex")
                    .slice(0, 12);

                scrapedJobs.push({
                    id,
                    title: rawJob.title.trim(),
                    company: rawJob.company.trim(),
                    url: rawJob.url,
                    description: rawJob.description || "",
                    location: rawJob.location || (remoteOnly ? "Remote" : "Global"),
                    source: "web_scraper",
                    platform: "web",
                });
            }
        }

        // 3. Filter out jobs where user already has a SUBMITTED or APPLIED application
        const filtered = await Promise.all(
            scrapedJobs.map(async (job) => {
                const existing = await applicationRepository.findByUserAndJob(state.userId, job.id);
                return existing && (existing.status === "SUBMITTED" || existing.status === "APPLIED") ? null : job;
            }),
        );

        const validScrapedJobs = filtered.filter((j): j is NonNullable<typeof j> => j !== null);
        const mergedJobs = [...(state.jobs || []), ...validScrapedJobs];

        const companiesList = Array.from(new Set(validScrapedJobs.map((j) => j.company))).slice(0, 6).join(", ");
        const historyMsg = validScrapedJobs.length > 0
            ? `Web Scraping Node: scraped ${validScrapedJobs.length} live openings across company career portals & MNCs (${companiesList}) for query: ${queries.join(" | ")}.`
            : `Web Scraping Node: web scraping completed (${mergedJobs.length} total openings in pipeline).`;

        logger.info(
            { newlyScraped: validScrapedJobs.length, totalJobs: mergedJobs.length },
            "ScrapeNode: web scraping execution complete",
        );

        return {
            jobs: mergedJobs,
            selectedJobs: state.selectedJobs.length > 0 ? state.selectedJobs : [],
            evaluated: false,
            scrapingCompleted: true,
            history: [...state.history, historyMsg],
        };
    }
}

export const scrapeNode = new ScrapeNode();
export default scrapeNode;
