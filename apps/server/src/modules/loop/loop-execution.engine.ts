import { prisma } from "@jobpilot/database";
import liveAtsService from "../sources/live-ats.service.js";
import type { SourceJob } from "../sources/source.types.js";
import jobMatchingService from "../matching/job-matching.service.js";
import logger from "../../core/logger/logger.js";

export interface LoopExecutionResult {
  loopId: string;
  loopName: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  discoveredCount: number;
  newlyPersistedCount: number;
  error?: string;
  executedAt: Date;
}

export interface RunLoopResponse {
  success: boolean;
  loop: any;
  discoveredCount: number;
  newlyPersistedCount: number;
  dispatchedCount: number;
  jobs: Array<SourceJob & {
    matchScore?: number;
    matchedSkills?: string[];
    missingSkills?: string[];
    companyTier?: string;
    rank?: number;
  }>;
  message?: string;
}

export class LoopExecutionEngine {
  private timer: NodeJS.Timeout | null = null;
  private isProcessingDueLoops = false;
  private checkIntervalMs = 60 * 1000; // default 60 seconds
  private lastSchedulerRunAt: Date | null = null;

  /**
   * Execute live discovery for an individual Job Search Loop.
   * - Queries live ATS sources using saved loop filters.
   * - Deduplicates jobs and persists new real jobs in PostgreSQL.
   * - Updates lastRunAt, nextRunAt, discoveredCount.
   * - Sets status to ERROR if a fatal failure occurs.
   * - Does NOT trigger Auto-Apply or Recruiter Outreach.
   */
  async executeLoop(loopId: string, userId?: string): Promise<RunLoopResponse> {
    const loop = await prisma.jobSearchLoop.findFirst({
      where: userId ? { id: loopId, userId } : { id: loopId },
      include: { resume: true },
    });

    if (!loop) {
      throw new Error(`Job search loop "${loopId}" not found.`);
    }

    try {
      // 1. Gather search keywords from targetJobTitles
      const targetTitles = loop.targetJobTitles && loop.targetJobTitles.length > 0
        ? loop.targetJobTitles
        : ["Software Engineer"];

      // 2. Gather locations from targetLocations or targetCountries
      const targetLocations = loop.targetLocations && loop.targetLocations.length > 0
        ? loop.targetLocations
        : (loop.targetCountries && loop.targetCountries.length > 0 ? loop.targetCountries : ["India"]);

      // 3. Determine remote constraint
      const remote = loop.remotePreference === "REMOTE_ONLY"
        ? true
        : loop.remotePreference === "ONSITE"
          ? false
          : undefined;

      // 4. Query live ATS sources (reusing existing LiveAtsService)
      const discoveredJobsMap = new Map<string, SourceJob>();

      for (const title of targetTitles) {
        for (const loc of targetLocations) {
          try {
            const results = await liveAtsService.searchAll({
              keyword: title,
              location: loc,
              remote,
            });

            for (const j of results) {
              const dedupeKey = (j.url || j.externalId || "").trim();
              if (dedupeKey && !discoveredJobsMap.has(dedupeKey)) {
                discoveredJobsMap.set(dedupeKey, j);
              }
            }
          } catch (searchErr) {
            logger.warn("LoopExecutionEngine: live ATS search error for title/location", {
              loopId: loop.id,
              title,
              location: loc,
              error: searchErr instanceof Error ? searchErr.message : String(searchErr),
            });
          }
        }
      }

      // 5. Filter out excluded companies and apply included companies
      const excluded = (loop.excludedCompanies || []).map((c) => c.toLowerCase().trim()).filter(Boolean);
      const included = (loop.includedCompanies || []).map((c) => c.toLowerCase().trim()).filter(Boolean);

      const candidateJobs = Array.from(discoveredJobsMap.values()).filter((j) => {
        const comp = (j.company || "").toLowerCase().trim();
        if (excluded.some((ex) => comp.includes(ex))) {
          return false;
        }
        if (included.length > 0 && !included.some((inc) => comp.includes(inc))) {
          return false;
        }
        return true;
      });

      // 6. Connect newly discovered real jobs to candidate's actual profile/resume
      const candidateContext = await jobMatchingService.getRealCandidateContext(loop.userId, loop.resumeId);

      const loopCriteria = {
        targetJobTitles: loop.targetJobTitles,
        targetLocations: loop.targetLocations,
        targetCountries: loop.targetCountries,
        remotePreference: loop.remotePreference,
        experienceLevel: loop.experienceLevel,
        employmentTypes: loop.employmentTypes,
        minimumCompensation: loop.minimumCompensation,
        maximumCompensation: loop.maximumCompensation,
        targetTiers: loop.targetTiers,
        priorityStrategy: loop.priorityStrategy,
      };

      // Match and rank candidate jobs against candidate profile and loop criteria
      const rankedCandidateJobs = jobMatchingService.matchAndRankJobs(
        candidateContext,
        candidateJobs.map((j) => ({
          externalId: j.externalId,
          source: j.source,
          title: j.title,
          company: j.company,
          description: j.description,
          location: j.location || "Remote",
          url: j.url,
        })),
        loopCriteria,
      );

      // Deduplicate against PostgreSQL database and persist real jobs
      const discoveryLimit = loop.dailyDiscoveryLimit || 50;
      let newlyPersistedCount = 0;

      for (const rankedItem of rankedCandidateJobs) {
        if (newlyPersistedCount >= discoveryLimit) {
          break;
        }

        const job = rankedItem.job;
        const scorecard = rankedItem.scorecard;

        if (!job.url || !job.title || !job.company) {
          continue;
        }

        // Deduplication check: Has this job already been saved for this user?
        const existingJob = await prisma.job.findFirst({
          where: {
            userId: loop.userId,
            url: job.url,
          },
        });

        if (existingJob) {
          continue; // Already persisted; skip to avoid duplicates
        }

        // Find or create the real Company record
        const companyName = job.company.trim();
        const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        
        let company = await prisma.company.findUnique({
          where: {
            userId_name: {
              userId: loop.userId,
              name: companyName,
            },
          },
        });

        if (!company) {
          company = await prisma.company.create({
            data: {
              name: companyName,
              domain: `${companySlug || "company"}.com`,
              location: job.location || "Remote",
              verifiedAts: job.source,
              tier: scorecard.companyTier,
              userId: loop.userId,
            },
          });
        }

        // Persist the real Job record with real match score and scorecard
        const isRemoteJob = (job.location || "").toLowerCase().includes("remote") ||
          (job.location || "").toLowerCase().includes("wfh");

        await prisma.job.create({
          data: {
            title: job.title,
            location: job.location || "Remote",
            url: job.url,
            atsProvider: job.source,
            description: job.description || null,
            workMode: isRemoteJob ? "REMOTE" : "HYBRID",
            status: "SAVED",
            tags: [
              loop.name,
              `score:${scorecard.matchScore}`,
              `tier:${scorecard.companyTier}`,
              `rank:${rankedItem.rank}`,
            ],
            notes: JSON.stringify(scorecard),
            companyId: company.id,
            userId: loop.userId,
          },
        });

        newlyPersistedCount++;
      }

      // 7. Calculate next run schedule (e.g., 24 hours later)
      const now = new Date();
      const nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // 8. Update loop status, timestamps, and discovery count
      const updatedLoop = await prisma.jobSearchLoop.update({
        where: { id: loop.id },
        data: {
          lastRunAt: now,
          nextRunAt,
          status: "ACTIVE",
          discoveredCount: { increment: newlyPersistedCount },
        },
        include: {
          resume: true,
        },
      });

      logger.info("LoopExecutionEngine: loop execution completed", {
        loopId: loop.id,
        discoveredTotal: candidateJobs.length,
        newlyPersistedCount,
        nextRunAt,
      });

      return {
        success: true,
        loop: updatedLoop,
        discoveredCount: candidateJobs.length,
        newlyPersistedCount,
        dispatchedCount: 0, // Auto-apply is explicitly not triggered in this phase
        jobs: rankedCandidateJobs.slice(0, 20).map((r) => ({
          externalId: r.job.externalId || "",
          title: r.job.title,
          company: r.job.company,
          url: r.job.url || "",
          location: r.job.location || "Remote",
          description: r.job.description || "",
          source: r.job.source || "ats",
          matchScore: r.scorecard.matchScore,
          matchedSkills: r.scorecard.matchedSkills,
          missingSkills: r.scorecard.missingSkills,
          companyTier: r.scorecard.companyTier,
          rank: r.rank,
        })),
        message: `Discovered and ranked ${candidateJobs.length} live openings (${newlyPersistedCount} new jobs saved).`,
      };
    } catch (err: any) {
      // Safe error handling: log error and update loop status to ERROR
      logger.error("LoopExecutionEngine: fatal error executing loop", {
        loopId: loop.id,
        userId: loop.userId,
        error: err?.message || String(err),
      });

      try {
        await prisma.jobSearchLoop.update({
          where: { id: loop.id },
          data: {
            status: "ERROR",
            lastRunAt: new Date(),
          },
        });
      } catch (dbErr) {
        logger.error("LoopExecutionEngine: failed to update loop to ERROR state", {
          loopId: loop.id,
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        });
      }

      throw err;
    }
  }

