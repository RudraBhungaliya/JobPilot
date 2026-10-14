import { prisma } from "@jobpilot/database";
import type {
  OverviewMetrics,
  ConversionRates,
  FunnelStage,
  SourceMetric,
  TierMetric,
  FailureReasonBreakdown,
  ActivityDataPoint,
  RecordEventInput,
} from "./analytics.types.js";
import logger from "../../core/logger/logger.js";

function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  const rate = (numerator / denominator) * 100;
  return Math.round(rate * 10) / 10;
}

export class AnalyticsService {
  /**
   * Aggregate high-level overview metrics across all pipeline stages
   */
  async getOverview(userId: string): Promise<OverviewMetrics> {
    try {
      // 1. Core database counts in parallel
      const now = new Date();
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      const [
        discoveredJobs,
        applications,
        activeLoops,
        appliedToday,
      ] = await Promise.all([
        // Job rows are the persisted discovery records. Applications are not a
        // proxy for discovery because many discovered jobs are never applied to.
        prisma.job.count({ where: { userId } }),
        prisma.application.findMany({
          where: { userId },
          select: {
            id: true,
            status: true,
            confirmationCode: true,
            failureReason: true,
            createdAt: true,
            appliedAt: true,
          },
        }),
        prisma.jobSearchLoop.findMany({
          where: { userId, status: "ACTIVE" },
          select: { dailyApplicationLimit: true, appliedCount: true },
        }),
        prisma.application.count({ where: { userId, appliedAt: { gte: dayStart, lte: now } } }),
      ]);

      // 2. Compute application status breakdown
      let queued = 0;
      let running = 0;
      let submitted = 0;
      let verified = 0;
      let failed = 0;
      let waitingUser = 0;
      let saved = 0;
      let interviews = 0;
      let offers = 0;
      let rejected = 0;

      for (const app of applications) {
        switch (app.status) {
          case "QUEUED":
          case "PENDING":
          case "MATCHED":
            queued++;
            break;
          case "RUNNING":
          case "SUBMITTING":
          case "TAILORING":
          case "READY_TO_SUBMIT":
            running++;
            break;
          case "SUBMITTED":
          case "APPLIED":
            submitted++;
            // These states are only entered after the submit adapter or browser
            // confirmation check reports success. A confirmationCode is optional
            // for ATSes that do not return a receipt identifier.
            verified++;
            break;
          case "WAITING_FOR_USER":
          case "REVIEW_REQUIRED":
          case "VERIFICATION_PENDING":
            waitingUser++;
            break;
          case "FAILED":
          case "RETRYING":
            failed++;
            break;
          case "INTERVIEW":
            submitted++;
            verified++;
            interviews++;
            break;
          case "OFFER":
            submitted++;
            verified++;
            offers++;
            interviews++;
            break;
          case "REJECTED":
            submitted++;
            verified++;
            rejected++;
            break;
          case "SAVED":
          case "DISCOVERED":
            saved++;
            break;
          default:
            break;
        }
      }

      const totalApplications = applications.length;
      const totalApplied = queued + running + submitted + failed + waitingUser;

      // 3. Compute Conversion Rates
      const conversionRates: ConversionRates = {
        discoveryToAppliedRate: safeRate(totalApplied, discoveredJobs),
        applicationToSubmittedRate: safeRate(submitted, totalApplied),
        submissionVerificationRate: safeRate(verified, submitted),
        submissionToInterviewRate: safeRate(interviews, submitted),
        interviewToOfferRate: safeRate(offers, interviews),
        overallFunnelConversion: safeRate(interviews, totalApplications),
      };

      // 4. Daily quota calculations
      const dailyLimit = activeLoops.reduce((sum, l) => sum + l.dailyApplicationLimit, 0);
      const dailyQuotaRemaining = Math.max(0, dailyLimit - appliedToday);

      return {
        discoveredJobs,
        totalApplications,
        queuedApplications: queued,
        runningApplications: running,
        submittedApplications: submitted,
        verifiedSubmissions: verified,
        failedApplications: failed,
        waitingUserApplications: waitingUser,
        savedApplications: saved,
        interviewsCount: interviews,
        offersCount: offers,
        rejectedCount: rejected,
        activeLoopsCount: activeLoops.length,
        conversionRates,
        dailyQuotaRemaining,
        dailyApplicationLimit: dailyLimit,
      };
    } catch (err) {
      logger.error({ err, userId }, "[AnalyticsService] Error calculating overview metrics");
      throw err;
    }
  }

