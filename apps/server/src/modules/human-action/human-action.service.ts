import humanActionRepository from "./human-action.repository.js";
import applicationRepository from "../application/application.repository.js";
import auditRepository from "../audit/audit.repository.js";
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
