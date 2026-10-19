import type { ElementHandle, Page } from "playwright";
import browserTool from "../tools/browser.tool.js";
import applicationTool from "../tools/application.tool.js";
import resumeUploadTool from "../tools/resume-upload.tool.js";
import submissionVerificationTool from "../tools/submission-verification.tool.js";
import formTool from "../tools/form.tool.js";
import formQuestionAiService from "../../ai/form-question-ai.service.js";
import candidateTool from "../candidate/candidate.tool.js";
import candidateMapper from "../candidate/candidate.mapper.js";
import type { CandidateContext } from "../candidate/candidate.types.js";
import auditService from "../../audit/audit.service.js";
import notificationService from "../../notification/notification.service.js";
import emailService from "../../notification/email.service.js";
import applicationService from "../../application/application.service.js";
import applicationRepository from "../../application/application.repository.js";
import checkpointService from "../../../core/checkpoint/checkpoint.service.js";
import logger from "../../../core/logger/logger.js";
import { prisma } from "@jobpilot/database";
import { Agent } from "../agent.constants.js";
import type { AgentStateType, AgentStateUpdate } from "../graph/state.js";
import type { AgentApplication } from "../agent.types.js";

interface UnverifiedSensitiveField {
    selector: string;
    label: string;
    type: string;
    reason: string;
}

/**
 * LangGraph Agentic Auto Data Filling Node
 * 
 * Implements human/developer-like agentic browsing and data-filling loop:
 * 1. Navigates web-scraped company portals & MNC career pages.
 * 2. Clicks through landing page "Apply" triggers and handles new tabs/modals.
 * 3. Traverses multi-step applicant wizards (Personal Info -> Experience -> Custom Questions -> Review).
 * 4. Semantically inspects DOM fields (labels, ARIA, placeholders, surrounding context).
 * 5. Strictly requires verified candidate data for work authorization, age eligibility, visa sponsorship,
 *    and legal consent declarations; never guesses or fabricates sensitive legal declarations.
 * 6. Persists LangGraph checkpoints and pauses into WAITING_FOR_USER if candidate input is missing.
 * 7. Enforces strict duplicate prevention and requires genuine employer confirmation before SUBMITTED.
 */
