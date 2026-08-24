import {
    randomUUID,
} from "node:crypto";

import {
    agentGraph,
} from "./graph/graph.js";

import agentRepository from "./agent.repository.js";

import type {
    AgentRunInput,
    AgentRunResult,
} from "./agent.types.js";

class AgentService {
    async run(
        input: AgentRunInput,
    ): Promise<AgentRunResult> {
        const threadId =
            randomUUID();

        await agentRepository.createRun(
            input.userId,
            threadId,
            input.query,
        );

        try {
            const result =
                await agentGraph.invoke(
                    {
                        threadId,
                        userId:
                            input.userId,
                        query:
                            input.query,
                    },
                    {
                        configurable: {
                            thread_id:
                                threadId,
                        },
                    },
                );

            const history =
                result.history ?? [];

            const errors =
                result.errors ?? [];

            const status =
                errors.length > 0
                    ? "FAILED"
                    : "COMPLETED";

            await agentRepository.updateRun(
                threadId,
                {
                    status,
                    history,
                    errors,
                },
            );

            return {
                threadId,
                status,
                history,
                errors,
            };
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Agent execution failed.";

            await agentRepository.updateRun(
                threadId,
                {
                    status: "FAILED",
                    errors: [message],
                },
            );

            return {
                threadId,
                status: "FAILED",
                history: [],
                errors: [message],
            };
        }
    }

    async getRun(
        userId: string,
        threadId: string,
    ) {
        return agentRepository.getRun(
            userId,
            threadId,
        );
    }

    async getRuns(
        userId: string,
    ) {
        return agentRepository.getRuns(
            userId,
        );
    }
}

export default new AgentService();