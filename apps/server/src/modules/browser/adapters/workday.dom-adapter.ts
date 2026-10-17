import type { Page, FrameLocator } from "playwright";
import type { ApplyAdapterInput, ApplyResult } from "../../application/adapters/apply-adapter.interface.js";
import type { DomAtsAdapter } from "../dom-adapter.interface.js";
import logger from "../../../core/logger/logger.js";
import formQuestionAiService from "../../ai/form-question-ai.service.js";
import candidateMapper from "../../agent/candidate/candidate.mapper.js";
import type { CandidateContext } from "../../agent/candidate/candidate.types.js";

export class WorkdayDomAdapter implements DomAtsAdapter {
  readonly name = "workday-dom";
  lastFillCount = 0;

  async detect(page: Page): Promise<boolean> {
    if (/myworkdayjobs\.com/i.test(page.url())) return true;
    try {
      const content = await page.content();
      return /workday|wd-[a-z]+|fSearch|gwt/i.test(content.slice(0, 15000));
    } catch {
      return false;
    }
  }

  async apply(page: Page, input: ApplyAdapterInput): Promise<ApplyResult> {
    this.lastFillCount = 0;
    const profile = (input.profile || {}) as CandidateContext;
    const maxSteps = 6;

    let scope: Page | FrameLocator = page;
    try {
      const iframeCount = await page.locator("iframe").count();
      if (iframeCount > 0) {
        const firstFrame = page.frameLocator("iframe").first();
        await firstFrame.getByRole("textbox").first().waitFor({ timeout: 2000 }).catch(() => {});
        scope = firstFrame;
        logger.debug("Workday switched to apply iframe");
      }
    } catch (err) {
      logger.debug("Workday iframe switch skipped (using page scope)", { error: err instanceof Error ? err.message : String(err) });
      scope = page;
    }

    for (let step = 0; step < maxSteps; step++) {
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      try {
        const scopeAny = scope as any;
        const inputs = await scopeAny.$$("input, select, textarea");
        for (const el of inputs) {
          try {
            const tag = await el.evaluate((e: any) => (e as HTMLElement).tagName?.toLowerCase() || "");
            const type = (await el.evaluate((e: any) => (e as HTMLInputElement).type)) || "text";
            const name = (await el.evaluate((e: any) => (e as HTMLInputElement).name)) || "";
            const id = (await el.evaluate((e: any) => (e as HTMLInputElement).id)) || "";
            const labelText = await this.extractLabelText(scope, el).catch(() => "");
            if (type === "submit" || type === "button" || type === "file") continue;
            const mapped = candidateMapper.resolve(name || id, labelText || name || id, profile);
            let value = mapped.value;
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
              await el.selectOption({ value }).catch(() => {});
            } else if (type === "checkbox" || type === "radio") {
              if (/true|yes|1|on/i.test(value)) {
                await el.check().catch(() => {});
              }
            } else if (tag === "textarea") {
              await el.fill(value).catch(() => {});
            } else {
              await el.fill(value).catch(() => {});
            }
            this.lastFillCount++;
          } catch (err) {
            logger.debug("WD field fill skipped", { error: err instanceof Error ? err.message : String(err) });
          }
        }
      } catch (err) {
        logger.debug("WD scope step inputs error", { step, error: err instanceof Error ? err.message : String(err) });
      }

      // Check for security challenge / CAPTCHA or Account Requirement
      const challengeInfo = await page.evaluate(() => {
        const selectors = [
          'iframe[src*="recaptcha"]',
          'iframe[src*="turnstile"]',
          'iframe[src*="challenges.cloudflare"]',
          'iframe[src*="hcaptcha"]',
          '.g-recaptcha',
          '.cf-turnstile',
          '#cf-challenge-running'
        ];
        const hasCaptcha = selectors.some((s) => !!document.querySelector(s));
        const body = (document.body.innerText || "").toLowerCase();
        const hasSignIn = body.includes("sign in") || body.includes("create account") || body.includes("autofill with resume");
        return { hasCaptcha, hasSignIn };
      }).catch(() => ({ hasCaptcha: false, hasSignIn: false }));

      if (challengeInfo.hasCaptcha) {
        return {
          success: false,
          requiresBrowserFallback: false,
          reason: "CAPTCHA or security challenge detected on Workday form; requires human intervention.",
        };
      }
      if (challengeInfo.hasSignIn) {
        return {
          success: false,
          requiresBrowserFallback: false,
          reason: "Workday portal requires candidate authentication / account sign-in; requires human intervention.",
        };
      }

      if (input.resume?.fileUrl || input.resume?.path || input.resumeBuffer) {
        try {
          const { default: resumeUploadTool } = await import("../../agent/tools/resume-upload.tool.js");
          await resumeUploadTool.upload(page, {
            fileUrl: input.resume?.fileUrl || input.resume?.path || "",
            originalName: input.resume?.originalName || "resume.pdf",
            buffer: input.resumeBuffer,
          });
        } catch (upErr: any) {
          logger.debug({ upErr }, "WorkdayDomAdapter file upload note");
        }
      }

      try {
        const nextBtn = scope.getByRole("button", { name: /submit|apply|next|continue|review|ok|save/i }).first();
        if (await nextBtn.isVisible().catch(() => false)) {
          await nextBtn.click().catch(() => {});
          await page.waitForLoadState("domcontentloaded").catch(() => page.waitForTimeout(2000));
          try {
            let bodyText = "";
            try {
              bodyText = (await scope.locator("body").innerText().catch(() => "")).toLowerCase();
            } catch {
              bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
            }
            if (/thank you|application.*submitted|successfully.*applied|confirmation/i.test(bodyText)) {
              const { default: verificationTool } = await import("../../agent/tools/submission-verification.tool.js");
              const verification = await verificationTool.verify(page);
              if (verification.verified) return { success: true, requiresBrowserFallback: false };
            }
          } catch {}
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    try {
      const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
      if (/thank you|application.*submitted|applied.*successfully/i.test(bodyText)) {
        const { default: verificationTool } = await import("../../agent/tools/submission-verification.tool.js");
        const verification = await verificationTool.verify(page);
        if (verification.verified) return { success: true, requiresBrowserFallback: false };
      }
    } catch {}
    return { success: false, requiresBrowserFallback: true, reason: `Workday DOM apply ${this.lastFillCount} fills; no final confirmation` };
  }

  private async extractLabelText(scope: Page | FrameLocator, el: any): Promise<string> {
    try {
      return await el.evaluate((element: any) => {
        const id = element.id;
        if (id) {
          const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
          if (label) return (label.textContent || "").trim();
        }
        const aria = element.getAttribute("aria-label");
        if (aria) return aria;
        const placeholder = element.getAttribute("placeholder");
        if (placeholder) return placeholder;
        let p = element.parentElement;
        let depth = 0;
        while (p && depth < 4) {
          if (p.tagName?.toLowerCase() === "label") return (p.textContent || "").trim();
          p = p.parentElement;
          depth++;
        }
        return "";
      });
    } catch {
      return "";
    }
  }
}

export default new WorkdayDomAdapter();