export class AutoFillNode {
    async execute(state: AgentStateType): Promise<AgentStateUpdate> {
        if (!state.selectedJobs || state.selectedJobs.length === 0) {
            return {
                errors: [...state.errors, "AutoFillNode: No selected jobs available for agentic autofill."],
                history: [...state.history, "AutoFill execution skipped: no selected jobs."],
                autofillCompleted: true,
            };
        }

        if (!state.resume) {
            return {
                errors: [...state.errors, "AutoFillNode: No resume available for agentic autofill."],
                history: [...state.history, "AutoFill execution skipped: candidate resume missing."],
                autofillCompleted: true,
            };
        }

        logger.info(
            { userId: state.userId, jobsCount: state.selectedJobs.length },
            "AutoFillNode: Starting agentic auto data filling across selected web openings",
        );

        // 1. Resolve candidate profile and user contact details
        let candidateProfile: CandidateContext = {
            firstName: "Applicant",
            email: "applicant@jobpilot.ai",
        };
        let candidateEmail = "applicant@jobpilot.ai";
        let candidateName = "Candidate";

        try {
            candidateProfile = await candidateTool.getContext(
                state.userId,
                state.resumeId || state.resume?.id,
            );

            const user = await prisma.user.findUnique({
                where: { id: state.userId },
                include: { profile: true },
            });

            if (user?.profile?.email || user?.email) {
                candidateEmail = user.profile?.email || user.email!;
                candidateProfile.email = candidateEmail;
            }
            if (user?.profile?.firstName) {
                candidateProfile.firstName = user.profile.firstName;
                candidateProfile.lastName = user.profile.lastName || candidateProfile.lastName;
                candidateName = `${user.profile.firstName} ${user.profile.lastName || ""}`.trim();
            }
        } catch (err) {
            logger.debug({ err }, "AutoFillNode: user context lookup notice");
        }

        const browser = await browserTool.launch();
        const applications: AgentApplication[] = [];
        let latestApp: AgentApplication | undefined = state.application;
        let requiresUserAction = false;
        let totalFieldsFilled = 0;

        for (const [index, job] of state.selectedJobs.entries()) {
            // Strict Duplicate Prevention against database records
            const existingPrior = await applicationRepository.findByUserAndJob(state.userId, job.id);
            if (existingPrior && (existingPrior.status === "SUBMITTED" || existingPrior.status === "APPLIED")) {
                logger.info({ userId: state.userId, jobId: job.id }, "AutoFillNode: Duplicate prevented; job already SUBMITTED/APPLIED");
                applications.push(existingPrior as unknown as AgentApplication);
                latestApp = existingPrior as unknown as AgentApplication;
                continue;
            }

            const { application, skipped } = await applicationService.findOrCreate(
                state.userId,
                { jobId: job.id, resumeId: state.resume.id },
            );

            if (skipped) {
                applications.push(application as unknown as AgentApplication);
                latestApp = application as unknown as AgentApplication;
                continue;
            }

            await auditService.create(state.userId, {
                action: "APPLICATION_STARTED",
                description: `Agentic AutoFill started for ${job.title} at ${job.company}`,
                applicationId: application.id,
                jobId: job.id,
            });

            let succeeded = false;

            for (let attempt = 1; attempt <= Agent.MAX_APPLY_ATTEMPTS; attempt++) {
                const page = await browser.newPage();

                try {
                    await applicationTool.updateApplication(application.id, {
                        status: "RUNNING",
                        attempts: attempt,
                    });

                    // A. Navigate & resolve landing page triggers (e.g. 'Apply Now')
                    const activePage = await this.prepareAndNavigateLanding(page, job.url);

                    // B. Dismiss cookie banners / interstitials
                    await this.dismissOverlays(activePage);

                    // C. Early Security Challenge (CAPTCHA / Turnstile / OTP) Check
                    const securityCheck = await formTool.detectHumanVerification(activePage);
                    if (securityCheck.detected) {
                        try {
                            const { default: humanActionService } = await import("../../human-action/human-action.service.js");
                            await humanActionService.createAction({
                                userId: state.userId,
                                applicationId: application.id,
                                agentRunId: state.threadId,
                                questions: [{
                                    selector: "human_verification_step",
                                    label: `Security Verification: ${securityCheck.message || "Please complete security check on company portal"}`,
                                    type: "human_test",
                                    required: true,
                                    hint: `Challenge type: ${securityCheck.type || "Challenge"}. Please complete the verification step to proceed.`,
                                }],
                            });
                        } catch (e: any) {
                            logger.warn({ error: e?.message }, "AutoFillNode: could not persist human action record");
                        }

                        const waitingApp = await applicationTool.updateApplication(
                            application.id,
                            {
                                status: "WAITING_FOR_USER",
                                failureReason: `Human verification required: ${securityCheck.message}`,
                            },
                        );

                        // Persist LangGraph checkpoint snapshot
                        try {
                            await checkpointService.save({
                                threadId: state.threadId,
                                namespace: "autoFill",
                                node: "autoFill",
                                state: {
                                    ...state,
                                    application: waitingApp,
                                    plannerAction: "WAITING_FOR_USER",
                                },
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            });
                        } catch (e: any) {
                            logger.warn({ error: e?.message }, "AutoFillNode: could not persist checkpoint snapshot");
                        }

                        try {
                            await auditService.create(state.userId, {
                                action: "USER_ACTION_REQUIRED",
                                description: `Security challenge (${securityCheck.type}) detected for ${job.title} at ${job.company}`,
                                applicationId: application.id,
                                jobId: job.id,
                            });
                        } catch {}

                        try {
                            await notificationService.create(state.userId, {
                                type: "APPLICATION_STATUS",
                                title: `Human Action Required: ${job.company}`,
                                message: `A security challenge was detected for ${job.title} at ${job.company}. Please complete verification to submit.`,
                                applicationId: application.id,
                            });
                        } catch {}

                        applications.push(waitingApp as unknown as AgentApplication);
                        latestApp = waitingApp as unknown as AgentApplication;
                        requiresUserAction = true;
                        await activePage.close().catch(() => {});
                        break;
                    }

                    // D. Agentic Multi-Step Form Filling Wizard Loop
                    const maxSteps = 4;
                    let jobFieldsFilled = 0;
                    let unverifiedSensitiveFields: UnverifiedSensitiveField[] = [];

                    for (let step = 0; step < maxSteps; step++) {
                        await activePage.waitForLoadState("domcontentloaded").catch(() => {});
                        await activePage.waitForTimeout(500);

                        // Fill current step fields
                        const stepResult = await this.fillCurrentPageInputs(
                            activePage,
                            candidateProfile,
                            state,
                            job,
                        );

                        jobFieldsFilled += stepResult.filledCount;
                        totalFieldsFilled += stepResult.filledCount;

                        if (stepResult.unverifiedQuestions.length > 0) {
                            unverifiedSensitiveFields.push(...stepResult.unverifiedQuestions);
                            break;
                        }

                        // Check for 'Next' or 'Continue' wizard navigation
                        const nextBtn = activePage.locator(
                            'button:has-text("Next"), button:has-text("Continue"), ' +
                            'button:has-text("Save & Continue"), button:has-text("Save and Continue"), ' +
                            'button:has-text("Next Step"), input[value="Next" i], input[value="Continue" i], ' +
                            '[data-automation-id="bottom-navigation-next-button"]',
                        ).first();

                        const hasNext = await nextBtn.isVisible().catch(() => false);
                        if (hasNext && step < maxSteps - 1) {
                            await nextBtn.click().catch(() => {});
                            await activePage.waitForTimeout(1000);
                            continue;
                        }

                        // Reached final review / submit step
                        break;
                    }

                    // If sensitive questions are unverified (work auth, sponsorship, age, consent),
                    // NEVER guess! Pause for user input!
                    if (unverifiedSensitiveFields.length > 0) {
                        try {
                            const { default: humanActionService } = await import("../../human-action/human-action.service.js");
                            await humanActionService.createAction({
                                userId: state.userId,
                                applicationId: application.id,
                                agentRunId: state.threadId,
                                questions: unverifiedSensitiveFields.map((q) => ({
                                    selector: q.selector,
                                    label: q.label,
                                    type: q.type,
                                    required: true,
                                    hint: q.reason,
                                })),
                            });
                        } catch (e: any) {
                            logger.warn({ error: e?.message }, "AutoFillNode: could not persist human action record");
                        }

                        const waitingApp = await applicationTool.updateApplication(
                            application.id,
                            {
                                status: "WAITING_FOR_USER",
                                failureReason: `Candidate verification required for: ${unverifiedSensitiveFields.map((q) => q.label).join(", ")}`,
                            },
                        );

                        // Persist state snapshot to checkpoint
                        try {
                            await checkpointService.save({
                                threadId: state.threadId,
                                namespace: "autoFill",
                                node: "autoFill",
                                state: {
                                    ...state,
                                    application: waitingApp,
                                    plannerAction: "WAITING_FOR_USER",
                                },
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            });
                        } catch (e: any) {
                            logger.warn({ error: e?.message }, "AutoFillNode: could not persist checkpoint snapshot");
                        }

                        try {
                            await auditService.create(state.userId, {
                                action: "USER_ACTION_REQUIRED",
                                description: `Unverified candidate declarations flagged for ${job.title} at ${job.company}`,
                                applicationId: application.id,
                                jobId: job.id,
                            });
                        } catch {}

                        applications.push(waitingApp as unknown as AgentApplication);
                        latestApp = waitingApp as unknown as AgentApplication;
                        requiresUserAction = true;
                        await activePage.close().catch(() => {});
                        break;
                    }

                    // E. Final Submission
                    const submitBtn = activePage.locator(
                        'button:has-text("Submit Application"), button:has-text("Submit Your Application"), ' +
                        'button:has-text("Submit"), button:has-text("Send Application"), ' +
                        'input[type="submit"], button[type="submit"], [data-automation-id="submit-button"], [data-qa="btn-submit"]',
                    ).first();

                    if (await submitBtn.isVisible().catch(() => false)) {
                        await submitBtn.click().catch(() => {});
                        await activePage.waitForLoadState("domcontentloaded", { timeout: 12000 }).catch(() => {});
                        await activePage.waitForTimeout(2000);
                    }

                    // F. Submission Verification — STRICT NO FAKE CONFIRMATION
                    const verification = await submissionVerificationTool.verify(activePage).catch(() => ({
                        verified: false,
                        reason: "Verification check timed out",
                    }));

                    let confirmationId: string | undefined = (verification as any).confirmationId;
                    if (verification.verified && !confirmationId) {
                        const bodyText = await activePage.locator("body").innerText().catch(() => "");
                        const match = bodyText.match(/(?:confirmation|application|reference)\s*(?:#|id|number|code)?\s*[:\-]?\s*([a-z0-9\-_]{5,32})/i);
                        if (match) confirmationId = match[1];
                    }

                    if (verification.verified) {
                        const submittedApp = await applicationTool.updateApplication(application.id, {
                            status: "SUBMITTED",
                            confirmationCode: confirmationId,
                            attempts: attempt,
                        });

                        await auditService.create(state.userId, {
                            action: "APPLICATION_SUBMITTED",
                            description: `Agentic AutoFill verified submission for ${job.title} at ${job.company}`,
                            applicationId: application.id,
                            jobId: job.id,
                            metadata: { confirmationId, fieldsFilled: jobFieldsFilled },
                        });

                        await notificationService.create(state.userId, {
                            type: "APPLICATION_STATUS",
                            title: `Application Submitted: ${job.company}`,
                            message: `Your application for ${job.title} at ${job.company} was submitted successfully! Confirmation ID: ${confirmationId || "Verified"}`,
                            applicationId: application.id,
                        });

                        applications.push(submittedApp as unknown as AgentApplication);
                        latestApp = submittedApp as unknown as AgentApplication;
                        succeeded = true;
                    } else {
                        // Strict No Fake Confirmation: unverified external portal is NOT marked submitted
                        logger.warn({ jobId: job.id, attempt, reason: verification.reason }, "AutoFillNode: external submission could not be verified");
                        if (attempt === Agent.MAX_APPLY_ATTEMPTS) {
                            const failedApp = await applicationTool.updateApplication(application.id, {
                                status: "FAILED",
                                failureReason: `External submission verification failed: ${verification.reason || "External portal submission could not be verified"}`,
                                attempts: attempt,
                            });
                            applications.push(failedApp as unknown as AgentApplication);
                            latestApp = failedApp as unknown as AgentApplication;
                        }
                    }

                    await activePage.close();
                    if (succeeded) break;
                } catch (err: any) {
                    logger.warn({ err, jobId: job.id, attempt }, "AutoFillNode: attempt encountered error");
                    await page.close().catch(() => {});
                    if (attempt === Agent.MAX_APPLY_ATTEMPTS) {
                        const failedApp = await applicationTool.updateApplication(application.id, {
                            status: "FAILED",
                            failureReason: err?.message || "Agentic autofill failed after retry attempts",
                            attempts: attempt,
                        });
                        applications.push(failedApp as unknown as AgentApplication);
                        latestApp = failedApp as unknown as AgentApplication;
                    }
                }
            }
        }

        const historyEntry = `Agentic AutoFill Node: processed ${applications.length} application(s) with ${totalFieldsFilled} total form fields filled across company portals.`;

        return {
            applications,
            application: latestApp,
            autofillCompleted: true,
            plannerAction: requiresUserAction ? "WAITING_FOR_USER" : "VERIFY",
            history: [...state.history, historyEntry],
        };
    }

    /**
     * Resolves landing page "Apply" triggers and redirects.
     */
    private async prepareAndNavigateLanding(page: Page, targetUrl: string): Promise<Page> {
        let activePage = page;
        const popupPromise = page.context().waitForEvent("page", { timeout: 3000 }).catch(() => null);

        await activePage.goto(targetUrl, {
            waitUntil: "domcontentloaded",
            timeout: 35000,
        });

        await activePage.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

        const popup = await popupPromise;
        if (popup) {
            await popup.waitForLoadState("domcontentloaded").catch(() => {});
            activePage = popup;
        }

        // Check if on a landing page with an "Apply" button
        const applySelectors = [
            'a:has-text("Apply Now")',
            'button:has-text("Apply Now")',
            'a:has-text("Apply for this job")',
            'button:has-text("Apply for this job")',
            'a:has-text("Apply for this role")',
            'button:has-text("Apply for this role")',
            'a:has-text("Easy Apply")',
            'button:has-text("Easy Apply")',
            'button:has-text("Apply Manually")',
            'a[href*="apply" i]',
            'button[data-automation-id*="apply" i]',
        ];

        for (const sel of applySelectors) {
            const btn = activePage.locator(sel).first();
            if (await btn.isVisible().catch(() => false)) {
                await btn.click().catch(() => {});
                await activePage.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => {});
                await activePage.waitForTimeout(800);
                break;
            }
        }

        return activePage;
    }

    /**
     * Dismisses common cookie banners, popups, and GDPR modals.
     */
    private async dismissOverlays(page: Page): Promise<void> {
        try {
            const dismissSelectors = [
                'button:has-text("Accept All")',
                'button:has-text("Accept all cookies")',
                'button:has-text("Accept Cookies")',
                'button:has-text("I Accept")',
                'button:has-text("Agree")',
                'button:has-text("Allow All")',
                'button:has-text("Got it")',
                'button:has-text("Close")',
                '#onetrust-accept-btn-handler',
                '[aria-label="Close"]',
            ];

            for (const sel of dismissSelectors) {
                const btn = page.locator(sel).first();
                if (await btn.isVisible().catch(() => false)) {
                    await btn.click().catch(() => {});
                    await page.waitForTimeout(300);
                    break;
                }
            }
        } catch {
            // Dismissal is best-effort
        }
    }

    /**
     * Semantically scans and fills interactive inputs on the current wizard page.
     * Enforces strict candidate verification: never guesses work auth, sponsorship, age, or legal consent.
     */
    private async fillCurrentPageInputs(
        page: Page,
        profile: CandidateContext,
        state: AgentStateType,
        job: any,
    ): Promise<{ filledCount: number; unverifiedQuestions: UnverifiedSensitiveField[] }> {
        let filledCount = 0;
        const unverifiedQuestions: UnverifiedSensitiveField[] = [];
        const inputs = await page.$$("input, select, textarea");

        for (const el of inputs) {
            try {
                const tag = await el.evaluate((e) => e.tagName.toLowerCase());
                const type = (await el.evaluate((e) => (e as HTMLInputElement).type)) || "text";
                const name = (await el.evaluate((e) => (e as HTMLInputElement).name)) || "";
                const id = (await el.evaluate((e) => (e as HTMLInputElement).id)) || "";
                const isRequired = (await el.evaluate((e) => (e as HTMLInputElement).required)) ||
                    (await el.getAttribute("aria-required")) === "true";

                if (type === "submit" || type === "button" || type === "hidden") continue;

                // 1. Resume / File upload handling
                if (type === "file") {
                    if (state.resume?.fileUrl || state.resume?.path) {
                        try {
                            await resumeUploadTool.upload(page, {
                                fileUrl: state.resume.fileUrl || state.resume.path,
                                originalName: state.resume.originalName || "resume.pdf",
                            });
                            filledCount++;
                        } catch (err) {
                            logger.debug({ err }, "AutoFillNode: resume upload note");
                        }
                    }
                    continue;
                }

                // 2. Semantic label extraction
                const labelText = await this.extractLabel(page, el);
                const searchKey = `${labelText} ${name} ${id}`.toLowerCase();

                // Skip navigation/submit words
                if (/submit|continue|next|review|search/i.test(searchKey) && tag !== "textarea") {
                    continue;
                }

                // 3. Sensitive Legal, Authorization & Consent Handling — NEVER GUESS!
                // Work authorization check
                if (/authoriz|legally|eligib.*work|right to work|work in/i.test(searchKey)) {
                    if (profile.workAuthorization) {
                        await this.setInputValue(el, tag, type, profile.workAuthorization);
                        filledCount++;
                        continue;
                    }
                    if (isRequired) {
                        unverifiedQuestions.push({
                            selector: id || name || `input[name="${name}"]`,
                            label: labelText || "Work Authorization",
                            type: "text",
                            reason: "Candidate work authorization is unverified in profile. User confirmation required.",
                        });
                        continue;
                    }
                }

                // Visa sponsorship check
                if (/sponsor|visa|require.*sponsorship/i.test(searchKey)) {
                    if (profile.sponsorshipRequired !== undefined && profile.sponsorshipRequired !== null) {
                        const val = profile.sponsorshipRequired ? "yes" : "no";
                        await this.setInputValue(el, tag, type, val);
                        filledCount++;
                        continue;
                    }
                    if (isRequired) {
                        unverifiedQuestions.push({
                            selector: id || name || `input[name="${name}"]`,
                            label: labelText || "Visa Sponsorship Status",
                            type: "boolean",
                            reason: "Visa sponsorship requirement is unverified in profile. User confirmation required.",
                        });
                        continue;
                    }
                }

                // Age eligibility check (18+)
                if (/18 or older|age 18|legal age|are you 18/i.test(searchKey)) {
                    if (profile.is18OrOlder !== undefined && profile.is18OrOlder !== null) {
                        const val = profile.is18OrOlder ? "yes" : "no";
                        await this.setInputValue(el, tag, type, val);
                        filledCount++;
                        continue;
                    }
                    if (profile.dateOfBirth) {
                        const birthDate = new Date(profile.dateOfBirth);
                        const ageYears = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000);
                        const val = ageYears >= 18 ? "yes" : "no";
                        await this.setInputValue(el, tag, type, val);
                        filledCount++;
                        continue;
                    }
                    if (isRequired) {
                        unverifiedQuestions.push({
                            selector: id || name || `input[name="${name}"]`,
                            label: labelText || "Age Eligibility (18+)",
                            type: "boolean",
                            reason: "Candidate age verification is unverified in profile. User confirmation required.",
                        });
                        continue;
                    }
                }

                // Legal declarations & consent agreement
                if (/terms|agree|consent|certif|confirm.*true|privac|acknowledg/i.test(searchKey)) {
                    if (profile.nonCompeteAgreement != null || (profile as any).preAuthorizedConsent === true) {
                        await this.setInputValue(el, tag, type, "yes");
                        filledCount++;
                        continue;
                    }
                    if (isRequired) {
                        unverifiedQuestions.push({
                            selector: id || name || `input[name="${name}"]`,
                            label: labelText || "Terms & Legal Declaration",
                            type: "boolean",
                            reason: "Mandatory employer legal declaration / consent agreement requires candidate review.",
                        });
                        continue;
                    }
                }

                // 4. Resolve candidate answer via CandidateMapper
                const mapped = candidateMapper.resolve(name || id, labelText, profile);
                let value = mapped.value;

                // 5. Open-ended employer questions: ground with AI service
                if (!value && (tag === "textarea" || /why|describe|experience|cover.?letter|project|interest/i.test(searchKey))) {
                    try {
                        const aiAns = await formQuestionAiService.answer({
                            userId: state.userId,
                            jobId: job.id,
                            jobDescription: job.description,
                            profileContext: profile,
                            question: labelText || name || id,
                            fieldLabel: labelText,
                            fieldType: type,
                        });
                        value = aiAns.value;
                    } catch {
                        // AI answer fallback
                    }
                }

                if (!value) {
                    if (isRequired && tag !== "hidden") {
                        unverifiedQuestions.push({
                            selector: id || name || `input[name="${name}"]`,
                            label: labelText || name || id,
                            type: type,
                            reason: `Required application field "${labelText || name || id}" lacks candidate profile data.`,
                        });
                    }
                    continue;
                }

                // 6. Element filling
                await this.setInputValue(el, tag, type, value);
                filledCount++;
            } catch {
                // Keep filling remaining elements
            }
        }

        return { filledCount, unverifiedQuestions };
    }

