export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    replyTo?: string;
}

export interface SendEmailResult {
    success: boolean;
    id?: string;
    error?: string;
}

export interface IEmailProvider {
    send(options: SendEmailOptions): Promise<SendEmailResult>;
}

import resendEmailProvider from "./resend.provider.js";

export const defaultEmailProvider: IEmailProvider = resendEmailProvider;
export default defaultEmailProvider;
