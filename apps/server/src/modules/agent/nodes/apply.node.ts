import applicationTool from "../tools/application.tool.js";
import browserTool from "../tools/browser.tool.js";
import formTool from "../tools/form.tool.js";
import humanActionService from "../../human-action/human-action.service.js";
import applicationService from "../../application/application.service.js";
import { eventEmitter } from "../../../core/events/index.js";
import { Agent } from "../agent.constants.js";

import type { AgentStateType, AgentStateUpdate } from "../graph/state.js";

class ApplyNode {
    async execute(state: AgentStateType): Promise<AgentStateUpdate> {
        if (state.selectedJobs.length === 0) {
            return {
                errors: [...state.errors, "No selected jobs available for application."],
                history: [...state.history, "Application skipped: no selected jobs."],
            };
        }

        if (!state.resume) {
            return {
                errors: [...state.errors, "No resume available for application."],
                history: [...state.history, "Application skipped: no resume loaded."],
            };
        }

        if (state.tailoringInstructions.length === 0) {
            return {
                errors: [...state.errors, "No tailoring instructions available."],
                history: [...state.history, "Application skipped: tailoring not done."],
            };
        }

        const browser = await browserTool.launch();
        const applications = [];

        for (const [index, job] of state.selectedJobs.entries()) {
            // --- Duplicate prevention ---
            const { application, skipped } = await applicationService.findOrCreate(
                state.userId,
                { jobId: job.id, resumeId: state.resume.id },
            );

            if (skipped) {
                applications.push(application);
                continue;
            }

            // --- Hardened execution: up to MAX_APPLY_ATTEMPTS per job ---
            let succeeded = false;

            for (let attempt = 1; attempt <= Agent.MAX_APPLY_ATTEMPTS; attempt++) {
                const page = await browser.newPage();

                try {
                    await applicationTool.updateApplication(application.id, {
                        status: "RUNNING",
                        attempts: attempt,
                    });

                    await page.goto(job.url, {
                        waitUntil: "domcontentloaded",
                        timeout: Agent.PAGE_TIMEOUT_MS,
                    });

                    const fields = await formTool.detectFields(page);

                    if (fields.length === 0) {
                        throw new Error("No application form fields detected.");
                    }

                    const fillResults = await formTool.fillFields(
                        page,
                        fields,
                        state.userId,
                        state.resume.id,
                    );

                    const requiredUnfilled = fillResults.filter((result) => {
                        const field = fields.find((f) => f.selector === result.selector);
                        return field?.required && !result.filled;
                    });

                    if (requiredUnfilled.length > 0) {
                        // Pause and ask the user — do not retry automatically
                        const questions = requiredUnfilled.map((r) => {
                            const field = fields.find((f) => f.selector === r.selector)!;
                            return {
                                selector: field.selector,
                                label: field.label || field.name || field.selector,
                                type: field.type,
                                required: field.required,
                                hint: r.reason,
                            };
                        });

                        await humanActionService.createAction({
                            userId: state.userId,
                            applicationId: application.id,
                            questions,
                        });

                        eventEmitter.emit({
                            type: "human_action.required",
                            userId: state.userId,
                            applicationId: application.id,
                            humanActionId: application.id,
                            questionCount: questions.length,
                            timestamp: new Date().toISOString(),
                        });

                        await page.close();

                        return {
                            application: { id: application.id, status: "WAITING_FOR_USER" },
                            plannerAction: "WAITING_FOR_USER",
                            history: [
                                ...state.history,
                                `Application ${application.id} paused — ${questions.length} field(s) need user input.`,
                            ],
                        };
                    }

                    await formTool.submit(page);

                    // --- Tailored artifacts: persist AI notes against this application ---
                    const tailoringNote = state.tailoringInstructions[index] ?? null;

                    const updated = await applicationTool.updateApplication(
                        application.id,
                        {
                            status: "SUBMITTED",
                            tailoringNotes: tailoringNote
                                ? { instruction: tailoringNote }
                                : null,
                        },
                    );

                    applications.push(updated);
                    succeeded = true;
                    break;
                } catch (error) {
                    const reason =
                        error instanceof Error
                            ? error.message
                            : "Application execution failed.";

                    if (attempt < Agent.MAX_APPLY_ATTEMPTS) {
                        // Transient failure — retry
                        continue;
                    }

                    // All attempts exhausted
                    const failed = await applicationTool.updateApplication(
                        application.id,
                        { status: "FAILED", failureReason: reason },
                    );

                    applications.push(failed);
                } finally {
                    await page.close();
                }
            }

            if (!succeeded && !applications.find((a) => a.id === application.id)) {
                applications.push(application);
            }
        }

        const firstApplication = applications[0];

        if (!firstApplication) {
            return {
                errors: [...state.errors, "No applications were processed."],
                history: [...state.history, "Application node produced no records."],
            };
        }

        return {
            application: { id: firstApplication.id, status: firstApplication.status },
            browser: {
                sessionId: state.browser?.sessionId ?? `browser-${Date.now()}`,
            },
            history: [
                ...state.history,
                `Applied to ${applications.length} job(s).`,
            ],
        };
    }
}

export default new ApplyNode();