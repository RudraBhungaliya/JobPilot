import { prisma } from "@jobpilot/database";
import ApplicationStateMachine from "./application-state-machine.js";
import applicationQueueService from "../queue/application-queue.service.js";
import jobMatchingService from "../matching/job-matching.service.js";
import eventEmitter from "../../core/events/event.emitter.js";
import logger from "../../core/logger/logger.js";
import type { JobScorecard, LoopCriteriaInput } from "../agent/evaluation/evaluation.types.js";

export interface SyncJobInput {
  userId: string;
  jobId: string;
  loopId?: string;
  resumeId?: string | null;
  autoApply?: boolean;
  priority?: number;
}

export interface SyncJobResult {
  applicationId: string;
  jobId: string;
  status: string;
  created: boolean;
  queued: boolean;
  queueId?: string;
  matchScore: number;
}

export interface SyncLoopResponse {
  success: boolean;
  loopId: string;
  loopName: string;
  totalEligibleJobs: number;
  newlyCreatedCount: number;
  newlyQueuedCount: number;
  savedCount: number;
  dailyLimit: number;
  appliedToday: number;
  remainingDailyQuota: number;
  autoApplyEnabled: boolean;
  applications: SyncJobResult[];
  message: string;
}

export class PipelineSyncService {
  /**
   * Sync a single discovered or matched job into the Application + Queue pipeline.
   * Guarantees consistent state transitions: DISCOVERED -> SAVED -> QUEUED.
   * Prevents duplicates idempotently.
   */
  async syncJobToApplication(input: SyncJobInput): Promise<SyncJobResult> {
    const { userId, jobId } = input;

    // 1. Fetch real Job record
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { company: true },
    });

    if (!job) {
      throw new Error(`Job "${jobId}" not found.`);
    }

    // 2. Check for existing Application record to prevent duplicates
    const existingApp = await prisma.application.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
    });

    if (existingApp) {
      // If already queued, running, or applied: do not duplicate
      if (
        existingApp.status === "QUEUED" ||
        existingApp.status === "RUNNING" ||
        existingApp.status === "SUBMITTING" ||
        existingApp.status === "SUBMITTED" ||
        existingApp.status === "APPLIED"
      ) {
        return {
          applicationId: existingApp.id,
          jobId,
          status: existingApp.status,
          created: false,
          queued: false,
          matchScore: existingApp.matchScore ?? 75,
        };
      }

      if (input.autoApply) {
        if (existingApp.status === "DISCOVERED" || existingApp.status === "MATCHED") {
          await ApplicationStateMachine.transition({
            applicationId: existingApp.id,
            newStatus: "SAVED",
            reason: "Job bookmarked in application pipeline",
            actor: "SYSTEM",
          });
        }

        const queueRecord = await applicationQueueService.enqueue({
          applicationId: existingApp.id,
          userId,
          priority: input.priority ?? 0,
        });

        return {
          applicationId: existingApp.id,
          jobId,
          status: "QUEUED",
          created: false,
          queued: true,
          queueId: queueRecord?.id,
          matchScore: existingApp.matchScore ?? 75,
        };
      }

      // If autoApply is false and existingApp is in DISCOVERED or MATCHED, transition to SAVED
      if (existingApp.status === "DISCOVERED" || existingApp.status === "MATCHED") {
        await ApplicationStateMachine.transition({
          applicationId: existingApp.id,
          newStatus: "SAVED",
          reason: "Job bookmarked and saved in application pipeline",
          actor: "SYSTEM",
        });

        return {
          applicationId: existingApp.id,
          jobId,
          status: "SAVED",
          created: false,
          queued: false,
          matchScore: existingApp.matchScore ?? 75,
        };
      }

      return {
        applicationId: existingApp.id,
        jobId,
        status: existingApp.status,
        created: false,
        queued: false,
        matchScore: existingApp.matchScore ?? 75,
      };
    }

    // 3. Resolve user profile and valid resume
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    let effectiveResumeId = input.resumeId;
    if (!effectiveResumeId) {
      const defaultResume = await prisma.resume.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      effectiveResumeId = defaultResume?.id;
    }

    if (!effectiveResumeId) {
      throw new Error(`User "${userId}" does not have a resume uploaded to associate with application.`);
    }

    // 4. Extract or evaluate match score & scorecard
    let matchScore = 75;
    let scorecard: any = {};

    if (job.notes) {
      try {
        const parsed = JSON.parse(job.notes);
        if (typeof parsed.matchScore === "number") {
          matchScore = parsed.matchScore;
          scorecard = parsed;
        }
      } catch {
        // Fallback
      }
    }

    if (matchScore === 75 && (!job.notes || Object.keys(scorecard).length === 0)) {
      try {
        const context = await jobMatchingService.getRealCandidateContext(userId, effectiveResumeId);
        const evaluated = jobMatchingService.matchJob(context, {
          title: job.title,
          company: job.company.name,
          description: job.description,
          location: job.location,
          workMode: job.workMode,
          url: job.url,
        });
        matchScore = evaluated.matchScore;
        scorecard = evaluated;
      } catch {
        // Safe default
      }
    }

    // 5. STEP 1: Create real Application record in DISCOVERED status
    const newApplication = await prisma.application.create({
      data: {
        userId,
        jobId,
        resumeId: effectiveResumeId,
        profileId: profile?.id || null,
        status: "DISCOVERED",
        matchScore,
        scorecard,
        companyKey: job.company?.name ? job.company.name.toLowerCase() : null,
      },
    });

    // 6. STEP 2: Transition DISCOVERED -> SAVED
    await ApplicationStateMachine.transition({
      applicationId: newApplication.id,
      newStatus: "SAVED",
      reason: "Job verified and saved to user's application pipeline",
      actor: "SYSTEM",
    });

    // 7. STEP 3: If autoApply requested, enqueue which transitions SAVED -> QUEUED and pushes to persistent queue
    if (input.autoApply) {
      const queueRecord = await applicationQueueService.enqueue({
        applicationId: newApplication.id,
        userId,
        priority: input.priority ?? 0,
      });

      return {
        applicationId: newApplication.id,
        jobId,
        status: "QUEUED",
        created: true,
        queued: true,
        queueId: queueRecord?.id,
        matchScore,
      };
    }

    return {
      applicationId: newApplication.id,
      jobId,
      status: "SAVED",
      created: true,
      queued: false,
      matchScore,
    };
  }

  /**
   * Sync all discovered/matched jobs for a Job Search Loop.
   * - Enforces loop daily limits.
   * - Respects loop.autoApplyEnabled setting.
   * - Preserves DISCOVERED -> SAVED -> QUEUED lifecycle.
   * - Broadcasts realtime updates via SSE.
   * - Does NOT execute Playwright submission.
   */
  async syncLoop(loopId: string, userId: string, options: { forceQueue?: boolean } = {}): Promise<SyncLoopResponse> {
    const loop = await prisma.jobSearchLoop.findFirst({
      where: { id: loopId, userId },
      include: { resume: true },
    });

    if (!loop) {
      throw new Error(`Job search loop "${loopId}" not found for user "${userId}".`);
    }

    // 1. Calculate remaining daily application quota
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const queuedOrAppliedToday = await prisma.application.count({
      where: {
        userId,
        status: { in: ["QUEUED", "RUNNING", "SUBMITTING", "SUBMITTED", "APPLIED"] },
        createdAt: { gte: startOfDay },
      },
    });

    const dailyLimit = loop.dailyApplicationLimit || 10;
    let remainingDailyQuota = Math.max(0, dailyLimit - queuedOrAppliedToday);

    const shouldAutoQueue = (loop.autoApplyEnabled || options.forceQueue === true);

    // 2. Fetch jobs discovered by this loop (tagged with loop name or created by this user)
    const jobs = await prisma.job.findMany({
      where: {
        userId,
        tags: { has: loop.name },
      },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    });

    // 3. Sort jobs by matchScore descending (prioritize best matches for quota allocation)
    const sortedJobs = [...jobs].sort((a, b) => {
      let scoreA = 70;
      let scoreB = 70;
      try {
        if (a.notes) scoreA = JSON.parse(a.notes).matchScore ?? 70;
      } catch {}
      try {
        if (b.notes) scoreB = JSON.parse(b.notes).matchScore ?? 70;
      } catch {}
      return scoreB - scoreA;
    });

    const syncedResults: SyncJobResult[] = [];
    let newlyCreatedCount = 0;
    let newlyQueuedCount = 0;
    let savedCount = 0;

    // 4. Process each eligible job
    for (const job of sortedJobs) {
      // Determine if this job can be queued under remaining daily quota
      const canQueueThisJob = shouldAutoQueue && remainingDailyQuota > 0;

      try {
        const result = await this.syncJobToApplication({
          userId,
          jobId: job.id,
          loopId: loop.id,
          resumeId: loop.resumeId,
          autoApply: canQueueThisJob,
          priority: 0,
        });

        syncedResults.push(result);

        if (result.created) newlyCreatedCount++;
        if (result.queued) {
          newlyQueuedCount++;
          remainingDailyQuota--;
        } else if (result.status === "SAVED") {
          savedCount++;
        }
      } catch (jobErr) {
        logger.warn("PipelineSyncService: error syncing job to application", {
          jobId: job.id,
          error: jobErr instanceof Error ? jobErr.message : String(jobErr),
        });
      }
    }

    // 5. Update loop's appliedCount in database
    if (newlyQueuedCount > 0) {
      await prisma.jobSearchLoop.update({
        where: { id: loop.id },
        data: {
          appliedCount: { increment: newlyQueuedCount },
        },
      });
    }

    // 6. Broadcast realtime summary event
    try {
      eventEmitter.emit({
        type: "application.status_changed",
        userId,
        applicationId: syncedResults[0]?.applicationId || loop.id,
        status: shouldAutoQueue ? "QUEUED" : "SAVED",
        jobId: syncedResults[0]?.jobId || "",
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Non-blocking
    }

    const message = shouldAutoQueue
      ? `Pipeline synced: ${newlyQueuedCount} application(s) queued for submission, ${savedCount} saved. Daily quota remaining: ${remainingDailyQuota}/${dailyLimit}.`
      : `Pipeline synced: ${savedCount} application(s) saved in review pipeline (auto-apply disabled).`;

    logger.info("PipelineSyncService: loop sync completed", {
      loopId: loop.id,
      userId,
      newlyCreatedCount,
      newlyQueuedCount,
      savedCount,
      remainingDailyQuota,
    });

    return {
      success: true,
      loopId: loop.id,
      loopName: loop.name,
      totalEligibleJobs: sortedJobs.length,
      newlyCreatedCount,
      newlyQueuedCount,
      savedCount,
      dailyLimit,
      appliedToday: queuedOrAppliedToday + newlyQueuedCount,
      remainingDailyQuota,
      autoApplyEnabled: loop.autoApplyEnabled,
      applications: syncedResults,
      message,
    };
  }

  /**
   * Get current pipeline statistics for a user and loop.
   */
  async getPipelineStats(userId: string, loopId?: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalApplications,
      queuedCount,
      runningCount,
      submittedCount,
      savedCount,
      waitingUserCount,
      appliedTodayCount,
      userJobCount,
      allJobCount,
      activeQueuesCount,
      cvCount,
      unreadNotificationsCount,
    ] = await Promise.all([
      prisma.application.count({ where: { userId } }),
      prisma.application.count({ where: { userId, status: "QUEUED" } }),
      prisma.application.count({ where: { userId, status: { in: ["RUNNING", "SUBMITTING", "TAILORING"] } } }),
      prisma.application.count({ where: { userId, status: { in: ["SUBMITTED", "APPLIED"] } } }),
      prisma.application.count({ where: { userId, status: "SAVED" } }),
      prisma.application.count({ where: { userId, status: "WAITING_FOR_USER" } }),
      prisma.application.count({
        where: {
          userId,
          status: { in: ["QUEUED", "RUNNING", "SUBMITTING", "SUBMITTED", "APPLIED"] },
          createdAt: { gte: startOfDay },
        },
      }),
      (prisma.job?.count ? prisma.job.count({ where: { userId } }) : Promise.resolve(0)).catch(() => 0),
      (prisma.job?.count ? prisma.job.count() : Promise.resolve(0)).catch(() => 0),
      (prisma.jobSearchLoop?.count ? prisma.jobSearchLoop.count({ where: { userId, status: "ACTIVE" } }) : Promise.resolve(0)).catch(() => 0),
      (prisma.resume?.count ? prisma.resume.count({ where: { userId } }) : Promise.resolve(0)).catch(() => 0),
      (prisma.notification?.count ? prisma.notification.count({ where: { userId, readAt: null } }) : Promise.resolve(0)).catch(() => 0),
    ]);

    // Query tier counts from database if available
    let tier1Mnc = 0;
    let tier2Unicorn = 0;
    let remoteTech = 0;
    let midMarket = 0;
    try {
      if (prisma.job?.count) {
        [tier1Mnc, tier2Unicorn, remoteTech, midMarket] = await Promise.all([
          prisma.job.count({
            where: {
              OR: [
                { company: { tier: { in: ["TIER_1_MNC", "TIER_1", "MNC", "S"] } } },
                { tags: { has: "tier-1" } },
              ],
            },
          }).catch(() => 0),
          prisma.job.count({
            where: {
              OR: [
                { company: { tier: { in: ["TIER_2_UNICORN", "TIER_2", "UNICORN", "SEMI_MNC", "A"] } } },
                { tags: { has: "unicorn" } },
              ],
            },
          }).catch(() => 0),
          prisma.job.count({
            where: {
              OR: [
                { workMode: "REMOTE" },
                { location: { contains: "Remote", mode: "insensitive" } },
              ],
            },
          }).catch(() => 0),
          prisma.job.count({
            where: {
              OR: [
                { company: { tier: { in: ["TIER_3_MIDMARKET", "TIER_3", "MIDMARKET", "B"] } } },
                { tags: { has: "midmarket" } },
              ],
            },
          }).catch(() => 0),
        ]);
      }
    } catch {
      // Ignore
    }

    let dailyLimit = 10;
    if (loopId && prisma.jobSearchLoop?.findUnique) {
      const loop = await prisma.jobSearchLoop.findUnique({
        where: { id: loopId },
        select: { dailyApplicationLimit: true, autoApplyEnabled: true },
      }).catch(() => null);
      if (loop?.dailyApplicationLimit) {
        dailyLimit = loop.dailyApplicationLimit;
      }
    } else if (prisma.jobSearchLoop?.findMany) {
      const activeLoops = await prisma.jobSearchLoop.findMany({
        where: { userId, status: "ACTIVE" },
        select: { dailyApplicationLimit: true },
      }).catch(() => []);
      if (activeLoops && activeLoops.length > 0) {
        dailyLimit = Math.max(...activeLoops.map((l: any) => l.dailyApplicationLimit || 10));
      }
    }

    const totalMatches = userJobCount > 0 ? userJobCount : (allJobCount > 0 ? allJobCount : totalApplications);

    return {
      totalApplications,
      queuedCount,
      runningCount,
      submittedCount,
      savedCount,
      waitingUserCount,
      appliedTodayCount,
      dailyLimit,
      remainingDailyQuota: Math.max(0, dailyLimit - appliedTodayCount),
      totalMatches,
      activeQueuesCount,
      cvCount,
      unreadNotificationsCount,
      tierBreakdown: {
        tier1Mnc,
        tier2Unicorn,
        remoteTech,
        midMarket,
        total: (tier1Mnc + tier2Unicorn + remoteTech + midMarket) || totalMatches,
      },
    };
  }
}

export const pipelineSyncService = new PipelineSyncService();
export default pipelineSyncService;
