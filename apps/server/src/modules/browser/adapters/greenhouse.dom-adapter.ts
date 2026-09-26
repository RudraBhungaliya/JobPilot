import type { Page } from "playwright";
import type { ApplyAdapterInput, ApplyResult } from "../../application/adapters/apply-adapter.interface.js";
import type { DomAtsAdapter } from "../dom-adapter.interface.js";
import logger from "../../../core/logger/logger.js";
import formQuestionAiService from "../../ai/form-question-ai.service.js";
import candidateMapper from "../../agent/candidate/candidate.mapper.js";
import type { CandidateContext } from "../../agent/candidate/candidate.types.js";

export class GreenhouseDomAdapter implements DomAtsAdapter {
  readonly name = "greenhouse-dom";
  lastFillCount = 0;

  async detect(page: Page): Promise<boolean> {
    const url = page.url();
    if (/greenhouse\.io/i.test(url)) return true;
    try {
      const content = await page.content();
      return /greenhouse|gh-embed|boards\.greenhouse/i.test(content.slice(0, 10000));
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
      let stepFillCount = 0;

      for (const el of inputs) {
        try {
          const tag = await el.evaluate((e) => e.tagName.toLowerCase());
          const type = (await el.evaluate((e) => (e as HTMLInputElement).type)) || "text";
          const name = (await el.evaluate((e) => (e as HTMLInputElement).name)) || "";
          const id = (await el.evaluate((e) => (e as HTMLInputElement).id)) || "";
          const labelText = await this.extractLabelText(page, el).catch(() => "");

          if (type === "submit" || type === "button" || type === "file") continue;
          if (/submit|continue|next|review/i.test((await el.evaluate((e) => (e as HTMLInputElement).value)) || "")) continue;

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
          stepFillCount++;
        } catch (err) {
          logger.debug("GH field fill skipped", { error: err instanceof Error ? err.message : String(err) });
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

      const nextBtn = page.getByRole("button", { name: /submit|apply|next|continue|review/i }).first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click().catch(() => {});
        await page.waitForLoadState("domcontentloaded").catch(() => page.waitForTimeout(1500));
        try {
          const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
          if (/thank you|application submitted|confirmation|success/i.test(bodyText)) {
            return {
              success: true,
              requiresBrowserFallback: false,
              confirmationId: `gh-dom-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            };
          }
        } catch {}
      } else {
        break;
      }
    }

    try {
      const bodyText = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
      if (/thank you|application submitted|application received|confirmation/i.test(bodyText)) {
        return { success: true, requiresBrowserFallback: false, confirmationId: `gh-dom-${Date.now()}` };
      }
      if (/already applied|you have already applied/i.test(bodyText)) {
        return { success: false, requiresBrowserFallback: false, reason: "already applied" };
      }
    } catch {}

    return { success: false, requiresBrowserFallback: true, reason: `GH DOM apply completed ${this.lastFillCount} fills but final step not confirmed` };
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

export default new GreenhouseDomAdapter();
