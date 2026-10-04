import { getEnv } from "../../config/env.js";
import queueService from "./queue.service.js";
import applicationQueueService from "./application-queue.service.js";
import autoApplyService from "../application/auto-apply.service.js";
import notificationService from "../notification/notification.service.js";
import { agentService } from "../agent/index.js";
import logger from "../../core/logger/logger.js";

class QueueWorker {
  private activeWorkers: Set<string> = new Set();
  private stopping = false;
  private isRunningLoop = false;
  private workerId = `worker-${process.pid}-${Date.now().toString(36)}`;
  private timer: NodeJS.Timeout | null = null;
  private pollingIntervalMs = 4000;

  get concurrency(): number {
    try {
      return getEnv().QUEUE_CONCURRENCY || 3;
    } catch {
      return 3;
    }
  }

  get activeCount(): number {
    return this.activeWorkers.size;
  }

  /**
   * Start the background polling and execution worker loop
   */
  start() {
    if (this.isRunningLoop) return;
    this.isRunningLoop = true;
    this.stopping = false;
    logger.info(`[QueueWorker] 🚀 Persistent Queue Worker started [${this.workerId}]`);
    this.scheduleNextPoll();
  }

  private scheduleNextPoll() {
    if (!this.isRunningLoop || this.stopping) return;
    this.timer = setTimeout(async () => {
      try {
        await this.processNext();
      } catch (err) {
        logger.error({ err }, "[QueueWorker] Error in worker cycle");
      } finally {
        this.scheduleNextPoll();
      }
    }, this.pollingIntervalMs);
  }

  /**
   * Race-safe markRunning: uses Prisma updateMany with WHERE status=QUEUED.
   */
  private async tryMarkRunningRaceSafe(jobId: string): Promise<any | null> {
    try {
      const { prisma } = await import("@jobpilot/database");
      const result = await prisma.queueJob.updateMany({
        where: { id: jobId, status: "QUEUED" },
        data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: new Date() },
      });
      if (result.count === 0) return null;
      return queueService.getJob(jobId);
    } catch {
      return queueService.getJob(jobId);
    }
  }


  /**
   * Dispatch one job from QueueJob (agent runs) or ApplicationQueue
   */
  private async dispatchOne(): Promise<boolean> {
    if (this.stopping) return false;

    // 1. Check ApplicationQueue first (direct ATS submissions)
    try {
      const appQueueJob = await applicationQueueService.claimNext(this.workerId);
      if (appQueueJob) {
        void autoApplyService.execute(appQueueJob);
        return true;
      }
    } catch {
      // Ignore if database schema or table is not ready
    }

    // 2. Check general Agent Queue
    if (this.activeWorkers.size >= this.concurrency) return false;

    const jobs = await queueService.getPendingJobs();
    if (jobs.length === 0) return false;

    for (const job of jobs) {
      if (this.activeWorkers.has(job.id)) continue;
      const runningJob = await this.tryMarkRunningRaceSafe(job.id);
      if (!runningJob) continue;
      this.activeWorkers.add(job.id);
      this.runWorker(job.id, runningJob).finally(() => {
        this.activeWorkers.delete(job.id);
      });
      return true;
    }
    return false;
  }

  private async runWorker(jobId: string, runningJob: any): Promise<void> {
    try {
      const result = await agentService.run(
        {
          userId: runningJob.userId,
          query: runningJob.query,
          resumeId: runningJob.resumeId,
        },
        runningJob.runId,
      );

      if (result.status === "COMPLETED") {
        await queueService.markCompleted(jobId);
        return;
      }
      if (result.status === "WAITING_FOR_USER") {
        await queueService.markWaitingForUser(jobId);
        await notificationService.create(runningJob.userId, {
          type: "APPLICATION_STATUS",
          title: "Queue Paused — Action Required",
          message: `Processing for "${runningJob.query}" is paused and waiting for your input.`,
        });
        return;
      }
      const error = (result.errors || []).join("; ") || "Agent run failed.";
      if (runningJob.attempts < runningJob.maxAttempts) {
        await queueService.markFailed(jobId, error);
        await queueService.requeue(jobId);
      } else {
        await queueService.markFailed(jobId, error);
        await notificationService.create(runningJob.userId, {
          type: "AGENT_FAILED",
          title: "Job Queue — All Retries Exhausted",
          message: `Processing for "${runningJob.query}" failed after ${runningJob.maxAttempts} attempt(s): ${error}`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Agent execution failed.";
      const currentJob = await queueService.getJob(jobId);
      const maxAttempts = currentJob?.maxAttempts ?? 3;
      const attempts = currentJob?.attempts ?? 1;
      if (attempts < maxAttempts) {
        await queueService.markFailed(jobId, message);
        await queueService.requeue(jobId);
      } else {
        await queueService.markFailed(jobId, message);
        if (currentJob) {
          await notificationService.create(currentJob.userId, {
            type: "AGENT_FAILED",
            title: "Job Queue — All Retries Exhausted",
            message: `Processing for "${currentJob.query}" failed after ${maxAttempts} attempt(s): ${message}`,
          });
        }
      }
    }
  }

  async processBatch(): Promise<number> {
    let dispatched = 0;
    while (this.activeWorkers.size < this.concurrency) {
      const dispatchedOne = await this.dispatchOne();
      if (!dispatchedOne) break;
      dispatched++;
    }
    return dispatched;
  }

  async processNext(): Promise<boolean> {
    return this.dispatchOne();
  }

  async processAll(pollIntervalMs = 2000): Promise<void> {
    while (!this.stopping) {
      await this.processBatch();
      if (this.activeWorkers.size < this.concurrency) {
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      } else {
        await new Promise((r) => setTimeout(r, 50));
      }
    }
  }

  async drain(maxWaitMs = 60000): Promise<void> {
    const start = Date.now();
    while (this.activeWorkers.size > 0 && Date.now() - start < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  stop(): void {
    this.stopping = true;
    this.isRunningLoop = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info(`[QueueWorker] 🛑 Queue Worker stopped [${this.workerId}]`);
  }

  isRunning(): boolean {
    return this.activeWorkers.size > 0 || this.isRunningLoop || !this.stopping;
  }
}

export const queueWorker = new QueueWorker();
export default queueWorker;
