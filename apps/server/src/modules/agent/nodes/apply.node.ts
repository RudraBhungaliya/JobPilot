import applicationTool from "../tools/application.tool.js";
import browserTool from "../tools/browser.tool.js";
import formTool from "../tools/form.tool.js";
import resumeUploadTool from "../tools/resume-upload.tool.js";
import submissionVerificationTool from "../tools/submission-verification.tool.js";
import atsService from "../../ats/ats.service.js";
import auditService from "../../audit/audit.service.js";
import notificationService from "../../notification/notification.service.js";
import applicationService from "../../application/application.service.js";

import type { AgentStateType, AgentStateUpdate } from "../graph/state.js";

import { Agent } from "../agent.constants.js";

class ApplyNode {
  async execute(state: AgentStateType): Promise<AgentStateUpdate> {
    if (state.selectedJobs.length === 0) {
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
        errors: [...state.errors, "No resume available for application."],
        history: [
          ...state.history,
          "Application execution skipped: no resume.",
        ],
      };
    }

    if (state.tailoringInstructions.length === 0) {
      return {
        errors: [...state.errors, "No tailoring instructions available."],
        history: [
          ...state.history,
          "Application execution skipped: no tailoring instructions.",
        ],
      };
    }

    // 1. ATS Compatibility Analysis
    try {
      await atsService.analyzeResume(state.resume.id);
    } catch {
      // Continue if ATS analysis encounters minor parsing errors
    }

    const browser = await browserTool.launch();
    const applications = [];
    let requiresUserAction = false;

