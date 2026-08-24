import applicationTool from "../tools/application.tool.js";
import browserTool from "../tools/browser.tool.js";
import formTool from "../tools/form.tool.js";

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
                history: [
                    ...state.history,
                    "No selected jobs available for application.",
                ],
            };
        }

        if (!state.resume) {
            return {
                history: [
                    ...state.history,
                    "No resume available for application.",
                ],
            };
        }

        if (
            state.tailoringInstructions
                .length === 0
        ) {
            return {
                history: [
                    ...state.history,
                    "No tailoring instructions available for application.",
                ],
            };
        }

        await browserTool.launch();

        const applications = [];

        for (const job of state.selectedJobs) {
            const application =
                await applicationTool.createApplication(
                    state.userId,
                    {
                        jobId: job.id,
                        resumeId:
                            state.resume.id,
                    },
                );

            let page;

            try {
                await applicationTool.updateApplication(
                    application.id,
                    {
                        status: "RUNNING",
                    },
                );

                page =
                    await applicationTool.openJobPage(
                        job.url,
                    );

                const fields =
                    await formTool.detectFields(
                        page,
                    );

                if (fields.length === 0) {
                    throw new Error(
                        "No application form fields detected.",
                    );
                }

                const missing =
                    await formTool.validateRequiredFields(
                        page,
                    );

                if (missing.length > 0) {
                    throw new Error(
                        `Required fields are missing: ${missing
                            .map(
                                (field) =>
                                    field.label ||
                                    field.name ||
                                    field.selector,
                            )
                            .join(", ")}`,
                    );
                }

                const submission =
                    await formTool.submit(
                        page,
                    );

                if (!submission.submitted) {
                    throw new Error(
                        submission.reason,
                    );
                }

                const success =
                    await formTool.detectSubmissionSuccess(
                        page,
                    );

                if (!success) {
                    throw new Error(
                        "Submission could not be verified.",
                    );
                }

                const submitted =
                    await applicationTool.updateApplication(
                        application.id,
                        {
                            status: "SUBMITTED",
                        },
                    );

                applications.push(
                    submitted,
                );
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
            } finally {
                if (page) {
                    await page.close().catch(
                        () => undefined,
                    );
                }
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
                    state.browser
                        ?.sessionId ??
                    `browser-${Date.now()}`,
            },

            history: [
                ...state.history,
                `Processed ${applications.length} application(s).`,
            ],
        };
    }
}

export default new ApplyNode();