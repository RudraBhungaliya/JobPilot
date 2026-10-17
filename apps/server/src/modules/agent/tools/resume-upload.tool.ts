import type { Page } from "playwright";

interface ResumeUploadInput {
  fileUrl: string;
  originalName: string;
  buffer?: Uint8Array;
  contentType?: string;
}

class ResumeUploadTool {
  private _locatorFactory: ((page: Page, sel: string) => any) | null = null;

  _setLocatorFactory(fn: (page: Page, sel: string) => any): void {
    this._locatorFactory = fn;
  }

  private _locator(page: Page, sel: string) {
    return this._locatorFactory ? this._locatorFactory(page, sel) : page.locator(sel);
  }

  async upload(page: Page, resume: ResumeUploadInput): Promise<void> {
    const maxAttempts = 2;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const inputs = this._locator(page, 'input[type="file"]');
        const count = await inputs.count();
        if (count === 0) {
          // Try clicking upload button first
          const uploadBtn = this._locator(page, 'button, [role="button"], a').filter({ hasText: /upload|browse|choose.*file|select.*file|attach.*resume/i });
          if (await uploadBtn.first().isVisible().catch(() => false)) {
            await uploadBtn.first().click().catch(() => {});
            await page.waitForTimeout(500);
          }
          const count2 = await this._locator(page, 'input[type="file"]').count();
          if (count2 === 0) {
            throw new Error("Resume upload field not found.");
          }
        }

        if (!resume.fileUrl && !resume.buffer) {
          throw new Error("Resume file URL or buffer is missing.");
        }

        let uploadPayload: any = null;

        if (resume.buffer) {
          uploadPayload = {
            name: resume.originalName || "resume.pdf",
            mimeType: resume.contentType || "application/pdf",
            buffer: Buffer.from(resume.buffer),
          };
        } else if (resume.fileUrl) {
          const { existsSync, readFileSync } = await import("node:fs");
          if (existsSync(resume.fileUrl)) {
            uploadPayload = resume.fileUrl;
          } else if (/^https?:\/\//i.test(resume.fileUrl)) {
            try {
              const res = await fetch(resume.fileUrl);
              if (res.ok) {
                const arrBuf = await res.arrayBuffer();
                uploadPayload = {
                  name: resume.originalName || "resume.pdf",
                  mimeType: resume.contentType || "application/pdf",
                  buffer: Buffer.from(arrBuf),
                };
              }
            } catch {
              // Remote file fetch error
            }
          }

          if (!uploadPayload) {
            throw new Error(`Genuine resume file is missing or unreadable (${resume.originalName || "resume file"}). Please attach a valid PDF or DOCX resume before submitting.`);
          }
        }

        if (uploadPayload) {
          await inputs.first().setInputFiles(uploadPayload);
        }
        return;
      } catch (err: any) {
        lastError = err;
        if (err.message && err.message.includes("Genuine resume file is missing")) {
          throw err;
        }
        if (attempt < maxAttempts - 1 && typeof page.waitForTimeout === "function") {
          await page.waitForTimeout(500);
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Resume upload failed.");
  }
}

export default new ResumeUploadTool();