  /**
   * Detailed Stage-by-Stage Funnel with drop-offs
   */
  async getFunnel(userId: string): Promise<FunnelStage[]> {
    const overview = await this.getOverview(userId);

    const stages: Array<{ stage: FunnelStage["stage"]; label: string; count: number }> = [
      { stage: "DISCOVERED", label: "Discovered Jobs", count: overview.discoveredJobs },
      { stage: "SAVED", label: "Saved applications", count: overview.savedApplications },
      { stage: "QUEUED", label: "Enqueued for Auto-Apply", count: overview.queuedApplications + overview.runningApplications + overview.submittedApplications + overview.failedApplications },
      { stage: "RUNNING", label: "Processing & Tailoring", count: overview.runningApplications + overview.submittedApplications },
      { stage: "SUBMITTED", label: "Submitted to ATS", count: overview.submittedApplications },
      { stage: "VERIFIED", label: "Verified Submissions", count: overview.verifiedSubmissions },
      { stage: "INTERVIEW", label: "Interview Invitations", count: overview.interviewsCount },
      { stage: "OFFER", label: "Job Offers", count: overview.offersCount },
    ];

    const result: FunnelStage[] = [];
    for (let i = 0; i < stages.length; i++) {
      const current = stages[i];
      const prev = i > 0 ? stages[i - 1] : null;

      const conversionFromPrevious = prev && prev.count > 0
        ? safeRate(current.count, prev.count)
        : (i === 0 ? 100 : 0);

      const dropoffRate = prev && prev.count > 0
        ? Math.max(0, Math.round((100 - conversionFromPrevious) * 10) / 10)
        : 0;

      result.push({
        stage: current.stage,
        label: current.label,
        count: current.count,
        conversionFromPrevious,
        dropoffRate,
      });
    }

    return result;
  }

