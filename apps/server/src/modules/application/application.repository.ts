import { prisma, Prisma } from "@jobpilot/database";

import type {
  CreateApplicationDTO,
  UpdateApplicationDTO,
} from "./application.validators.js";

class ApplicationRepository {
  async create(userId: string, data: { jobId: string; resumeId: string; status?: CreateApplicationDTO["status"] }) {
    return prisma.application.create({
      data: {
        jobId: data.jobId,
        resumeId: data.resumeId,
        status: data.status ?? "SAVED",
        userId,
      },
      include: {
        job: { include: { company: true } },
        resume: true,
        humanActions: true,
        auditLogs: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async findById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: {
        job: { include: { company: true } },
        resume: true,
        humanActions: true,
        auditLogs: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async findByUser(userId: string) {
    return prisma.application.findMany({
      where: { userId },
      include: {
        job: { include: { company: true } },
        resume: true,
        humanActions: true,
        auditLogs: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async countByUser(userId: string) {
    return prisma.application.count({
      where: { userId },
    });
  }

  // Used for duplicate prevention before the agent tries to apply
  async findByUserAndJob(userId: string, jobId: string) {
    return prisma.application.findUnique({
      where: { userId_jobId: { userId, jobId } },
      include: {
        job: { include: { company: true } },
        resume: true,
        humanActions: true,
        auditLogs: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async update(id: string, data: UpdateApplicationDTO) {
    const updatePayload: Prisma.ApplicationUpdateInput = {};

    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.attempts !== undefined) updatePayload.attempts = data.attempts;
    if (data.appliedAt !== undefined) updatePayload.appliedAt = data.appliedAt;
    if (data.failureReason !== undefined) updatePayload.failureReason = data.failureReason;
    if (data.rejectionReason !== undefined) updatePayload.rejectionReason = data.rejectionReason;
    if (data.interviewRound !== undefined) updatePayload.interviewRound = data.interviewRound;
    if (data.confirmationCode !== undefined) updatePayload.confirmationCode = data.confirmationCode;
    if (data.matchScore !== undefined) updatePayload.matchScore = data.matchScore;

    if (data.scorecard !== undefined) {
      updatePayload.scorecard =
        data.scorecard === null ? Prisma.JsonNull : (data.scorecard as object);
    }

    if (data.tailoringNotes !== undefined) {
      updatePayload.tailoringNotes =
        data.tailoringNotes === null
          ? Prisma.JsonNull
          : (data.tailoringNotes as object);
    }

    return prisma.application.update({
      where: { id },
      data: updatePayload,
      include: {
        job: { include: { company: true } },
        resume: true,
        humanActions: true,
        auditLogs: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async delete(id: string) {
    return prisma.application.delete({ where: { id } });
  }

  async findPending(limit: number) {
    return prisma.application.findMany({
      where: { status: "QUEUED" },
      take: limit,
      include: {
        job: { include: { company: true } },
        resume: true,
        humanActions: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }
}

export default new ApplicationRepository();

