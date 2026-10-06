import humanActionRepository from "./human-action.repository.js";
import applicationRepository from "../application/application.repository.js";
import auditRepository from "../audit/audit.repository.js";
import notificationService from "../notification/notification.service.js";
import { eventEmitter } from "../../core/events/index.js";

import type {
    CreateHumanActionInput,
    HumanActionAnswers,
} from "./human-action.types.js";

class HumanActionService {
    /**
     * Called by apply.node when required fields cannot be filled.
     * Creates the HumanAction record, sets the application to
     * WAITING_FOR_USER, and writes a USER_ACTION_REQUIRED audit log.
     */
    async createAction(
        input: CreateHumanActionInput,
    ) {
        const humanAction =
            await humanActionRepository.create(input);

        await applicationRepository.update(
            input.applicationId,
            { status: "WAITING_FOR_USER" },
        );

        await auditRepository.create({
            userId: input.userId,
            action: "USER_ACTION_REQUIRED",
            description: `Application ${input.applicationId} requires user input for ${input.questions.length} field(s).`,
            applicationId: input.applicationId,
            agentRunId: input.agentRunId,
            metadata: {
                humanActionId: humanAction.id,
                questionCount: input.questions.length,
                fields: input.questions.map((q) => q.label || q.selector),
            },
        });

        eventEmitter.emit({
            type: "human_action.required",
            userId: input.userId,
            applicationId: input.applicationId,
            humanActionId: humanAction.id,
            questionCount: input.questions.length,
            timestamp: new Date().toISOString(),
        });

        await notificationService.create(input.userId, {
            type: "HUMAN_ACTION_REQUIRED",
            title: "Your Input Is Needed",
            message: `An application requires your input for ${input.questions.length} field(s). Please provide the requested information so processing can continue.`,
            applicationId: input.applicationId,
            agentRunId: input.agentRunId,
        });

        // Trigger email notification to candidate via email provider
        try {
            const { prisma } = await import("@jobpilot/database");
            const appRecord = await prisma.application.findUnique({
                where: { id: input.applicationId },
                include: {
                    job: { include: { company: true } },
                    user: { include: { profile: true } },
                },
            });

            const candidateEmail = appRecord?.user?.profile?.email || appRecord?.user?.email;
            const jobTitle = appRecord?.job?.title || "Target Role";
            const companyName = appRecord?.job?.company?.name || "Target Company";

            if (candidateEmail) {
                const subject = `[JobPilot Interruption Alert] Human Step / Approval needed for ${jobTitle} at ${companyName}`;
                const questionSummary = input.questions.map((q) => `• ${q.label || q.selector}`).join("\n");
                const htmlContent = `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
                        <h2 style="color: #0f172a; margin-bottom: 8px;">JobPilot Automation Interruption</h2>
                        <p style="font-size: 15px; color: #475569;">
                            Your automated application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has encountered a step requiring your interaction or approval before final submission.
                        </p>
                        <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
                            <h4 style="margin: 0 0 8px 0; color: #1e293b;">Required Action:</h4>
                            <ul style="margin: 0; padding-left: 20px; color: #334155;">
                                ${input.questions.map((q) => `<li>${q.label || q.selector}</li>`).join("")}
                            </ul>
                        </div>
                        <p style="font-size: 14px; color: #64748b;">
                            Please clear this human test step or approve the application submission in your JobPilot dashboard.
                        </p>
                        <a href="http://localhost:3000" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 10px;">
                            Open JobPilot Dashboard
                        </a>
                    </div>
                `;

                await notificationService.sendEmailNotification(
                    candidateEmail,
                    subject,
                    htmlContent,
                    `JobPilot Interruption Alert: Human step required for ${jobTitle} at ${companyName}.\nPending items:\n${questionSummary}\nPlease visit your dashboard to clear this step.`
                );
            }
        } catch (mailErr) {
            console.error("Failed to send HITL email notification:", mailErr);
        }

        return humanAction;
    }

    /**
     * Called by the resume endpoint after the user submits answers.
     * Saves answers, marks the human action resolved, re-queues the
     * application, and writes a USER_ACTION_COMPLETED audit log.
     */
    async resolveAction(
        userId: string,
        id: string,
        answers: HumanActionAnswers,
    ) {
        const humanAction =
            await humanActionRepository.findById(id);

        if (!humanAction) {
            throw new Error(
                `HumanAction ${id} not found.`,
            );
        }

        if (humanAction.userId !== userId) {
            throw new Error(
                "You do not have permission to resolve this action.",
            );
        }

        if (humanAction.resolvedAt) {
            throw new Error(
                "This action has already been resolved.",
            );
        }

        const resolved =
            await humanActionRepository.resolve(
                id,
                answers,
            );

        // Move application back to QUEUED so the worker picks it up
        await applicationRepository.update(
            humanAction.applicationId,
            { status: "QUEUED" },
        );

        try {
            const { default: applicationQueueService } = await import("../queue/application-queue.service.js");
            await applicationQueueService.resumeWaitingJob(humanAction.applicationId, answers);
        } catch {
            // applicationQueue record might not exist or be active
        }

        await auditRepository.create({
            userId,
            action: "USER_ACTION_COMPLETED",
            description: `User provided answers for application ${humanAction.applicationId}.`,
            applicationId: humanAction.applicationId,
            agentRunId: humanAction.agentRunId ?? undefined,
            metadata: {
                humanActionId: id,
                answeredFields: Object.keys(answers),
            },
        });

        eventEmitter.emit({
            type: "human_action.resolved",
            userId,
            applicationId: humanAction.applicationId,
            humanActionId: id,
            timestamp: new Date().toISOString(),
        });

        await notificationService.create(userId, {
            type: "APPLICATION_STATUS",
            title: "Your Response Was Received",
            message: `Your answers have been submitted. The application will resume processing shortly.`,
            applicationId: humanAction.applicationId,
            agentRunId: humanAction.agentRunId ?? undefined,
        });

        return resolved;
    }

    async getPendingActions(
        userId: string,
        applicationId: string,
    ) {
        return humanActionRepository.findPendingByApplication(
            applicationId,
            userId,
        );
    }

    async getAllActions(
        userId: string,
        applicationId: string,
    ) {
        return humanActionRepository.findByApplication(
            applicationId,
            userId,
        );
    }

    async getAction(id: string) {
        return humanActionRepository.findById(id);
    }
}

export default new HumanActionService();
