import applicationQueueService from "./application-queue.service.js";
import autoApplyService from "../application/auto-apply.service.js";

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

        // 2. Delegate execution to AutoApplyService
        return autoApplyService.execute(queueJob);
    }

    isRunning(): boolean {
        return this.isRunningLoop;
    }
}

export const queueWorker = new QueueWorker();
export default queueWorker;