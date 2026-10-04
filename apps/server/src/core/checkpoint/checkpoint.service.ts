import { prisma, Prisma } from "@jobpilot/database";

import type { AgentCheckpoint } from "./checkpoint.types.js";

// Persists LangGraph state snapshots to the AgentRun table so runs
// can be resumed after a server restart without losing graph progress.
class CheckpointService {
    async save(checkpoint: AgentCheckpoint): Promise<AgentCheckpoint> {
        await prisma.agentRun.updateMany({
            where: { threadId: checkpoint.threadId },
            data: {
                stateSnapshot: {
                    node: checkpoint.node,
                    namespace: checkpoint.namespace,
                    state: checkpoint.state,
                    metadata: checkpoint.metadata ?? null,
                    savedAt: checkpoint.updatedAt.toISOString(),
                } as object,
            },
        });

        return checkpoint;
    }

    async get(threadId: string): Promise<AgentCheckpoint | undefined> {
        const run = await prisma.agentRun.findUnique({
            where: { threadId },
            select: { stateSnapshot: true, createdAt: true, updatedAt: true },
        });

        if (!run?.stateSnapshot) return undefined;

        const snap = run.stateSnapshot as Record<string, unknown>;

        return {
            threadId,
            namespace: String(snap.namespace ?? ""),
            node: String(snap.node ?? ""),
            state: snap.state,
            metadata: (snap.metadata as Record<string, unknown>) ?? undefined,
            createdAt: run.createdAt,
            updatedAt: run.updatedAt,
        };
    }

    async has(threadId: string): Promise<boolean> {
        const run = await prisma.agentRun.findUnique({
            where: { threadId },
            select: { stateSnapshot: true },
        });

        return run?.stateSnapshot != null;
    }

    async delete(threadId: string): Promise<void> {
        await prisma.agentRun.updateMany({
            where: { threadId },
            data: { stateSnapshot: Prisma.JsonNull },
        });
    }
}

export default new CheckpointService();