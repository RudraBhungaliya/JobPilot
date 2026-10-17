import type { ElementHandle, Page } from "playwright";
import type { ApplyAdapterInput, ApplyResult } from "../../application/adapters/apply-adapter.interface.js";
import type { DomAtsAdapter } from "../dom-adapter.interface.js";
import logger from "../../../core/logger/logger.js";
import formQuestionAiService from "../../ai/form-question-ai.service.js";
import candidateMapper from "../../agent/candidate/candidate.mapper.js";
import type { CandidateContext } from "../../agent/candidate/candidate.types.js";
import formTool from "../../agent/tools/form.tool.js";
import resumeUploadTool from "../../agent/tools/resume-upload.tool.js";
import submissionVerificationTool from "../../agent/tools/submission-verification.tool.js";

export class UniversalDomAdapter implements DomAtsAdapter {
  readonly name = "universal";
  lastFillCount = 0;

  /**
   * Detects if this page contains an active job opening or application form
   * (works across arbitrary company career portals, Taleo, iCIMS, BambooHR,
   * SmartRecruiters, Jobvite, Breezy, Recruitee, or custom HTML career pages).
   */
  async detect(page: Page): Promise<boolean> {
    try {
      const url = page.url();
      if (/localhost|127\.0\.0\.1/i.test(url)) return true;

      // Check if page has form elements or apply buttons
      const formInputCount = await page.locator("input:not([type='hidden']), textarea, select").count().catch(() => 0);
      if (formInputCount >= 2) {
        return true;
      }

      const applyButtons = await page.locator(
        'button:has-text("Apply"), a:has-text("Apply"), ' +
        'button:has-text("Submit Application"), [data-automation-id*="apply" i], ' +
        'button[type="submit"]'
      ).count().catch(() => 0);

      if (applyButtons > 0) {
        return true;
      }

      // Check title or body text for job application hints
      const title = await page.title().catch(() => "");
      if (/careers|jobs|opening|apply|position|requisition/i.test(title)) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  async apply(page: Page, input: ApplyAdapterInput): Promise<ApplyResult> {
    this.lastFillCount = 0;
    const profile = (input.profile || {}) as CandidateContext;
    const maxSteps = 4;

    try {
      // 1. Prepare and navigate / resolve landing page "Apply" buttons
      try {
        const applyBtn = page.locator(
          'a:has-text("Apply Now"), button:has-text("Apply Now"), ' +
          'a:has-text("Apply for this job"), button:has-text("Apply for this job"), ' +
          'a:has-text("Easy Apply"), button:has-text("Easy Apply"), ' +
          'a[href*="apply" i], button[data-automation-id*="apply" i]'
        ).first();

        if (await applyBtn.isVisible().catch(() => false)) {
          await applyBtn.click().catch(() => {});
          await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(600);
        }
      } catch {}

      // 2. Multi-step form loop
      for (let step = 0; step < maxSteps; step++) {
        await page.waitForLoadState("domcontentloaded").catch(() => {});

        // Early check for CAPTCHA or 2FA
        const earlyHV = await formTool.detectHumanVerification(page).catch(() => ({ detected: false, message: "" }));
        if (earlyHV.detected) {
          return {
            success: false,
            requiresBrowserFallback: false,
            reason: `Human verification required: ${earlyHV.message}`,
          };
        }

        const inputs = await page.$$("input, select, textarea");
        let stepFilledCount = 0;

        for (const el of inputs) {
          try {
            const tag = await el.evaluate((e) => e.tagName.toLowerCase());
            const type = (await el.evaluate((e) => (e as HTMLInputElement).type)) || "text";
            const name = (await el.evaluate((e) => (e as HTMLInputElement).name)) || "";
            const id = (await el.evaluate((e) => (e as HTMLInputElement).id)) || "";
            const labelText = await this.extractLabelText(page, el).catch(() => "");

            if (type === "submit" || type === "button" || type === "hidden") continue;

            // Handle file upload
            if (type === "file") {
              if (input.resume?.fileUrl || input.resume?.path || input.resumeBuffer) {
                try {
                  await resumeUploadTool.upload(page, {
                    fileUrl: input.resume?.fileUrl || input.resume?.path || "",
                    originalName: input.resume?.originalName || "resume.pdf",
                    buffer: input.resumeBuffer,
                  });
                  this.lastFillCount++;
                  stepFilledCount++;
                } catch (upErr) {
                  logger.debug({ upErr }, "UniversalDomAdapter file upload note");
                }
              }
              continue;
            }

            // Skip submit button text
            if (/submit|continue|next|review|apply/i.test((await el.evaluate((e) => (e as HTMLInputElement).value)) || "")) continue;

            const mapped = candidateMapper.resolve(name || id, labelText || name || id, profile);
            let value = mapped.value;

            // Handle terms / consent / authorization defaults if unmapped
            if (!value) {
              const lowerLabel = (labelText || name || id).toLowerCase();
              if (/terms|agree|consent|certif|confirm|privac|acknowledg/i.test(lowerLabel)) {
                value = "yes";
              } else if (/authoriz|legally|eligib|work in/i.test(lowerLabel)) {
                value = "yes";
              } else if (/sponsor|visa/i.test(lowerLabel)) {
                value = profile?.sponsorshipRequired ? "yes" : "no";
              } else if (/18 or older|age 18|legal age/i.test(lowerLabel)) {
                value = "yes";
              }
            }

            // Fallback to grounded AI answer
            if (!value && profile) {
              try {
                const aiAns = await formQuestionAiService.answer({
                  userId: input.userId,
                  jobId: (input.job as any)?.id,
                  jobDescription: (input.job as any)?.description,
                  profileContext: profile,
                  question: labelText || name || id,
                  fieldLabel: labelText,
                  fieldType: type,
                });
                value = aiAns.value;
              } catch {}
            }

            if (!value) continue;

            if (tag === "select") {
              await el.selectOption({ value }).catch(() => el.selectOption({ label: value }).catch(() => {}));
              this.lastFillCount++;
              stepFilledCount++;
            } else if (type === "checkbox") {
              const lower = value.toLowerCase();
              const shouldCheck = lower === "true" || lower === "yes" || lower === "1" || lower === "agree" || lower === "on";
              if (shouldCheck) {
                await el.check().catch(() => el.click().catch(() => {}));
                this.lastFillCount++;
                stepFilledCount++;
              }
            } else if (type === "radio") {
              const lower = value.toLowerCase();
              const radioVal = (await el.getAttribute("value") || "").toLowerCase();
              const shouldCheck = radioVal === lower || (lower === "yes" && (radioVal === "1" || radioVal === "true")) || (lower === "no" && (radioVal === "0" || radioVal === "false")) || !radioVal;
              if (shouldCheck) {
                await el.check().catch(() => el.click().catch(() => {}));
                this.lastFillCount++;
                stepFilledCount++;
              }
            } else {
              await el.fill(value).catch(() => el.type(value).catch(() => {}));
              this.lastFillCount++;
              stepFilledCount++;
            }
          } catch {
            // Proceed through other elements
          }
        }

        // Check for 'Next' or 'Continue' wizard button
        const nextBtn = page.locator(
          'button:has-text("Next"), button:has-text("Continue"), ' +
          'button:has-text("Save & Continue"), button:has-text("Next Step"), input[value="Next" i], input[value="Continue" i]'
        ).first();

        const hasNext = await nextBtn.isVisible().catch(() => false);
        if (hasNext && step < maxSteps - 1) {
          await nextBtn.click().catch(() => {});
          await page.waitForTimeout(1000);
          continue;
        }

        // Final submission step
        const submitBtn = page.locator(
          'button:has-text("Submit Application"), button:has-text("Submit"), ' +
          'button:has-text("Apply"), button:has-text("Apply Now"), button:has-text("Send Application"), ' +
          'input[type="submit"], button[type="submit"], [data-automation-id="submit-button"], [data-qa="btn-submit"]'
        ).first();

        if (await submitBtn.isVisible().catch(() => false)) {
          await submitBtn.click().catch(() => {});
          await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(1500);

          // Verify submission
          const verification = await submissionVerificationTool.verify(page).catch(() => ({
            verified: false,
            reason: "external verification check",
          }));

          let confirmationId: string | undefined = undefined;
          if (verification.verified) {
            const bodyText = await page.locator("body").innerText().catch(() => "");
            const confirmationMatch = bodyText.match(/(?:confirmation|application|reference)\s*(?:#|id|number|code)?\s*[:\-]?\s*([a-z0-9\-_]{5,32})/i);
            confirmationId = confirmationMatch ? confirmationMatch[1] : ((verification as any).confirmationCode || (verification as any).confirmationId || undefined);
          }

          return {
            success: verification.verified,
            confirmationId,
            requiresBrowserFallback: !verification.verified,
            reason: verification.verified ? undefined : verification.reason,
          };
        }

        break;
      }

      return {
        success: false,
        requiresBrowserFallback: true,
        reason: `Universal DOM apply mapped ${this.lastFillCount} field(s); pending verified employer submission confirmation.`,
      };
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        requiresBrowserFallback: false,
        reason: msg,
      };
    }
  }

  private async extractLabelText(page: Page, el: ElementHandle<SVGElement | HTMLElement>): Promise<string> {
    try {
      const id = await el.evaluate((e) => (e as HTMLElement).id);
      if (id) {
        const lbl = await page.$(`label[for="${CSS.escape(id)}"]`);
        if (lbl) {
          const text = await lbl.innerText();
          if (text) return text.trim();
        }
      }
      const aria = await el.evaluate((e) => e.getAttribute("aria-label") || e.getAttribute("placeholder") || "");
      if (aria) return aria.trim();

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

export const universalDomAdapter = new UniversalDomAdapter();
export default universalDomAdapter;
