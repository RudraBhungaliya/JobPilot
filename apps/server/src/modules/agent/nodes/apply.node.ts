import applicationTool from "../tools/application.tool.js";
import browserTool from "../tools/browser.tool.js";
import formTool from "../tools/form.tool.js";
import humanActionService from "../../human-action/human-action.service.js";

import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

class ApplyNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        if (
            state.selectedJobs.length === 0
        ) {
            return {
                errors: [
                    ...state.errors,
                    "No selected jobs available for application.",
                ],
                history: [
                    ...state.history,
                    "Application execution skipped: no selected jobs.",
                ],
            };
        }

        if (!state.resume) {
            return {
                errors: [
                    ...state.errors,
                    "No resume available for application.",
                ],
                history: [
                    ...state.history,
                    "Application execution skipped: no resume.",
                ],
            };
        }

        if (
            state.tailoringInstructions.length === 0
        ) {
            return {
                errors: [
                    ...state.errors,
                    "No tailoring instructions available.",
                ],
                history: [
                    ...state.history,
                    "Application execution skipped: no tailoring instructions.",
                ],
            };
        }

        const browser =
            await browserTool.launch();

        const applications = [];

        for (
            const job of state.selectedJobs
        ) {
            const application =
                await applicationTool.createApplication(
                    state.userId,
                    {
                        jobId: job.id,
                        resumeId:
                            state.resume.id,
                    },
                );

            try {
                await applicationTool.updateApplication(
                    application.id,
                    {
                        status: "RUNNING",
                    },
                );

                const page =
                    await browser.newPage();

                try {
                    await page.goto(
                        job.url,
                        {
                            waitUntil:
                                "domcontentloaded",
                            timeout: 30000,
                        },
                    );

                    const fields =
                        await formTool.detectFields(
                            page,
                        );

                    if (
                        fields.length === 0
                    ) {
                        throw new Error(
                            "No application form fields detected.",
                        );
                    }

                    const fillResults =
                        await formTool.fillFields(
                            page,
                            fields,
                            state.userId,
                            state.resume.id,
                        );

                    const requiredUnfilled =
                        fillResults.filter(
                            (result) => {
                                const field =
                                    fields.find(
                                        (item) =>
                                            item.selector ===
                                            result.selector,
                                    );

                                return (
                                    field?.required &&
                                    !result.filled
                                );
                            },
                        );

                    if (
                        requiredUnfilled.length >
                        0
                    ) {
                        // --- HITL: pause and ask the user instead of failing ---
                        const questions =
                            requiredUnfilled.map(
                                (r) => {
                                    const field =
                                        fields.find(
                                            (f) =>
                                                f.selector ===
                                                r.selector,
                                        )!;

                                    return {
                                        selector:
                                            field.selector,
                                        label:
                                            field.label ||
                                            field.name ||
                                            field.selector,
                                        type: field.type,
                                        required:
                                            field.required,
                                        hint:
                                            r.reason,
                                    };
                                },
                            );

                        await humanActionService.createAction(
                            {
                                userId:
                                    state.userId,
                                applicationId:
                                    application.id,
                                questions,
                            },
                        );

                        await page.close();

                        return {
                            application: {
                                id: application.id,
                                status: "WAITING_FOR_USER",
                            },

                            plannerAction:
                                "WAITING_FOR_USER",

                            history: [
                                ...state.history,
                                `Application ${application.id} paused: ${questions.length} required field(s) need user input (${questions.map((q) => q.label).join(", ")}).`,
                            ],
                        };
                    }

                    await formTool.submit(
                        page,
                    );

                    const updated =
                        await applicationTool.updateApplication(
                            application.id,
                            {
                                status: "SUBMITTED",
                            },
                        );

                    applications.push(
                        updated,
                    );
                } finally {
                    await page.close();
                }
            } catch (error) {
                const failed =
                    await applicationTool.updateApplication(
                        application.id,
                        {
                            status: "FAILED",
                            failureReason:
                                error instanceof Error
                                    ? error.message
                                    : "Application execution failed.",
                        },
                    );

                applications.push(
                    failed,
                );
            }
        }

        const firstApplication =
            applications[0];

        if (!firstApplication) {
            return {
                errors: [
                    ...state.errors,
                    "No applications were created.",
                ],
                history: [
                    ...state.history,
                    "Application execution created no records.",
                ],
            };
        }

        return {
            application: {
                id:
                    firstApplication.id,
                status:
                    firstApplication.status,
            },

            browser: {
                sessionId:
                    state.browser?.sessionId ??
                    `browser-${Date.now()}`,
            },

            history: [
                ...state.history,
                `Application execution completed for ${applications.length} selected job(s).`,
            ],
        };
    }
}

export default new ApplyNode();