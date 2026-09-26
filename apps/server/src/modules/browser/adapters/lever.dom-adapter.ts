import type { Page } from "playwright";
import type { ApplyAdapterInput, ApplyResult } from "../../application/adapters/apply-adapter.interface.js";
import type { DomAtsAdapter } from "../dom-adapter.interface.js";
import logger from "../../../core/logger/logger.js";
import formQuestionAiService from "../../ai/form-question-ai.service.js";
import candidateMapper from "../../agent/candidate/candidate.mapper.js";
import type { CandidateContext } from "../../agent/candidate/candidate.types.js";

export class LeverDomAdapter implements DomAtsAdapter {
  readonly name = "lever-dom";
  lastFillCount = 0;

  async detect(page: Page): Promise<boolean> {
    if (/jobs\.lever\.co/i.test(page.url())) return true;
    try {
      const content = await page.content();
      return /lever|lever-embed|postings-lever/i.test(content.slice(0, 10000));
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
      const inputs = await page.$$("input, select, textarea");
      for (const el of inputs) {
        try {
          const tag = await el.evaluate((e) => e.tagName.toLowerCase());
          const type = (await el.evaluate((e) => (e as HTMLInputElement).type)) || "text";
          const name = (await el.evaluate((e) => (e as HTMLInputElement).name)) || "";
          const id = (await el.evaluate((e) => (e as HTMLInputElement).id)) || "";
          const labelText = await this.extractLabelText(page, el).catch(() => "");
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
          logger.debug("Lever field fill skipped", { error: err instanceof Error ? err.message : String(err) });
        }
      }

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

      const submitBtn = page.locator('button, input[type="submit"]').filter({ hasText: /submit|apply|send/i }).first();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click().catch(() => {});
        await page.waitForLoadState("domcontentloaded").catch(() => page.waitForTimeout(1500));
        try {
          const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
          if (/thanks for applying|thank you.*apply|application.*submitted|we have received your application/i.test(bodyText) || /apply\/thanks/.test(page.url())) {
            return { success: true, requiresBrowserFallback: false, confirmationId: `lever-dom-${Date.now()}` };
          }
        } catch {}
      } else {
        break;
      }
    }

    try {
      const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
      if (/thanks for applying|thank you.*apply|application.*submitted/i.test(bodyText) || /apply\/thanks/.test(page.url())) {
        return { success: true, requiresBrowserFallback: false, confirmationId: `lever-dom-${Date.now()}` };
      }
    } catch {}

    return { success: false, requiresBrowserFallback: true, reason: `Lever DOM apply ${this.lastFillCount} fills; no final confirmation` };
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

export default new LeverDomAdapter();
