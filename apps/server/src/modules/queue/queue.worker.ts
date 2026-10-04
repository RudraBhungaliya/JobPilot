import applicationQueueService from "./application-queue.service.js";
import ApplicationStateMachine from "../application/application-state-machine.js";
import atsRateLimiter from "./ats-rate-limiter.js";
import { agentService } from "../agent/index.js";

class QueueWorker {
    private isRunningLoop = false;
    private workerId = `worker-${process.pid}-${Date.now().toString(36)}`;
    private pollingIntervalMs = 4000;
    private timer: NodeJS.Timeout | null = null;

    /**
     * Start the background polling and execution worker loop
     */
    start() {
        if (this.isRunningLoop) return;
        this.isRunningLoop = true;
        console.log(`[QueueWorker] 🚀 Persistent Queue Worker started [${this.workerId}]`);

        this.scheduleNextPoll();
    }

    /**
     * Stop the worker loop gracefully
     */
    stop() {
        this.isRunningLoop = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        console.log(`[QueueWorker] 🛑 Queue Worker stopped [${this.workerId}]`);
    }

    private scheduleNextPoll() {
        if (!this.isRunningLoop) return;
        this.timer = setTimeout(async () => {
            try {
                await this.processNext();
            } catch (err) {
                console.error("[QueueWorker] Error in worker cycle:", err);
            } finally {
                this.scheduleNextPoll();
            }
        }, this.pollingIntervalMs);
    }

    /**
     * Claim and execute the next available job
     */
    async processNext(): Promise<boolean> {
        // 1. Transactionally claim next job from database
        const queueJob = await applicationQueueService.claimNext(this.workerId);
        if (!queueJob) {
            return false;
        }

        const app = queueJob.application;
        const jobOpening = app.job;
        const companyName = jobOpening.company.name;
        const atsProvider = jobOpening.url.includes("greenhouse")
            ? "greenhouse"
            : jobOpening.url.includes("ashby")
            ? "ashby"
            : jobOpening.url.includes("lever")
            ? "lever"
            : "default";

        console.log(`[QueueWorker] ⚡ Claimed Application #${app.id} (${jobOpening.title} at ${companyName})`);

        try {
            // STEP 1: TAILORING (Resume & Profile Context Alignment)
            await ApplicationStateMachine.transition({
                applicationId: app.id,
                newStatus: "TAILORING",
                reason: "Aligning candidate profile parameters and formatting application payload.",
                actor: "QUEUE_WORKER",
            });

            // STEP 2: Rate limit pacing before accessing ATS
            await atsRateLimiter.waitForSlot(atsProvider);

            // STEP 3: READY_TO_SUBMIT
            await ApplicationStateMachine.transition({
                applicationId: app.id,
                newStatus: "READY_TO_SUBMIT",
                reason: "Payload prepared. Launching submission sequence.",
                actor: "QUEUE_WORKER",
            });

            // STEP 4: SUBMITTING
            await ApplicationStateMachine.transition({
                applicationId: app.id,
                newStatus: "SUBMITTING",
                reason: `Connecting to ${companyName} ATS portal (${jobOpening.url}).`,
                actor: "QUEUE_WORKER",
            });

            // Execute submission workflow via agentService
            const result = await agentService.run({
                userId: queueJob.userId,
                query: `Apply for ${jobOpening.title} at ${companyName}`,
                resumeId: app.resumeId,
            });

            // Check if human intervention checkpoint was triggered
            if (result.status === "WAITING_FOR_USER") {
                await applicationQueueService.markWaitingForUser(
                    queueJob.id,
                    "Interactive ATS verification / CAPTCHA clearance required.",
                    { checkpointUrl: jobOpening.url, atsProvider }
                );
                return false;
            }

            if (result.status === "COMPLETED") {
                await applicationQueueService.markCompleted(queueJob.id, {
                    atsProvider,
                    jobUrl: jobOpening.url,
                    completedAt: new Date().toISOString(),
                });
                return true;
            }

            // If error occurred
            const errorMsg = result.errors.join("; ") || "Submission encountered an ATS error.";
            const isTransient = !errorMsg.toLowerCase().includes("closed") && !errorMsg.toLowerCase().includes("not accepting");

            await applicationQueueService.markFailed(queueJob.id, errorMsg, isTransient);
            return false;
        } catch (err: any) {
            console.error(`[QueueWorker] Exception processing application ${app.id}:`, err);
            await applicationQueueService.markFailed(queueJob.id, err.message || "Unexpected execution failure", true);
            return false;
        }
    }

    isRunning(): boolean {
        return this.isRunningLoop;
    }
}

export const queueWorker = new QueueWorker();
export default queueWorker;