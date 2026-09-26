import schedulerService from "./scheduler.service.js";
import applicationSubmitService from "../application/application-submit.service.js";
import logger from "../../core/logger/logger.js";
import retryStrategyService from "./retry-strategy.service.js";
import rateLimiterService from "./rate-limiter.service.js";
import { prisma } from "@jobpilot/database";
import { getEnv } from "../../config/env.js";

export class WorkflowEngine {
  async execute(batchSize: number): Promise<{ executed: number; completed: number; failed: number; waitingForUser: number }> {
    const env = getEnv();
    const applications = await schedulerService.schedule(batchSize);
    const executed = applications.length;
    let completed = 0;
    let failed = 0;
    let waitingForUser = 0;

    for (const app of applications) {
      try {
        const runningRow = await prisma.application.updateMany({
          where: { id: app.id, status: { in: ["QUEUED", "PENDING"] } },
          data: { status: "RUNNING", lastAttemptAt: new Date(), attempts: { increment: 1 } },
        });
        if (runningRow.count === 0) {
          logger.debug("WorkflowEngine: lost race for app", { id: app.id });
          continue;
        }

        const companyKey = app.companyKey || `job-${app.jobId}`;
        if (app.companyKey !== companyKey) {
          await prisma.application.update({ where: { id: app.id }, data: { companyKey } }).catch(() => {});
        }

        const attemptApply = async (attempt: number) => {
          return rateLimiterService.schedule(companyKey, async () => {
            await applicationSubmitService.submitApplication(app.userId, app.id);
          });
        };

        let currentAttempt = 0;
        const maxAttempts = env.APPLY_MAX_ATTEMPTS;
        let success = false;
        let lastError: unknown = null;

        while (currentAttempt < maxAttempts && !success) {
          try {
            await attemptApply(currentAttempt);
            success = true;
          } catch (err) {
            lastError = err;
            const classification = retryStrategyService.classifyApplicationError(err);
            if (classification.classification === "PERMANENT") {
              const classificationReason = classification.reason || "";
              if (/Human action|CAPTCHA|missing fields/i.test(classificationReason)) {
                throw Object.assign(new Error(classificationReason), { __permanent: true, __needsUser: true });
              }
              throw Object.assign(new Error(classificationReason), { __permanent: true });
            }
            currentAttempt++;
            if (currentAttempt < maxAttempts) {
              await retryStrategyService.backoff(currentAttempt - 1, {
                baseMs: classification.classification === "RATE_LIMITED" ? env.RETRY_BASE_MS * 3 : undefined,
              });
            }
          }
        }

        if (success) {
          completed++;
        } else {
          throw lastError ?? new Error("Apply exhausted retries");
        }
      } catch (err: any) {
        const reason = err?.message || String(err || "Unknown error");
        const isPermanent = Boolean(err?.__permanent);
        const needsUser = Boolean(err?.__needsUser);
        if (needsUser) {
          waitingForUser++;
          await prisma.application.updateMany({
            where: { id: app.id, status: "RUNNING" },
            data: { status: "WAITING_FOR_USER", failureReason: reason },
          }).catch((e) => logger.warn("WF status update FAILED", { id: app.id, error: e.message }));
        } else if (isPermanent) {
          failed++;
          await prisma.application.updateMany({
            where: { id: app.id, status: { in: ["RUNNING", "QUEUED", "PENDING"] } },
            data: { status: "FAILED", failureReason: reason },
          }).catch((e) => logger.warn("WF status FAILED update", { id: app.id, error: e.message }));
        } else {
          failed++;
          await prisma.application.updateMany({
            where: { id: app.id, status: "RUNNING" },
            data: { status: "QUEUED" },
          }).catch(() => {});
        }
        logger.warn("WorkflowEngine: app error", { id: app.id, reason, isPermanent, needsUser });
      }
    }

    return { executed, completed, failed, waitingForUser };
  }
}

const workflowEngine = new WorkflowEngine();
export default workflowEngine;
export { workflowEngine };
