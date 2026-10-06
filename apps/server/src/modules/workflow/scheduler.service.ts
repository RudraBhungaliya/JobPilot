import { prisma } from "@jobpilot/database";
import logger from "../../core/logger/logger.js";

type ScheduledApp = {
  id: string;
  userId: string;
  jobId: string;
  companyKey: string | null;
};

export interface CronJobHandle {
  id: string;
  expression: string;
  stop: () => void;
  nextTickMs: () => number;
}

class SchedulerService {
  private activeCrons = new Map<string, NodeJS.Timeout>();

  async schedule(batchSize: number): Promise<ScheduledApp[]> {
    try {
      const rows = await prisma.application.findMany({
        where: {
          status: { in: ["QUEUED", "PENDING"] },
        },
        take: Math.max(1, batchSize | 0),
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          userId: true,
          jobId: true,
          companyKey: true,
        },
      });
      return rows as ScheduledApp[];
    } catch {
      return [];
    }
  }


  /**
   * Registers a cron schedule.
   * If expression is "* * * * *", runs every minute (or fires within interval).
   */
  registerCron(expression: string, taskFn: () => Promise<void> | void): CronJobHandle {
    const id = `cron-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    // Parse expression interval: default 60s for "* * * * *"
    const intervalMs = expression === "* * * * *" ? 60 * 1000 : 60 * 1000;

    const timer = setInterval(async () => {
      try {
        await taskFn();
      } catch (err: any) {
        logger.error("SchedulerService: Cron job error", { id, expression, error: err?.message });
      }
    }, intervalMs);

    this.activeCrons.set(id, timer);

    return {
      id,
      expression,
      stop: () => {
        clearInterval(timer);
        this.activeCrons.delete(id);
      },
      nextTickMs: () => intervalMs,
    };
  }

  stopAllCron(): void {
    for (const timer of this.activeCrons.values()) {
      clearInterval(timer);
    }
    this.activeCrons.clear();
  }
}

const schedulerService = new SchedulerService();
export default schedulerService;
export { schedulerService };

