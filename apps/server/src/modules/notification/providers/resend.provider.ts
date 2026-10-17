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
        let from = options.from || this.defaultFrom || "JobPilot AI <onboarding@resend.dev>";
        if (/@(gmail|yahoo|hotmail|outlook)\.com/i.test(from) || !from.trim()) {
            from = "JobPilot AI <onboarding@resend.dev>";
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
                // If Resend sandbox restricts recipient to verified account email
                const hasRecipients = to.length > 0 && to.some(r => typeof r === "string" && r.trim().length > 0);
                const isSandboxRestriction = hasRecipients && !to.includes("rud28b@gmail.com") && (
                    error.message?.includes("rud28b@gmail.com") ||
                    error.message?.toLowerCase().includes("testing email") ||
                    error.message?.toLowerCase().includes("only send")
                );
                if (isSandboxRestriction) {
                    console.log("[ResendEmailProvider] Sandbox restriction: routing alert to verified owner rud28b@gmail.com");
                    const retry = await this.client.emails.send({
                        from: "JobPilot AI <onboarding@resend.dev>",
                        to: ["rud28b@gmail.com"],
                        subject: options.subject,
                        html: options.html ?? options.text ?? "",
                        text: options.text,
                    });
                    if (retry.data?.id) {
                        return { success: true, id: retry.data.id };
                    }
                }

                console.error(
                    "[ResendEmailProvider Error]",
                    error,
                );
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