    for (const [index, job] of state.selectedJobs.entries()) {
      // --- Duplicate prevention via findOrCreate ---
      const { application, skipped } = await applicationService.findOrCreate(
        state.userId,
        { jobId: job.id, resumeId: state.resume.id },
      );

      if (skipped) {
        applications.push(application);
        continue;
      }

      await auditService.create(state.userId, {
        action: "APPLICATION_STARTED",
        description: `Application started for job ${job.title} at ${job.company}`,
        applicationId: application.id,
        jobId: job.id,
      });

      // --- Hardened execution: up to MAX_APPLY_ATTEMPTS per job ---
      let succeeded = false;

      for (let attempt = 1; attempt <= Agent.MAX_APPLY_ATTEMPTS; attempt++) {
        const page = await browser.newPage();

        try {
          await applicationTool.updateApplication(application.id, {
            status: "RUNNING",
            attempts: attempt,
          });

          // Navigate and resolve any redirects or landing page "Apply" buttons
          const { activePage, redirectedUrl } = await formTool.prepareAndNavigate(page, job.url);

          // Check for Human Verification (CAPTCHA, Turnstile, 2FA / OTP, etc.)
          const humanVerification = await formTool.detectHumanVerification(activePage);
          if (humanVerification.detected) {
            const { default: humanActionService } = await import("../../human-action/human-action.service.js");
            await humanActionService.createAction({
              userId: state.userId,
              applicationId: application.id,
              agentRunId: state.threadId,
              questions: [{
                selector: "human_verification_step",
                label: `Human Verification Required: ${humanVerification.message || "Please complete security check / CAPTCHA on the application page"}`,
                type: "human_test",
                required: true,
                hint: `Challenge type: ${humanVerification.type || "Challenge"}. Please complete the human test step in your browser and confirm approval to proceed.`,
              }],
            });

            const waitingApp = await applicationTool.updateApplication(
              application.id,
              {
                status: "WAITING_FOR_USER",
                failureReason: `Human verification required: ${humanVerification.message}`,
              },
            );

            await auditService.create(state.userId, {
              action: "USER_ACTION_REQUIRED",
              description: `Human verification (${humanVerification.type || "Challenge"}) detected for ${job.title} at ${job.company}`,
              applicationId: application.id,
              jobId: job.id,
              metadata: { type: "HUMAN_VERIFICATION", verificationType: humanVerification.type },
            });

            applications.push(waitingApp);
            requiresUserAction = true;
            await activePage.close();
            break;
          }

          const fields = await formTool.detectFields(activePage);

          if (fields.length === 0) {
            throw new Error(`No application form fields detected after resolving redirects to ${redirectedUrl}.`);
          }

          // 2. Form Fill with candidate profile data
          const fillResults = await formTool.fillFields(
            activePage,
            fields,
            state.userId,
            state.resume.id,
          );

          // Check for outsider / custom required fields that candidate profile lacks
          const outsiderMissing = formTool.detectOutsiderRequiredFields(fields, fillResults);

          if (outsiderMissing.length > 0) {
            const { default: humanActionService } = await import("../../human-action/human-action.service.js");
            await humanActionService.createAction({
              userId: state.userId,
              applicationId: application.id,
              agentRunId: state.threadId,
              questions: outsiderMissing.map((item) => ({
                selector: item.field.selector,
                label: item.field.label || item.field.name || item.field.selector,
                type: item.field.type || "text",
                required: item.field.required,
                hint: item.reason,
              })),
            });

            const missingNames = outsiderMissing
              .map((item) => item.field.label || item.field.name || item.field.selector)
              .join(", ");

            const waitingApp = await applicationTool.updateApplication(
              application.id,
              {
                status: "WAITING_FOR_USER",
                failureReason: `Required candidate information not available: ${missingNames}`,
              },
            );

            await auditService.create(state.userId, {
              action: "USER_ACTION_REQUIRED",
              description: `Additional candidate data required for ${job.title}: ${missingNames}`,
              applicationId: application.id,
              jobId: job.id,
              metadata: { type: "OUTSIDER_DATA_REQUIRED", missingFields: missingNames },
            });

            applications.push(waitingApp);
            requiresUserAction = true;
            await activePage.close();
            break;
          }

          // 3. Resume Upload
          await resumeUploadTool.upload(activePage, {
            fileUrl: state.resume.fileUrl || state.resume.path,
            originalName: state.resume.originalName || "resume.pdf",
          });

          // 4. Pre-submission Approval / Permission Step
          const { default: humanActionRepository } = await import("../../human-action/human-action.repository.js");
          const existingActions = await humanActionRepository.findByApplication(application.id, state.userId).catch(() => []);
          const alreadyApproved = existingActions.some((a) => a.resolvedAt !== null);
          const requireApproval = process.env.REQUIRE_SUBMISSION_APPROVAL !== "false";

          if (requireApproval && !alreadyApproved) {
            const { default: humanActionService } = await import("../../human-action/human-action.service.js");
            const filledCount = fillResults.filter((r) => r.filled).length;

            await humanActionService.createAction({
              userId: state.userId,
              applicationId: application.id,
              agentRunId: state.threadId,
              questions: [{
                selector: "submission_approval",
                label: `Review & Approval: Successfully autofilled ${filledCount} field(s) with your profile details for ${job.title} at ${job.company}. Approve final submission?`,
                type: "approval",
                required: true,
                hint: "Confirm approval in JobPilot to allow the agent to finalize and submit this application.",
              }],
            });

            const waitingApp = await applicationTool.updateApplication(
              application.id,
              {
                status: "WAITING_FOR_USER",
                failureReason: "Awaiting user approval before final submission.",
              },
            );

            await auditService.create(state.userId, {
              action: "USER_ACTION_REQUIRED",
              description: `Submission approval required for ${job.title} at ${job.company}`,
              applicationId: application.id,
              jobId: job.id,
              metadata: { type: "SUBMISSION_APPROVAL", filledFieldsCount: filledCount },
            });

            applications.push(waitingApp);
            requiresUserAction = true;
            await activePage.close();
            break;
          }

          // 5. Submit
          await formTool.submit(activePage);

          // 6. Verify submission before marking SUBMITTED
          const verification = await submissionVerificationTool.verify(activePage);

          // 7. Tailored artifacts: persist AI notes against this application
          const tailoringNote = state.tailoringInstructions[index] ?? null;

          if (verification.verified) {
            const submittedApp = await applicationTool.updateApplication(
              application.id,
              {
                status: "SUBMITTED",
                appliedAt: new Date(),
                failureReason: null,
                tailoringNotes: tailoringNote
                  ? { instruction: tailoringNote }
                  : null,
              },
            );

            await auditService.create(state.userId, {
              action: "APPLICATION_SUBMITTED",
              description: `Application submitted successfully for ${job.title} at ${job.company}`,
              applicationId: application.id,
              jobId: job.id,
            });

            await notificationService.create(state.userId, {
              type: "APPLICATION_SUBMITTED",
              title: "Application Submitted Successfully",
              message: `Your application for ${job.title} at ${job.company} was submitted.`,
              applicationId: application.id,
            });

            applications.push(submittedApp);
            succeeded = true;
            break;
          } else {
            const reason = verification.reason || "Submission could not be verified.";

            if (attempt < Agent.MAX_APPLY_ATTEMPTS) {
              // Transient failure — retry
              continue;
            }

            // All attempts exhausted
            const failedApp = await applicationTool.updateApplication(
              application.id,
              {
                status: "FAILED",
                failureReason: reason,
              },
            );

            await auditService.create(state.userId, {
              action: "APPLICATION_FAILED",
              description: `Application failed verification for ${job.title}: ${reason}`,
              applicationId: application.id,
              jobId: job.id,
            });

            await notificationService.create(state.userId, {
              type: "APPLICATION_FAILED",
              title: "Application Submission Failed",
              message: `Application for ${job.title} at ${job.company} failed: ${reason}`,
              applicationId: application.id,
            });

            applications.push(failedApp);
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Application execution failed.";

          if (attempt < Agent.MAX_APPLY_ATTEMPTS) {
            // Transient failure — retry
            continue;
          }

          // All attempts exhausted
          const failed = await applicationTool.updateApplication(application.id, {
            status: "FAILED",
            failureReason: message,
          });

          await auditService.create(state.userId, {
            action: "APPLICATION_FAILED",
            description: `Application failed for ${job.title}: ${message}`,
            applicationId: application.id,
            jobId: job.id,
          });

          await notificationService.create(state.userId, {
            type: "APPLICATION_FAILED",
            title: "Application Error",
            message: `Application for ${job.title} failed: ${message}`,
            applicationId: application.id,
          });

          applications.push(failed);
        } finally {
          await page.close();
        }
      }

      if (!succeeded && !applications.find((a) => a.id === application.id)) {
        applications.push(application);
      }

      // Stop further sequential processing if user action is needed
      if (requiresUserAction) {
        break;
      }
    }

    const firstApplication = applications[0];

    if (!firstApplication) {
      return {
        errors: [...state.errors, "No applications were created."],
        history: [
          ...state.history,
          "Application execution created no records.",
        ],
      };
    }

    return {
      application: {
        id: firstApplication.id,
        status: firstApplication.status,
      },

      applications: applications.map((app) => ({
        id: app.id,
        status: app.status,
      })),

      plannerAction: requiresUserAction ? "WAITING_FOR_USER" : "VERIFY",

      browser: {
        sessionId: state.browser?.sessionId ?? `browser-${Date.now()}`,
      },

      history: [
        ...state.history,
        `Application execution processed ${applications.length} job(s). Current status: ${firstApplication.status}.`,
      ],
    };
  }
}

export default new ApplyNode();
