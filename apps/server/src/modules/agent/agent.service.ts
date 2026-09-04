import { randomUUID } from "node:crypto";

import { agentGraph } from "./graph/graph.js";
import agentRepository from "./agent.repository.js";
import { eventEmitter } from "../../core/events/index.js";

import type { AgentRunInput, AgentRunResult } from "./agent.types.js";

class AgentService {
    async run(input: AgentRunInput): Promise<AgentRunResult> {
        const threadId = randomUUID();

        await agentRepository.createRun(input.userId, threadId, input.query);

        eventEmitter.emit({
            type: "agent.started",
            userId: input.userId,
            threadId,
            status: "RUNNING",
            timestamp: new Date().toISOString(),
        });

        try {
            const result = await agentGraph.invoke(
                { threadId, userId: input.userId, query: input.query },
                { configurable: { thread_id: threadId } },
            );

            const history: string[] = result.history ?? [];
            const errors: string[] = result.errors ?? [];

            const waitingForUser = history.some((h) =>
                h.includes("waiting for user input"),
            );

            const status = waitingForUser
                ? "WAITING_FOR_USER"
                : errors.length > 0
                  ? "FAILED"
                  : "COMPLETED";

            await agentRepository.updateRun(threadId, { status, history, errors });

            const eventType =
                status === "WAITING_FOR_USER"
                    ? "agent.waiting_for_user"
                    : status === "COMPLETED"
                      ? "agent.completed"
                      : "agent.failed";

            eventEmitter.emit({
                type: eventType,
                userId: input.userId,
                threadId,
                status,
                timestamp: new Date().toISOString(),
            });

            return { threadId, status: status === "WAITING_FOR_USER" ? "RUNNING" : status, history, errors };
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Agent execution failed.";

            await agentRepository.updateRun(threadId, {
                status: "FAILED",
                errors: [message],
            });

            eventEmitter.emit({
                type: "agent.failed",
                userId: input.userId,
                threadId,
                status: "FAILED",
                message,
                timestamp: new Date().toISOString(),
            });

            return { threadId, status: "FAILED", history: [], errors: [message] };
        }
    }

    async getRun(userId: string, threadId: string) {
        return agentRepository.getRun(userId, threadId);
    }

    async getRuns(userId: string) {
        return agentRepository.getRuns(userId);
    }
}

export default new AgentService();