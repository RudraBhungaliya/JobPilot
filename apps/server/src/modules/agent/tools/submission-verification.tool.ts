import type { Page } from "playwright";

export interface SubmissionVerificationResult {
  verified: boolean;
  reason: string;
  confirmationUrl: string;
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
        return {
          verified: true,
          reason:
            "Application confirmation detected.",
          confirmationUrl,
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
      "your application was submitted",
      "your application has been received",
      "successfully submitted",
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
      "invalid",
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
}

export default new SubmissionVerificationTool();