  /**
   * Sources and Company Tiers breakdown
   */
  async getSourcesAndTiers(userId: string): Promise<{ sources: SourceMetric[]; tiers: TierMetric[] }> {
    try {
      const [applications, jobs] = await Promise.all([prisma.application.findMany({
        where: { userId },
        include: {
          job: {
            include: { company: true },
          },
        },
      }), prisma.job.findMany({
        where: { userId },
        select: { atsProvider: true, company: { select: { verifiedAts: true, tier: true } } },
      })]);

      const sourceMap = new Map<string, { discovered: number; applied: number; submitted: number }>();
      const tierMap = new Map<string, number>();

      for (const job of jobs) {
        const source = (job.atsProvider || job.company?.verifiedAts || "unknown").toLowerCase();
        const metric = sourceMap.get(source) || { discovered: 0, applied: 0, submitted: 0 };
        metric.discovered++;
        sourceMap.set(source, metric);
      }

      for (const app of applications) {
        const ats = (app.job?.atsProvider || app.job?.company?.verifiedAts || "unknown").toLowerCase();
        const curSource = sourceMap.get(ats) || { discovered: 0, applied: 0, submitted: 0 };
        curSource.applied++;
        if (app.status === "SUBMITTED" || app.status === "APPLIED" || app.status === "INTERVIEW" || app.status === "OFFER") {
          curSource.submitted++;
        }
        sourceMap.set(ats, curSource);

        const tierRaw = (app.job?.company?.tier || "Other").trim();
        const tierValue = tierRaw.toLowerCase();
        let tierClean: TierMetric["tier"] = "Other";
        if (/^(s|tier.?1)$|mnc|global enterprise/i.test(tierValue)) tierClean = "S";
        else if (/^(a|tier.?2)$|unicorn|semi.?mnc/i.test(tierValue)) tierClean = "A";
        else if (/remote/i.test(tierValue)) tierClean = "Remote";
        else if (/^(c|tier.?4)$|services/i.test(tierValue)) tierClean = "C";
        else if (/^(b|tier.?3)$|mid.?market|scale.?up/i.test(tierValue)) tierClean = "B";

        tierMap.set(tierClean, (tierMap.get(tierClean) || 0) + 1);
      }

      const sources: SourceMetric[] = Array.from(sourceMap.entries()).map(([source, data]) => ({
        source: source.toUpperCase(),
        discovered: data.discovered,
        applied: data.applied,
        submitted: data.submitted,
        successRate: safeRate(data.submitted, data.applied),
      }));

      const totalTiers = applications.length || 1;
      const tiers: TierMetric[] = [
        { tier: "S", label: "Tier 1 Global MNCs", count: tierMap.get("S") || 0, percentage: safeRate(tierMap.get("S") || 0, totalTiers) },
        { tier: "A", label: "Semi-MNCs & Unicorns", count: tierMap.get("A") || 0, percentage: safeRate(tierMap.get("A") || 0, totalTiers) },
        { tier: "B", label: "Mid-Market Tech", count: tierMap.get("B") || 0, percentage: safeRate(tierMap.get("B") || 0, totalTiers) },
        { tier: "C", label: "Other companies", count: tierMap.get("C") || 0, percentage: safeRate(tierMap.get("C") || 0, totalTiers) },
        { tier: "Remote", label: "Global Remote", count: tierMap.get("Remote") || 0, percentage: safeRate(tierMap.get("Remote") || 0, totalTiers) },
        { tier: "Other", label: "Unclassified", count: tierMap.get("Other") || 0, percentage: safeRate(tierMap.get("Other") || 0, totalTiers) },
      ];

      return { sources, tiers };
    } catch (err) {
      logger.error({ err, userId }, "[AnalyticsService] Error aggregating sources and tiers");
      throw err;
    }
  }

  /**
   * Failure Reasons Breakdown categorized
   */
  async getFailures(userId: string): Promise<FailureReasonBreakdown[]> {
    try {
      const failedApps = await prisma.application.findMany({
        where: {
          userId,
          status: "FAILED",
        },
        select: { failureReason: true, status: true },
      }).catch(() => []);

      const categoryCounts = new Map<FailureReasonBreakdown["category"], { count: number; sampleReason: string }>();

      for (const app of failedApps) {
        const reason = (app.failureReason || "Submission failure").toLowerCase();
        let cat: FailureReasonBreakdown["category"] = "OTHER";

        if (/captcha|recaptcha|turnstile|hcaptcha|security.*check|verification/i.test(reason)) {
          cat = "HUMAN_VERIFICATION";
        } else if (/closed|404|not.*found|no.*longer.*accepting|expired/i.test(reason)) {
          cat = "CLOSED_POSTING";
        } else if (/required.*field|missing|validation|unanswered/i.test(reason)) {
          cat = "VALIDATION_ERROR";
        } else if (/rate.*limit|429|too.*many|cooldown|throttl/i.test(reason)) {
          cat = "RATE_LIMITED";
        } else if (/timeout|network|econnrefused|gateway/i.test(reason)) {
          cat = "NETWORK_TIMEOUT";
        }

        const existing = categoryCounts.get(cat) || { count: 0, sampleReason: app.failureReason || cat };
        existing.count++;
        categoryCounts.set(cat, existing);
      }

      const total = failedApps.length || 1;
      const breakdowns: FailureReasonBreakdown[] = Array.from(categoryCounts.entries()).map(([cat, data]) => ({
        category: cat,
        reason: data.sampleReason,
        count: data.count,
        percentage: safeRate(data.count, total),
      }));

      return breakdowns.sort((a, b) => b.count - a.count);
    } catch (err) {
      logger.error({ err, userId }, "[AnalyticsService] Error calculating failure breakdown");
      throw err;
    }
  }

