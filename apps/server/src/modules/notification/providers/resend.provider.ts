import { Resend } from "resend";

import type {
    IEmailProvider,
    SendEmailOptions,
    SendEmailResult,
} from "./email.provider.js";

export class ResendEmailProvider implements IEmailProvider {
    private client: Resend | null = null;
    private defaultFrom: string;

    constructor() {
        const apiKey = process.env.RESEND_API_KEY;
        this.defaultFrom =
            process.env.RESEND_FROM_EMAIL ||
            process.env.EMAIL_FROM || "";

        if (apiKey && apiKey !== "YOUR_RESEND_API_KEY" && apiKey.startsWith("re_")) {
            this.client = new Resend(apiKey);
        } else {
            console.warn(
                "[ResendEmailProvider] RESEND_API_KEY is not configured; email sending is disabled.",
            );
        }
    }

    async send(
        options: SendEmailOptions,
    ): Promise<SendEmailResult> {
        let from = options.from || this.defaultFrom || "JobPilot <onboarding@resend.dev>";
        if (/@(gmail|yahoo|hotmail|outlook)\.com/i.test(from) || !from.trim()) {
            from = "JobPilot <onboarding@resend.dev>";
        }

        const to = Array.isArray(options.to)
            ? options.to
            : [options.to];

        const apiKey = process.env.RESEND_API_KEY;
        if (!this.client && apiKey && apiKey !== "YOUR_RESEND_API_KEY" && apiKey.startsWith("re_")) {
            this.client = new Resend(apiKey);
        }

        if (!this.client) {
            return {
                success: false,
                error: "Email provider is not configured.",
            };
        }

        try {
            const { data, error } =
                await this.client.emails.send({
                    from,
                    to,
                    subject: options.subject,
                    html: options.html ?? options.text ?? "",
                    text: options.text,
                    replyTo: options.replyTo,
                });

            if (error) {
                const isProduction = process.env.NODE_ENV === "production";
                const sandboxRedirect = process.env.RESEND_SANDBOX_REDIRECT_EMAIL?.trim();
                const hasRecipients = to.length > 0 && to.some(r => typeof r === "string" && r.trim().length > 0);

                const isSandboxRestriction = (
                    error.message?.toLowerCase().includes("testing email") ||
                    error.message?.toLowerCase().includes("only send") ||
                    error.message?.toLowerCase().includes("verify a domain")
                );

                // In Production: Strict domain verification requirement. Never redirect production candidate emails.
                if (isProduction) {
                    if (isSandboxRestriction) {
                        console.error(
                            "[ResendEmailProvider Production Notice] Email delivery blocked: sending domain is unverified. " +
                            "Verify your custom sending domain at resend.com/domains before sending candidate emails in production."
                        );
                    } else {
                        console.error("[ResendEmailProvider Error]", error);
                    }
                    return {
                        success: false,
                        error: isSandboxRestriction
                            ? `Production email sending blocked: Sending domain is unverified. Verify domain at resend.com/domains. (${error.message})`
                            : error.message,
                    };
                }

                // In Development: Explicit sandbox routing ONLY when RESEND_SANDBOX_REDIRECT_EMAIL is configured
                if (isSandboxRestriction && hasRecipients && Boolean(sandboxRedirect)) {
                    // Extract authorized account email from Resend message if present
                    const match = error.message?.match(/own email address \(([^)]+)\)/i);
                    const targetSandbox = match ? match[1].trim() : sandboxRedirect!;

                    if (targetSandbox && !to.includes(targetSandbox)) {
                        console.warn(
                            `[ResendEmailProvider] Development sandbox routing: explicitly redirecting alert from [${to.join(", ")}] to authorized development recipient [${targetSandbox}]`
                        );

                        const retry = await this.client.emails.send({
                            from: "JobPilot <onboarding@resend.dev>",
                            to: [targetSandbox],
                            subject: `[DEV SANDBOX -> ${targetSandbox} | Intended: ${to.join(", ")}] ${options.subject}`,
                            html: options.html ?? options.text ?? "",
                            text: options.text,
                        });

                        if (retry.data?.id) {
                            return { success: true, id: retry.data.id };
                        }

                        if (retry.error) {
                            console.error("[ResendEmailProvider Sandbox Retry Error]", retry.error);
                            return {
                                success: false,
                                error: retry.error.message,
                            };
                        }
                    }
                }

                console.error("[ResendEmailProvider Error]", error);
                return {
                    success: false,
                    error: error.message,
                };
            }

            return {
                success: true,
                id: data?.id,
            };
        } catch (err: any) {
            console.error(
                "[ResendEmailProvider Exception]",
                err,
            );
            return {
                success: false,
                error:
                    err.message ||
                    "Unknown error sending email via Resend",
            };
        }
    }
}

export const resendEmailProvider = new ResendEmailProvider();
export default resendEmailProvider;
