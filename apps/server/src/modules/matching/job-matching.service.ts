import { prisma } from "@jobpilot/database";
import evaluationService from "../agent/evaluation/evaluation.service.js";
import candidateService from "../agent/candidate/candidate.service.js";
import resumeService from "../resume/resume.service.js";
import logger from "../../core/logger/logger.js";
import type { CandidateContext } from "../agent/candidate/candidate.types.js";
import type {
  JobScorecard,
  RankedJobMatch,
  LoopCriteriaInput,
} from "../agent/evaluation/evaluation.types.js";

export class JobMatchingService {
  /**
   * Build complete real candidate context from PostgreSQL profile and resume.
   * Grounded in user's actual database records with no hallucination.
   */
  async getRealCandidateContext(userId: string, resumeId?: string | null): Promise<CandidateContext> {
    try {
      const context = await candidateService.buildContext(userId, resumeId || undefined);

      // If resumeId is supplied, ensure the resume's parsed skills & extracted text are included
      if (resumeId) {
        try {
          const resume = await resumeService.getResume(resumeId);
          if (resume?.extractedText) {
            context.resumeText = resume.extractedText;
            const parsed = (await import("../resume/resume.parser.js")).default.parse(resume.extractedText);
            const currentSkills = Array.isArray(context.skills)
              ? context.skills.map((s: any) => typeof s === "string" ? s : s?.name || "").filter(Boolean)
              : [];

            const combined = Array.from(new Set([...currentSkills, ...parsed.skills]));
            context.skills = combined.map((name) => ({ name }));
          }
        } catch (resErr) {
          logger.debug({ resErr }, "JobMatchingService: could not load specific resume");
        }
      }

      return context;
    } catch (err) {
      logger.warn("JobMatchingService: failed to build complete candidate context, using empty fallback context", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });

      return {
        skills: [],
        experiences: [],
        educations: [],
      };
    }
  }

  /**
   * Match a single job against candidate context and loop criteria.
   */
  matchJob(
    candidateContext: CandidateContext,
    job: {
      id?: string;
      title: string;
      company: string;
      description?: string | null;
      location: string;
      workMode?: string | null;
      url?: string;
      createdAt?: Date;
    },
    loopCriteria?: LoopCriteriaInput,
  ): JobScorecard {
    return evaluationService.evaluateCandidateForJob(candidateContext, job, loopCriteria);
  }

  /**
   * Match and rank a list of in-memory or persisted jobs.
   */
  matchAndRankJobs<T extends {
    id?: string;
    title: string;
    company: string;
    description?: string | null;
    location: string;
    workMode?: string | null;
    url?: string;
    createdAt?: Date;
  }>(
    candidateContext: CandidateContext,
    jobs: T[],
    loopCriteria?: LoopCriteriaInput,
  ): RankedJobMatch<T>[] {
    return evaluationService.matchAndRankJobs(candidateContext, jobs, loopCriteria);
  }

  /**
   * Match, rank, and persist results for a specific Job Search Loop.
   * - Pulls the loop's configured criteria.
   * - Loads candidate's real profile/resume.
   * - Evaluates all persisted jobs tagged for this loop.
   * - Persists real match scores and scorecards in the database.
   * - Does NOT trigger Auto-Apply.
   */
  async matchAndRankLoopJobs(
    loopId: string,
    userId: string,
    options: { persistApplications?: boolean } = {},
  ): Promise<RankedJobMatch[]> {
    const loop = await prisma.jobSearchLoop.findFirst({
      where: { id: loopId, userId },
      include: { resume: true },
    });

    if (!loop) {
      throw new Error(`Job search loop "${loopId}" not found for user "${userId}".`);
    }

    // 1. Gather real candidate context
    const candidateContext = await this.getRealCandidateContext(userId, loop.resumeId);

    // 2. Fetch jobs discovered by this loop (tagged with loop name or created by this user)
    const jobs = await prisma.job.findMany({
      where: {
        userId,
        tags: { has: loop.name },
      },
      include: {
        company: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (jobs.length === 0) {
      return [];
    }

    // 3. Prepare criteria
    const loopCriteria: LoopCriteriaInput = {
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

    // 4. Match & Rank jobs
    const rankedMatches = this.matchAndRankJobs(
      candidateContext,
      jobs.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company?.name || "Company",
        description: j.description,
        location: j.location,
        workMode: j.workMode,
        url: j.url,
        createdAt: j.createdAt,
      })),
      loopCriteria,
    );

    // 5. Persist results
    for (const match of rankedMatches) {
      const dbJob = jobs.find((j) => j.id === match.job.id);
      if (!dbJob) continue;

      const scorecardJson = JSON.stringify(match.scorecard);

      // Always persist scorecard in Job.notes
      await prisma.job.update({
        where: { id: dbJob.id },
        data: {
          notes: scorecardJson,
          tags: Array.from(new Set([
            ...dbJob.tags,
            `score:${match.scorecard.matchScore}`,
            `tier:${match.scorecard.companyTier}`,
            `rank:${match.rank}`,
          ])),
        },
      }).catch((err) => {
        logger.debug({ err }, "JobMatchingService: error updating Job notes");
      });

      // If application persistence is requested, create/update Application with status MATCHED
      if (options.persistApplications) {
        try {
          const profile = await prisma.profile.findUnique({
            where: { userId },
            select: { id: true },
          });

          const existingApp = await prisma.application.findUnique({
            where: {
              userId_jobId: {
                userId,
                jobId: dbJob.id,
              },
            },
          });

          if (!existingApp) {
            // Need a valid resumeId
            let effectiveResumeId: string | null = loop.resumeId ?? null;
            if (!effectiveResumeId) {
              const defaultResume = await prisma.resume.findFirst({
                where: { userId },
                orderBy: { updatedAt: "desc" },
              });
              effectiveResumeId = defaultResume?.id ?? null;
            }

            if (effectiveResumeId) {
              await prisma.application.create({
                data: {
                  userId,
                  jobId: dbJob.id,
                  resumeId: effectiveResumeId,
                  profileId: profile?.id || null,
                  status: "MATCHED",
                  matchScore: match.scorecard.matchScore,
                  scorecard: match.scorecard as any,
                  companyKey: dbJob.company?.name?.toLowerCase() || null,
                },
              });
            }
          } else {
            await prisma.application.update({
              where: { id: existingApp.id },
              data: {
                matchScore: match.scorecard.matchScore,
                scorecard: match.scorecard as any,
                ...(existingApp.status === "DISCOVERED" || existingApp.status === "SAVED"
                  ? { status: "MATCHED" }
                  : {}),
              },
            });
          }
        } catch (appErr) {
          logger.debug({ appErr }, "JobMatchingService: error persisting Application record");
        }
      }
    }

    logger.info("JobMatchingService: loop matching & ranking completed", {
      loopId,
      userId,
      matchedJobCount: rankedMatches.length,
      topScore: rankedMatches[0]?.matchScore || 0,
      priorityStrategy: loop.priorityStrategy,
    });

    return rankedMatches;
  }
}

export const jobMatchingService = new JobMatchingService();
export default jobMatchingService;
