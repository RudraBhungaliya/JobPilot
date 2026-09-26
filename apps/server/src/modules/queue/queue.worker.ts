import { getEnv } from "../../config/env.js";
import queueService from "./queue.service.js";
import notificationService from "../notification/notification.service.js";
import { agentService } from "../agent/index.js";
import logger from "../../core/logger/logger.js";

class QueueWorker {
  private activeWorkers: Set<string> = new Set();
  private stopping = false;

  get concurrency(): number {
    return getEnv().QUEUE_CONCURRENCY;
  }

  get activeCount(): number {
    return this.activeWorkers.size;
  }

  /**
   * Race-safe markRunning (TR-15.2): uses Prisma updateMany with WHERE status=QUEUED.
   * Only 1 of 2 concurrent callers wins (updated count === 1). Loser returns null.
   */
  private async tryMarkRunningRaceSafe(jobId: string): Promise<any | null> {
    const { prisma } = await import("@jobpilot/database");
    const result = await (prisma as any).queueJob.updateMany({
      where: { id: jobId, status: "QUEUED" },
      data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: new Date() },
    });
    if (result.count === 0) return null;
    return queueService.getJob(jobId);
  }

  /**
   * Dispatch one job. Acquires queue slot, fetches pending job, race-safely marks running, dispatches.
   * Returns true if a job was dispatched; false if none available.
   */
  private async dispatchOne(): Promise<boolean> {
    if (this.stopping) return false;
    if (this.activeWorkers.size >= this.concurrency) return false;

    const jobs = await queueService.getPendingJobs();
    if (jobs.length === 0) return false;

    for (const job of jobs) {
      if (this.activeWorkers.has(job.id)) continue;
      const runningJob = await this.tryMarkRunningRaceSafe(job.id);
      if (!runningJob) continue; // lost the race
      this.activeWorkers.add(job.id);
      // Fire and forget the worker
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

  /**
   * Process as many as allowed by concurrency. Fills up to QUEUE_CONCURRENCY workers.
   * TR-15.1: With QUEUE_CONCURRENCY=2 and 4 pending jobs → 2 active simultaneously.
   */
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

  /**
   * Long-running process loop.
   */
  async processAll(pollIntervalMs = 2000): Promise<void> {
    while (!this.stopping) {
      await this.processBatch();
      if (this.activeWorkers.size < this.concurrency) {
        // Nothing left queued; wait before polling
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      } else {
        // Tiny yield between polls
        await new Promise((r) => setTimeout(r, 50));
      }
    }
  }

  /**
   * Wait for all active workers to complete.
   */
  async drain(maxWaitMs = 60000): Promise<void> {
    const start = Date.now();
    while (this.activeWorkers.size > 0 && Date.now() - start < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  stop(): void {
    this.stopping = true;
  }

  isRunning(): boolean {
    return this.activeWorkers.size > 0 || !this.stopping;
  }
}

export default new QueueWorker();
