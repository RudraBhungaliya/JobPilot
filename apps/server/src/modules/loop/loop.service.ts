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

    // Check if resumeId is supplied or fetch default
    let resumeId = data.resumeId;
    if (!resumeId) {
      const defaultResume = await prisma.resume.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      resumeId = defaultResume?.id;
    }

    const loop = await prisma.jobSearchLoop.create({
      data: {
        name: data.name,
        targetCountries: data.targetCountries && data.targetCountries.length > 0 ? data.targetCountries : ["India"],
        targetLocations: data.targetLocations || [],
        targetJobTitles: data.targetJobTitles,
        excludedCompanies: data.excludedCompanies || [],
        includedCompanies: data.includedCompanies || [],
        remotePreference: data.remotePreference || "HYBRID_OR_REMOTE",
        experienceLevel: data.experienceLevel || "MID_SENIOR",
        employmentTypes: data.employmentTypes || ["FULL_TIME"],
        minimumCompensation: data.minimumCompensation || 0,
        maximumCompensation: data.maximumCompensation,
        targetTiers: data.targetTiers || ["S", "A", "B"],
        autoApplyEnabled: data.autoApplyEnabled ?? true,
        recruiterOutreachEnabled: data.recruiterOutreachEnabled ?? false,
        dailyApplicationLimit: data.dailyApplicationLimit || 10,
        dailyDiscoveryLimit: data.dailyDiscoveryLimit || 50,
        priorityStrategy: data.priorityStrategy || "MNC_FIRST",
        resumeId: resumeId || null,
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

    // Compute live real metrics from database
    const loopsWithMetrics = await Promise.all(
      loops.map(async (loop) => {
        // Count real applications created by this user
        const totalApplied = await prisma.application.count({
          where: {
            userId,
            status: { in: ["SUBMITTED", "INTERVIEW", "OFFER"] },
          },
        });

        const inProgress = await prisma.application.count({
          where: {
            userId,
            status: { in: ["QUEUED", "RUNNING", "TAILORING"] },
          },
        });

        const waitingUser = await prisma.application.count({
          where: {
            userId,
            status: "WAITING_FOR_USER",
          },
        });

        const interviews = await prisma.application.count({
          where: {
            userId,
            status: { in: ["INTERVIEW", "OFFER"] },
          },
        });

        return {
          ...loop,
          realtimeStats: {
            appliedCount: loop.appliedCount || totalApplied,
            inProgressCount: inProgress,
            waitingUserCount: waitingUser,
            interviewCount: loop.interviewCount || interviews,
          },
        };
      })
    );

    return loopsWithMetrics;
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
        ...(data.recruiterOutreachEnabled !== undefined && { recruiterOutreachEnabled: data.recruiterOutreachEnabled }),
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

  async runLoop(userId: string, loopId: string) {
    return loopExecutionEngine.executeLoop(loopId, userId);
  }
}

export default new LoopService();