  /**
   * Time series daily activity data points for chart & trend rendering
   */
  async getActivity(userId: string, days = 14): Promise<ActivityDataPoint[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const applications = await prisma.application.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        select: { status: true, createdAt: true, appliedAt: true, updatedAt: true },
      });

      const jobs = await prisma.job.findMany({
        where: { userId, createdAt: { gte: startDate } },
        select: { createdAt: true },
      });

      // Bucket by YYYY-MM-DD
      const dateMap = new Map<string, ActivityDataPoint>();
      for (let i = 0; i <= days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().split("T")[0];
        dateMap.set(key, {
          date: key,
          discovered: 0,
          applied: 0,
          submitted: 0,
          failed: 0,
        });
      }

      for (const job of jobs) {
        const key = new Date(job.createdAt).toISOString().split("T")[0];
        const pt = dateMap.get(key);
        if (pt) pt.discovered++;
      }

      for (const app of applications) {
        const key = new Date(app.createdAt).toISOString().split("T")[0];
        const pt = dateMap.get(key);
        if (pt) pt.applied++;
        const submittedKey = app.appliedAt?.toISOString().split("T")[0];
        const submittedPoint = submittedKey ? dateMap.get(submittedKey) : undefined;
        if (submittedPoint) {
          if (app.status === "SUBMITTED" || app.status === "APPLIED" || app.status === "INTERVIEW" || app.status === "OFFER" || app.status === "REJECTED") {
            submittedPoint.submitted++;
          }
        }
        if (app.status === "FAILED") {
          const failureKey = app.updatedAt.toISOString().split("T")[0];
          const failurePoint = dateMap.get(failureKey);
          if (failurePoint) failurePoint.failed++;
        }
      }

      return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    } catch (err) {
      logger.error({ err, userId }, "[AnalyticsService] Error calculating activity time-series");
      throw err;
    }
  }

  /**
   * Record external interaction or recruiter reply event
   */
  async recordEvent(userId: string, input: RecordEventInput) {
    if (input.applicationId) {
      const application = await prisma.application.findFirst({
        where: { id: input.applicationId, userId },
        select: { id: true },
      });
      if (!application) {
        const error = new Error("Application not found");
        Object.assign(error, { statusCode: 404 });
        throw error;
      }
    }

    const audit = await prisma.auditLog.create({
      data: {
        userId,
        action: "USER_ACTION_COMPLETED",
        description: `Application outcome recorded: ${input.type} for ${input.companyName || "Company"}`,
        applicationId: input.applicationId,
        metadata: {
          event: input.type,
          companyName: input.companyName,
          notes: input.notes,
          ...input.metadata,
          recordedAt: new Date().toISOString(),
        },
      },
    });

    // If an interview invite or offer was received, transition application status accordingly
    if (input.applicationId) {
      let targetStatus: any = null;
      if (input.type === "INTERVIEW_INVITE") targetStatus = "INTERVIEW";
      else if (input.type === "OFFER_RECEIVED") targetStatus = "OFFER";
      else if (input.type === "REJECTION_RECEIVED") targetStatus = "REJECTED";

      if (targetStatus) {
        try {
          const { default: ApplicationStateMachine } = await import("../application/application-state-machine.js");
          await ApplicationStateMachine.transition({
            applicationId: input.applicationId,
            newStatus: targetStatus,
            reason: input.notes || `Recruiter event: ${input.type}`,
            actor: "USER",
          });
        } catch (transErr) {
          logger.warn({ transErr }, "Failed to transition application on event record");
        }
      }
    }

    return audit;
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;
