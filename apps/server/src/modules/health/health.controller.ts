import type { Request, Response } from "express";
import { isDatabaseConnected, prisma } from "@jobpilot/database";
import queueWorker from "../queue/queue.worker.js";
import loopExecutionEngine from "../loop/loop-execution.engine.js";

export class HealthController {
  async getHealth(_req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const dbConnected = await isDatabaseConnected();
    const dbLatencyMs = Date.now() - startTime;

    const workerStatus = {
      activeWorkers: queueWorker.activeCount,
      concurrency: queueWorker.concurrency,
      isRunning: queueWorker.isRunning ? queueWorker.isRunning() : true,
    };

    const schedulerStatus = loopExecutionEngine.getStatus();

    const mem = process.memoryUsage();
    const memory = {
      rssMb: Math.round(mem.rss / (1024 * 1024)),
      heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
      heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
    };

    const healthy = dbConnected;
    const statusCode = healthy ? 200 : 503;

    res.status(statusCode).json({
      status: healthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
      database: {
        connected: dbConnected,
        latencyMs: dbLatencyMs,
      },
      queueWorker: workerStatus,
      scheduler: schedulerStatus,
      memory,
    });
  }

  async getLiveness(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ status: "alive", timestamp: new Date().toISOString() });
  }

  async getReadiness(_req: Request, res: Response): Promise<void> {
    const dbConnected = await isDatabaseConnected();
    if (!dbConnected) {
      res.status(503).json({ status: "not_ready", reason: "database_disconnected" });
      return;
    }
    res.status(200).json({ status: "ready" });
  }
}

const healthController = new HealthController();
export default healthController;