  /**
   * Find and execute all active loops that are due according to their nextRunAt schedule.
   */
  async executeDueLoops(): Promise<LoopExecutionResult[]> {
    const now = new Date();
    this.lastSchedulerRunAt = now;

    let dueLoops: Array<{ id: string; name: string; userId: string }> = [];
    try {
      dueLoops = await prisma.jobSearchLoop.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { nextRunAt: null },
            { nextRunAt: { lte: now } },
          ],
        },
        select: {
          id: true,
          name: true,
          userId: true,
        },
      });
    } catch (dbErr: any) {
      logger.warn("LoopExecutionEngine: unable to query due loops (database offline or unreachable)", {
        error: dbErr?.message || String(dbErr),
      });
      return [];
    }

    if (!dueLoops || dueLoops.length === 0) {
      return [];
    }

    logger.info("LoopExecutionEngine: executing due loops", { count: dueLoops.length });

    const results: LoopExecutionResult[] = [];

    for (const loop of dueLoops) {
      try {
        const res = await this.executeLoop(loop.id, loop.userId);
        results.push({
          loopId: loop.id,
          loopName: loop.name,
          status: "SUCCESS",
          discoveredCount: res.discoveredCount,
          newlyPersistedCount: res.newlyPersistedCount,
          executedAt: new Date(),
        });
      } catch (err: any) {
        results.push({
          loopId: loop.id,
          loopName: loop.name,
          status: "FAILED",
          discoveredCount: 0,
          newlyPersistedCount: 0,
          error: err?.message || String(err),
          executedAt: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Start recurring background scheduler that checks for and runs due active loops.
   */
  startScheduler(intervalMs = 60 * 1000): void {
    if (this.timer) {
      return;
    }

    this.checkIntervalMs = intervalMs;
    this.timer = setInterval(async () => {
      if (this.isProcessingDueLoops) {
        return;
      }

      this.isProcessingDueLoops = true;
      try {
        await this.executeDueLoops();
      } catch (err: any) {
        logger.error("LoopExecutionEngine: periodic scheduler execution error", {
          error: err?.message || String(err),
        });
      } finally {
        this.isProcessingDueLoops = false;
      }
    }, this.checkIntervalMs);

    // unref allows the node event loop to terminate gracefully during tests or shutdown
    if (this.timer.unref) {
      this.timer.unref();
    }

    logger.info("LoopExecutionEngine scheduler initialized", {
      checkIntervalMs: this.checkIntervalMs,
    });
  }

  /**
   * Stop recurring background scheduler.
   */
  stopScheduler(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info("LoopExecutionEngine scheduler stopped");
    }
  }

  getStatus(): {
    schedulerRunning: boolean;
    checkIntervalMs: number;
    isProcessing: boolean;
    lastSchedulerRunAt: Date | null;
  } {
    return {
      schedulerRunning: this.timer !== null,
      checkIntervalMs: this.checkIntervalMs,
      isProcessing: this.isProcessingDueLoops,
      lastSchedulerRunAt: this.lastSchedulerRunAt,
    };
  }
}

const loopExecutionEngine = new LoopExecutionEngine();
export default loopExecutionEngine;
