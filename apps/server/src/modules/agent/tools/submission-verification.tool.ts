import type { Page } from "playwright";

export interface SubmissionVerificationResult {
  verified: boolean;
  reason: string;
  confirmationUrl: string;
  confirmationId?: string;
}

class SubmissionVerificationTool {
  async verify(
    page: Page,
  ): Promise<SubmissionVerificationResult> {
    const confirmationUrl = page.url();

    const successSelectors = [
      '[role="alert"]',
      '[role="status"]',
      ".success",
      ".confirmation",
      ".application-success",
      "[data-testid*='success']",
      "[data-testid*='confirmation']",
    ];

    for (const selector of successSelectors) {
      const locator = page.locator(selector);

      if ((await locator.count()) === 0) {
        continue;
      }

      const text = (
        await locator.first().textContent()
      )
        ?.trim()
        .toLowerCase();

      if (
        text &&
        (
          text.includes("success") ||
          text.includes("submitted") ||
          text.includes("application received") ||
          text.includes("thank you") ||
          text.includes("confirmation")
        )
      ) {
        const confirmationId = await this.extractConfirmationId(page, text);
        return {
          verified: true,
          reason:
            "Application confirmation detected.",
          confirmationUrl,
          confirmationId,
        };
      }
    }

    const bodyText = (
      await page.locator("body").innerText()
    ).toLowerCase();

    const successMessages = [
      "application submitted",
      "application received",
      "application has been submitted",
      "thank you for applying",
      "thanks for applying",
      "thanks for your application",
      "thank you for your application",
      "we've received your application",
      "we have received your application",
      "we received your application",
      "your application was submitted",
      "your application has been received",
      "successfully submitted",
      "application complete",
      "you applied to",
    ];

    const matchedSuccessMessage =
      successMessages.find((message) =>
        bodyText.includes(message),
      );

    if (matchedSuccessMessage) {
      return {
        verified: true,
        reason: `Confirmation text detected: "${matchedSuccessMessage}".`,
        confirmationUrl,
        confirmationId: this.extractConfirmationIdFromText(bodyText) || this.extractConfirmationIdFromUrl(confirmationUrl),
      };
    }

    if (/\/(thanks|thank-you|confirmation|success|submitted|complete)(\/|\?|$)/i.test(confirmationUrl)) {
      return {
        verified: true,
        reason: "Employer confirmation URL detected after submit.",
        confirmationUrl,
        confirmationId: this.extractConfirmationIdFromUrl(confirmationUrl),
      };
    }

    const alreadyAppliedMessages = [
      "already applied",
      "you have already applied",
      "application already exists",
      "you have submitted an application",
      "already submitted an application",
      "previously applied",
    ];

    const matchedAlreadyApplied = alreadyAppliedMessages.find((message) => bodyText.includes(message));

    if (matchedAlreadyApplied) {
      return {
        verified: false,
        reason: "already applied",
        confirmationUrl,
      };
    }

    const errorMessages = [
      "required field",
      "this field is required",
      "please correct",
      "something went wrong",
      "application failed",
      "unable to submit",
      "could not submit",
      "error submitting",
    ];

    const matchedErrorMessage =
      errorMessages.find((message) =>
        bodyText.includes(message),
      );

    if (matchedErrorMessage) {
      return {
        verified: false,
        reason: `Submission error detected: "${matchedErrorMessage}".`,
        confirmationUrl,
      };
    }

    return {
      verified: false,
      reason:
        "Application submission could not be verified.",
      confirmationUrl,
    };
  }

  private async extractConfirmationId(page: Page, seedText: string): Promise<string | undefined> {
    const fromText = this.extractConfirmationIdFromText(seedText);
    if (fromText) return fromText;
    const body = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
    return this.extractConfirmationIdFromText(body) || this.extractConfirmationIdFromUrl(page.url());
  }

  extractConfirmationIdFromText(text: string): string | undefined {
    const confirmationMatch = text.match(
      /(?:confirmation|application|reference)\s*(?:#|id|number|code)?\s*[:\-]?\s*([a-z0-9\-_]{5,32})/i,
    );
    return confirmationMatch?.[1];
  }

  extractConfirmationIdFromUrl(url: string): string | undefined {
    try {
      const parsed = new URL(url);
      const keys = ["confirmation", "confirmationId", "applicationId", "ref", "reference"];
      for (const key of keys) {
        const value = parsed.searchParams.get(key);
        if (value && value.length >= 5) return value;
      }
    } catch {
      // ignore
    }
    return undefined;
  }
}

export default new SubmissionVerificationTool();
