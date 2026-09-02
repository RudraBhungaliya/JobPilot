import applicationTool from "../tools/application.tool.js";
import browserTool from "../tools/browser.tool.js";
import formTool from "../tools/form.tool.js";
import resumeUploadTool from "../tools/resume-upload.tool.js";
import submissionVerificationTool from "../tools/submission-verification.tool.js";
import atsService from "../../ats/ats.service.js";
import auditService from "../../audit/audit.service.js";
import notificationService from "../../notification/notification.service.js";

import type { AgentStateType, AgentStateUpdate } from "../graph/state.js";

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

    for (const job of state.selectedJobs) {
      const application = await applicationTool.createApplication(
        state.userId,
        {
          jobId: job.id,
          resumeId: state.resume.id,
        },
      );

      await auditService.create(state.userId, {
        action: "APPLICATION_STARTED",
        description: `Application started for job ${job.title} at ${job.company}`,
        applicationId: application.id,
        jobId: job.id,
      });

      try {
        await applicationTool.updateApplication(application.id, {
          status: "RUNNING",
        });

        const page = await browser.newPage();

        try {
          await page.goto(job.url, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });

          // Check for Human Verification (CAPTCHA, Turnstile, 2FA / OTP, etc.)
          const humanVerification = await formTool.detectHumanVerification(page);
          if (humanVerification.detected) {
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

            await notificationService.create(state.userId, {
              type: "APPLICATION_STATUS",
              title: `Human Verification Required: ${job.company}`,
              message: `A security challenge (${humanVerification.type || "CAPTCHA"}) was detected for ${job.title} at ${job.company}. Please complete human verification to submit your application.`,
              applicationId: application.id,
            });

            applications.push(waitingApp);
            requiresUserAction = true;
            break;
          }

          const fields = await formTool.detectFields(page);

          if (fields.length === 0) {
            throw new Error("No application form fields detected.");
          }

          // 2. Form Fill
          const fillResults = await formTool.fillFields(
            page,
            fields,
            state.userId,
            state.resume.id,
          );

          // Check for outsider / custom required fields that candidate profile lacks
          const outsiderMissing = formTool.detectOutsiderRequiredFields(fields, fillResults);

          if (outsiderMissing.length > 0) {
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

            await notificationService.create(state.userId, {
              type: "APPLICATION_STATUS",
              title: `Additional Information Needed: ${job.company}`,
              message: `Application for ${job.title} requires information not found in your profile or resume: "${missingNames}". Please provide answers to proceed.`,
              applicationId: application.id,
            });

            applications.push(waitingApp);
            requiresUserAction = true;
            break; // Stop further sequential processing until user responds
          }

          // 3. Resume Upload
          await resumeUploadTool.upload(page, {
            fileUrl: state.resume.fileUrl || state.resume.path,
            originalName: state.resume.originalName || "resume.pdf",
          });

          // 4. Submit
          await formTool.submit(page);

          // 5. Verify submission before SUBMITTED
          const verification = await submissionVerificationTool.verify(page);

          if (verification.verified) {
            const submittedApp = await applicationTool.updateApplication(
              application.id,
              {
                status: "SUBMITTED",
                appliedAt: new Date(),
                failureReason: null,
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
          } else {
            const reason = verification.reason || "Submission could not be verified.";
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
        } finally {
          await page.close();
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Application execution failed.";

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
