import {
    randomUUID,
} from "node:crypto";

import {
    agentGraph,
} from "./graph/graph.js";

import agentRepository from "./agent.repository.js";
import resumeService from "../resume/resume.service.js";
import auditService from "../audit/audit.service.js";
import notificationService from "../notification/notification.service.js";

import type {
    AgentResume,
    AgentRunInput,
    AgentRunResult,
} from "./agent.types.js";

class AgentService {
    async run(
        input: AgentRunInput,
        existingThreadId?: string,
    ): Promise<AgentRunResult> {
        const threadId = existingThreadId || randomUUID();

        let run = await agentRepository.getRun(input.userId, threadId);
        if (!run) {
            run = await agentRepository.createRun(
                input.userId,
                threadId,
                input.query,
            );
        } else {
            await agentRepository.updateRun(threadId, {
                status: "RUNNING",
            });
        }

        await auditService.create(input.userId, {
            action: "AGENT_STARTED",
            description: `Agent run started for query: "${input.query}"`,
            agentRunId: run.id,
        });

        // Resolve Resume End-to-End
        let resume: AgentResume | undefined;
        let resumeId = input.resumeId;

        if (resumeId) {
            const r = await resumeService.getResume(resumeId);
            if (r) {
                resume = {
                    id: r.id,
                    path: r.fileUrl,
                    fileUrl: r.fileUrl,
                    originalName: r.originalName,
                    tailored: false,
                };
            }
        } else {
            const resumes = await resumeService.getUserResumes(input.userId);
            const readyResume = resumes.find((r) => r.status === "READY") || resumes[0];
            if (readyResume) {
                resumeId = readyResume.id;
                resume = {
                    id: readyResume.id,
                    path: readyResume.fileUrl,
                    fileUrl: readyResume.fileUrl,
                    originalName: readyResume.originalName,
                    tailored: false,
                };
            }
        }

        try {
            const result = await agentGraph.invoke(
                {
                    threadId,
                    userId: input.userId,
                    query: input.query,
                    resumeId,
                    resume,
                },
                {
                    configurable: {
                        thread_id: threadId,
                    },
                },
            );

            const history = result.history ?? [];
            const errors = result.errors ?? [];

            let status: "RUNNING" | "COMPLETED" | "FAILED" | "WAITING_FOR_USER";

            if (
                result.plannerAction === "WAITING_FOR_USER" ||
                result.application?.status === "WAITING_FOR_USER" ||
                result.applications?.some(
                    (app: { status: string }) => app.status === "WAITING_FOR_USER",
                )
            ) {
                status = "WAITING_FOR_USER";
            } else if (errors.length > 0) {
                status = "FAILED";
            } else {
                status = "COMPLETED";
            }

            await agentRepository.updateRun(threadId, {
                status,
                history,
                errors,
            });

            if (status === "COMPLETED") {
                await auditService.create(input.userId, {
                    action: "AGENT_COMPLETED",
                    description: `Agent run successfully completed for query: "${input.query}"`,
                    agentRunId: run.id,
                });

                await notificationService.create(input.userId, {
                    type: "AGENT_COMPLETED",
                    title: "Job Applications Finished",
                    message: `Agent finished processing jobs for "${input.query}".`,
                    agentRunId: run.id,
                });
            } else if (status === "WAITING_FOR_USER") {
                await auditService.create(input.userId, {
                    action: "USER_ACTION_REQUIRED",
                    description: `Agent run paused: user action required to continue for "${input.query}"`,
                    agentRunId: run.id,
                });

                await notificationService.create(input.userId, {
                    type: "APPLICATION_STATUS",
                    title: "Action Required to Clear Application Step",
                    message: `Agent encountered a step requiring your input (e.g. CAPTCHA verification or missing details). Please clear this step to resume auto-applying for "${input.query}".`,
                    agentRunId: run.id,
                });
            } else if (status === "FAILED") {
                await auditService.create(input.userId, {
                    action: "AGENT_FAILED",
                    description: `Agent run failed: ${errors.join("; ")}`,
                    agentRunId: run.id,
                });

                await notificationService.create(input.userId, {
                    type: "AGENT_FAILED",
                    title: "Agent Run Encountered Errors",
                    message: errors[0] || "Agent execution failed.",
                    agentRunId: run.id,
                });
            }

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

            await agentRepository.updateRun(threadId, {
                status: "FAILED",
                errors: [message],
            });

            await auditService.create(input.userId, {
                action: "AGENT_FAILED",
                description: `Agent execution encountered an exception: ${message}`,
                agentRunId: run.id,
            });

            await notificationService.create(input.userId, {
                type: "AGENT_FAILED",
                title: "Agent Run Failed",
                message,
                agentRunId: run.id,
            });

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

    async findActiveRun(userId: string) {
        return agentRepository.findActiveRun(userId);
    }
}

export default new AgentService();