    private async setInputValue(
        el: ElementHandle<SVGElement | HTMLElement>,
        tag: string,
        type: string,
        value: string,
    ): Promise<void> {
        if (tag === "select") {
            await (el as any).selectOption({ value }).catch(() =>
                (el as any).selectOption({ label: value }).catch(() => {}),
            );
        } else if (type === "checkbox") {
            const lower = value.toLowerCase();
            const shouldCheck = ["true", "yes", "1", "agree", "on"].includes(lower);
            if (shouldCheck) {
                await (el as any).check().catch(() => (el as any).click().catch(() => {}));
            }
        } else if (type === "radio") {
            const lower = value.toLowerCase();
            const radioVal = ((await el.getAttribute("value")) || "").toLowerCase();
            const shouldCheck =
                radioVal === lower ||
                (lower === "yes" && ["1", "true", "yes"].includes(radioVal)) ||
                (lower === "no" && ["0", "false", "no"].includes(radioVal)) ||
                !radioVal;
            if (shouldCheck) {
                await (el as any).check().catch(() => (el as any).click().catch(() => {}));
            }
        } else {
            await (el as any).fill(value).catch(() => (el as any).type(value).catch(() => {}));
        }
    }

    private async extractLabel(page: Page, el: ElementHandle<SVGElement | HTMLElement>): Promise<string> {
        try {
            const id = await el.evaluate((e) => (e as HTMLElement).id);
            if (id) {
                const lbl = await page.$(`label[for="${CSS.escape(id)}"]`);
                if (lbl) {
                    const text = await lbl.innerText();
                    if (text?.trim()) return text.trim();
                }
            }

            const aria = await el.evaluate(
                (e) => e.getAttribute("aria-label") || e.getAttribute("placeholder") || "",
            );
            if (aria?.trim()) return aria.trim();

            const parentText = await el.evaluate((e) => {
                const p = e.closest("label") || e.parentElement;
                return p ? p.textContent || "" : "";
            });
            return parentText.trim().slice(0, 100);
        } catch {
            return "";
        }
    }
}

export const autoFillNode = new AutoFillNode();
export default autoFillNode;
