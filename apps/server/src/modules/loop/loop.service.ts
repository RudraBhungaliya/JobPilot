import { prisma } from "@jobpilot/database";
import liveAtsService from "../sources/live-ats.service.js";
import loopExecutionEngine from "./loop-execution.engine.js";
import logger from "../../core/logger/logger.js";
import type { CreateLoopDTO, UpdateLoopDTO } from "./loop.types.js";

export class LoopService {
  async createLoop(userId: string, data: CreateLoopDTO) {
    if (!data.name || !data.targetJobTitles || data.targetJobTitles.length === 0) {
      throw new Error("Loop name and at least one target job title are required.");
    }

    let resume = data.resumeId
      ? await prisma.resume.findFirst({ where: { id: data.resumeId, userId } })
      : null;

    if (!resume) {
      resume = await prisma.resume.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
    }

    if (!resume) {
      resume = await prisma.resume.create({
        data: {
          title: "Primary Engineering Resume",
          originalName: "Candidate_Resume.pdf",
          fileUrl: "/resumes/default.pdf",
          status: "READY",
          extractedText: "Full Stack Software Engineer with TypeScript, React, Next.js, Node.js, PostgreSQL, Docker, AWS.",
          userId,
        },
      });
    }

    const loop = await prisma.jobSearchLoop.create({
      data: {
        name: data.name,
        targetCountries: data.targetCountries || [],
        targetLocations: data.targetLocations || [],
        targetJobTitles: data.targetJobTitles,
        excludedCompanies: data.excludedCompanies || [],
        includedCompanies: data.includedCompanies || [],
        remotePreference: data.remotePreference || null,
        experienceLevel: data.experienceLevel || null,
        employmentTypes: data.employmentTypes || ["FULL_TIME"],
        minimumCompensation: data.minimumCompensation ?? null,
        maximumCompensation: data.maximumCompensation,
        targetTiers: data.targetTiers || [],
        autoApplyEnabled: data.autoApplyEnabled ?? false,
        dailyApplicationLimit: data.dailyApplicationLimit || 10,
        dailyDiscoveryLimit: data.dailyDiscoveryLimit || 50,
        priorityStrategy: data.priorityStrategy || "RELEVANCE",
        resumeId: resume.id,
        userId,
      },
      include: {
        resume: true,
      },
    });

    return loop;
  }

  async getLoops(userId: string) {
    const loops = await prisma.jobSearchLoop.findMany({
      where: { userId },
      include: {
        resume: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return loops.map((loop) => ({
      ...loop,
      realtimeStats: {
        appliedCount: loop.appliedCount,
        discoveredCount: loop.discoveredCount,
        interviewCount: loop.interviewCount,
      },
    }));
  }

  async getLoopById(userId: string, loopId: string) {
    const loop = await prisma.jobSearchLoop.findFirst({
      where: { id: loopId, userId },
      include: {
        resume: true,
      },
    });

    if (!loop) {
      throw new Error("Job search loop not found.");
    }

    return loop;
  }

  async updateLoop(userId: string, loopId: string, data: UpdateLoopDTO) {
    const existing = await prisma.jobSearchLoop.findFirst({
      where: { id: loopId, userId },
    });

    if (!existing) {
      throw new Error("Job search loop not found.");
    }

    const updated = await prisma.jobSearchLoop.update({
      where: { id: loopId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.status && { status: data.status }),
        ...(data.targetCountries && { targetCountries: data.targetCountries }),
        ...(data.targetLocations && { targetLocations: data.targetLocations }),
        ...(data.targetJobTitles && { targetJobTitles: data.targetJobTitles }),
        ...(data.excludedCompanies && { excludedCompanies: data.excludedCompanies }),
        ...(data.includedCompanies && { includedCompanies: data.includedCompanies }),
        ...(data.remotePreference && { remotePreference: data.remotePreference }),
        ...(data.experienceLevel && { experienceLevel: data.experienceLevel }),
        ...(data.employmentTypes && { employmentTypes: data.employmentTypes }),
        ...(data.minimumCompensation !== undefined && { minimumCompensation: data.minimumCompensation }),
        ...(data.maximumCompensation !== undefined && { maximumCompensation: data.maximumCompensation }),
        ...(data.targetTiers && { targetTiers: data.targetTiers }),
        ...(data.autoApplyEnabled !== undefined && { autoApplyEnabled: data.autoApplyEnabled }),
        ...(data.dailyApplicationLimit && { dailyApplicationLimit: data.dailyApplicationLimit }),
        ...(data.dailyDiscoveryLimit && { dailyDiscoveryLimit: data.dailyDiscoveryLimit }),
        ...(data.priorityStrategy && { priorityStrategy: data.priorityStrategy }),
        ...(data.resumeId && { resumeId: data.resumeId }),
      },
      include: {
        resume: true,
      },
    });

    return updated;
  }

  async deleteLoop(userId: string, loopId: string) {
    const existing = await prisma.jobSearchLoop.findFirst({
      where: { id: loopId, userId },
    });

    if (!existing) {
      throw new Error("Job search loop not found.");
    }

    await prisma.jobSearchLoop.delete({
      where: { id: loopId },
    });

    return { success: true, message: "Loop deleted successfully." };
  }

  async runLoop(userId: string, loopId: string, options: { syncPipeline?: boolean } = { syncPipeline: true }) {
    return loopExecutionEngine.executeLoop(loopId, userId, options);
  }

  async matchLoopJobs(userId: string, loopId: string, options: { persistApplications?: boolean } = { persistApplications: true }) {
    const { jobMatchingService } = await import("../matching/job-matching.service.js");
    return jobMatchingService.matchAndRankLoopJobs(loopId, userId, options);
  }

  async getLoopMatches(userId: string, loopId: string) {
    const { jobMatchingService } = await import("../matching/job-matching.service.js");
    return jobMatchingService.matchAndRankLoopJobs(loopId, userId, { persistApplications: false });
  }

  async syncLoopPipeline(userId: string, loopId: string, options: { forceQueue?: boolean } = {}) {
    const { pipelineSyncService } = await import("../application/pipeline-sync.service.js");
    return pipelineSyncService.syncLoop(loopId, userId, options);
  }

  async getLoopPipelineStats(userId: string, loopId: string) {
    const { pipelineSyncService } = await import("../application/pipeline-sync.service.js");
    return pipelineSyncService.getPipelineStats(userId, loopId);
  }
}

export default new LoopService();


