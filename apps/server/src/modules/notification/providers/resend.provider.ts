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
            process.env.EMAIL_FROM ||
            "JobPilot <notifications@resend.dev>";

        if (apiKey) {
            this.client = new Resend(apiKey);
        } else {
            console.warn(
                "[ResendEmailProvider] RESEND_API_KEY is not configured. Email sending will run in mock/log mode.",
            );
        }
    }

    async send(
        options: SendEmailOptions,
    ): Promise<SendEmailResult> {
        const from = options.from || this.defaultFrom;
        const to = Array.isArray(options.to)
            ? options.to
            : [options.to];

        if (!this.client) {
            console.log(
                "[ResendEmailProvider Mock Send]",
                {
                    from,
                    to,
                    subject: options.subject,
                    text: options.text,
                    html: options.html,
                },
            );

            return {
                success: true,
                id: `mock-${Date.now()}`,
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
