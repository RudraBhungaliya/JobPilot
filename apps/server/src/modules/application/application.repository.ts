import { prisma, Prisma } from "@jobpilot/database";

import type {
  CreateApplicationDTO,
  UpdateApplicationDTO,
} from "./application.validators.js";

class ApplicationRepository {
  async create(userId: string, data: CreateApplicationDTO) {
    return prisma.application.create({
      data: { ...data, userId },
    });
  }

  async findById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: { job: true, resume: true },
    });
  }

  async findByUser(userId: string) {
    return prisma.application.findMany({
      where: { userId },
      include: { job: true, resume: true },
      orderBy: { createdAt: "desc" },
    });
  }

  // Used for duplicate prevention before the agent tries to apply
  async findByUserAndJob(userId: string, jobId: string) {
    return prisma.application.findUnique({
      where: { userId_jobId: { userId, jobId } },
    });
  }

  async update(id: string, data: UpdateApplicationDTO) {
    return prisma.application.update({
      where: { id },
      data: {
        ...data,
        // Prisma requires JsonNull sentinel to explicitly clear a Json? column
        tailoringNotes:
            data.tailoringNotes === null
                ? Prisma.JsonNull
                : (data.tailoringNotes as object | undefined),
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
      orderBy: { createdAt: "asc" },
    });
  }
}

export default new ApplicationRepository();
