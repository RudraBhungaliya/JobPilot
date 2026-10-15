import type { Page } from "playwright";
import type { ApplyAdapterInput, ApplyResult } from "../../application/adapters/apply-adapter.interface.js";
import type { DomAtsAdapter } from "../dom-adapter.interface.js";
import logger from "../../../core/logger/logger.js";
import formQuestionAiService from "../../ai/form-question-ai.service.js";
import candidateMapper from "../../agent/candidate/candidate.mapper.js";
import type { CandidateContext } from "../../agent/candidate/candidate.types.js";

export class AshbyDomAdapter implements DomAtsAdapter {
  readonly name = "ashby-dom";
  lastFillCount = 0;

  async detect(page: Page): Promise<boolean> {
    const url = page.url();
    if (/ashbyhq\.com/i.test(url)) return true;
    try {
      const content = await page.content();
      return /ashby|ashbyhq|ashby-application-form|_ashby/i.test(content.slice(0, 10000));
    } catch {
      return false;
    }
  }

  async apply(page: Page, input: ApplyAdapterInput): Promise<ApplyResult> {
    this.lastFillCount = 0;
    const profile = (input.profile || {}) as CandidateContext;
    const maxSteps = 5;

    for (let step = 0; step < maxSteps; step++) {
      await page.waitForLoadState("domcontentloaded").catch(() => {});

      // Reveal form if hidden behind "Apply for this job" / "Apply Now"
      try {
        const applyBtn = page.locator('button:has-text("Apply for this job"), button:has-text("Apply Now"), a[href*="application"]').first();
        if (await applyBtn.isVisible().catch(() => false)) {
          await applyBtn.click().catch(() => {});
          await page.waitForTimeout(500);
        }
      } catch {}

      const inputs = await page.$$("input, select, textarea");

      for (const el of inputs) {
        try {
          const tag = await el.evaluate((e) => e.tagName.toLowerCase());
          const type = (await el.evaluate((e) => (e as HTMLInputElement).type)) || "text";
          const name = (await el.evaluate((e) => (e as HTMLInputElement).name)) || "";
          const id = (await el.evaluate((e) => (e as HTMLInputElement).id)) || "";
          const labelText = await this.extractLabelText(page, el).catch(() => "");

          if (type === "submit" || type === "button" || type === "file") continue;
          if (/submit|continue|next|review|apply/i.test((await el.evaluate((e) => (e as HTMLInputElement).value)) || "")) continue;

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
            await el.selectOption({ value }).catch(() => el.selectOption({ label: value }).catch(() => {}));
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
          logger.debug("Ashby field fill skipped", { error: err instanceof Error ? err.message : String(err) });
        }
      }

      // Check for security challenges / CAPTCHA
      const captchaPresent = await page.evaluate(() => {
        const selectors = [
          'iframe[src*="recaptcha"]',
          'iframe[src*="turnstile"]',
          'iframe[src*="challenges.cloudflare"]',
          'iframe[src*="hcaptcha"]',
          '.g-recaptcha',
          '.cf-turnstile',
          '#cf-challenge-running'
        ];
        return selectors.some((s) => !!document.querySelector(s));
      }).catch(() => false);

      if (captchaPresent) {
        return {
          success: false,
          requiresBrowserFallback: false,
          reason: "CAPTCHA or Cloudflare Turnstile challenge detected on Ashby form; requires human intervention.",
        };
      }

      // Resume Upload
      if (input.resumeBuffer) {
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.isVisible().catch(() => false)) {
          try {
            await fileInput.setInputFiles({
              name: input.resume?.originalName || "resume.pdf",
              mimeType: input.resumeContentType || "application/pdf",
              buffer: Buffer.from(input.resumeBuffer),
            });
          } catch {}
        }
      }

      // Next / Submit step
      const nextBtn = page.getByRole("button", { name: /submit|apply|next|continue|review/i }).first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click().catch(() => {});
        await page.waitForLoadState("domcontentloaded").catch(() => page.waitForTimeout(2000));
        try {
          const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
          if (/thank you|application submitted|application received|we have received your application|confirmation/i.test(bodyText)) {
            const { default: verificationTool } = await import("../../agent/tools/submission-verification.tool.js");
            const verification = await verificationTool.verify(page);
            if (!verification.verified) continue;

            const confirmationMatch = bodyText.match(/(?:confirmation|application|reference)\s*(?:#|id|number|code)?\s*[:\-]?\s*([a-z0-9\-_]{5,32})/i);
            const confirmationId = confirmationMatch ? confirmationMatch[1] : undefined;

            return {
              success: true,
              requiresBrowserFallback: false,
              confirmationId,
            };
          }
        } catch {}
      } else {
        break;
      }
    }

    try {
      const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
      if (/thank you|application submitted|application received|we have received your application/i.test(bodyText)) {
        const { default: verificationTool } = await import("../../agent/tools/submission-verification.tool.js");
        const verification = await verificationTool.verify(page);
        if (!verification.verified) throw new Error(verification.reason);
        const confirmationMatch = bodyText.match(/(?:confirmation|application|reference)\s*(?:#|id|number|code)?\s*[:\-]?\s*([a-z0-9\-_]{5,32})/i);
        const confirmationId = confirmationMatch ? confirmationMatch[1] : undefined;
        return { success: true, requiresBrowserFallback: false, confirmationId };
      }
      if (/already applied|you have already applied/i.test(bodyText)) {
        return { success: false, requiresBrowserFallback: false, reason: "Already applied to this opening." };
      }
    } catch {}

    return {
      success: false,
      requiresBrowserFallback: true,
      reason: `Ashby DOM apply ${this.lastFillCount} fills; awaiting user review or unverified final confirmation.`,
    };
  }

  private async extractLabelText(page: Page, el: any): Promise<string> {
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
      while (p && depth < 3) {
        if (p.tagName?.toLowerCase() === "label") return (p.textContent || "").trim();
        p = p.parentElement;
        depth++;
      }
      return "";
    });
  }
}

export const ashbyDomAdapter = new AshbyDomAdapter();
export default ashbyDomAdapter;
