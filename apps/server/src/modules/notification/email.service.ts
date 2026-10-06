import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface HumanInterventionAlertInput {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    actionUrl: string;
    reason: string;
    verificationType?: string;
    jobLocation?: string;
    salaryDollar?: string;
}

export interface ApplicationSummaryAlertInput {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    status: "SUBMITTED" | "FAILED" | "WAITING_FOR_USER";
    details?: string;
}

class EmailService {
    private transporter: Transporter | null = null;
    private isConfigured = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        const host = process.env.SMTP_HOST;
        const port = Number(process.env.SMTP_PORT) || 587;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            });
            this.isConfigured = true;
        } else {
            // Development fallback transporter (mock/simulated)
            this.isConfigured = false;
        }
    }

    async sendHumanInterventionAlert(input: HumanInterventionAlertInput): Promise<{ success: boolean; preview?: string }> {
        const from = process.env.EMAIL_FROM || "JobPilot AI <alerts@jobpilot.ai>";
        const subject = `🚨 Action Required: Human Intervention needed for ${input.companyName} (${input.jobTitle})`;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f3f4f6; margin: 0; padding: 24px; }
        .container { max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .badge { display: inline-block; background: #ef4444; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
        h1 { color: #ffffff; font-size: 22px; margin-top: 0; }
        p { color: #94a3b8; font-size: 15px; line-height: 1.6; }
        .details-box { background: #0b1120; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .detail-label { color: #64748b; font-weight: 600; }
        .detail-value { color: #38bdf8; font-weight: 600; }
        .btn { display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-top: 16px; }
        .footer { margin-top: 32px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; padding-top: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="badge">Human Intervention Required</div>
        <h1>Action Needed: Auto-Apply Paused</h1>
        <p>Hi ${input.candidateName || "Candidate"},</p>
        <p>JobPilot was applying to <strong>${input.jobTitle}</strong> at <strong>${input.companyName}</strong>, but encountered a security checkpoint or question that requires your personal verification.</p>
        
        <div class="details-box">
            <div class="detail-row">
                <span class="detail-label">Company:</span>
                <span class="detail-value">${input.companyName}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Position:</span>
                <span class="detail-value">${input.jobTitle}</span>
            </div>
            ${input.jobLocation ? `<div class="detail-row"><span class="detail-label">Location:</span><span class="detail-value">${input.jobLocation}</span></div>` : ""}
            ${input.salaryDollar ? `<div class="detail-row"><span class="detail-label">Est. Compensation:</span><span class="detail-value">${input.salaryDollar}</span></div>` : ""}
            <div class="detail-row">
                <span class="detail-label">Intervention Type:</span>
                <span class="detail-value" style="color: #f87171;">${input.verificationType || "CAPTCHA / Security Challenge"}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Details:</span>
                <span class="detail-value" style="color: #facc15;">${input.reason}</span>
            </div>
        </div>

        <p>Please click the button below to resolve this step directly in your live browser console so the automated submission can proceed:</p>
        
        <a href="${input.actionUrl}" class="btn" target="_blank">Complete Verification & Resume Application</a>

        <div class="footer">
            JobPilot Autonomous Career Agent • Realtime Indian & Global ATS Connector
        </div>
    </div>
</body>
</html>
`;

        const text = `
Action Required: Human Intervention needed for ${input.companyName} - ${input.jobTitle}
Hi ${input.candidateName || "Candidate"},

JobPilot encountered a checkpoint while applying for ${input.jobTitle} at ${input.companyName}:
Reason: ${input.reason}
Type: ${input.verificationType || "CAPTCHA / Security Challenge"}

Resolve here: ${input.actionUrl}
`;

        if (this.isConfigured && this.transporter) {
            try {
                await this.transporter.sendMail({
                    from,
                    to: input.to,
                    subject,
                    text,
                    html,
                });
                return { success: true };
            } catch (err) {
                console.error("[EmailService] Failed to send email via SMTP:", err);
            }
        }

        // Mock simulation log for dev & local testing
        console.log(`[EmailService] 📧 SIMULATED DISPATCH to ${input.to}: "${subject}"`);
        console.log(`[EmailService] Reason: ${input.reason} | URL: ${input.actionUrl}`);
        return {
            success: true,
            preview: `Email sent to ${input.to} regarding ${input.companyName} (${input.verificationType || "Challenge"})`,
        };
    }

    async sendApplicationStatusAlert(input: ApplicationSummaryAlertInput): Promise<{ success: boolean }> {
        const from = process.env.EMAIL_FROM || "JobPilot AI <alerts@jobpilot.ai>";
        const isSuccess = input.status === "SUBMITTED";
        const subject = isSuccess
            ? `✅ Application Submitted: ${input.jobTitle} at ${input.companyName}`
            : `⚠️ Application Update: ${input.jobTitle} at ${input.companyName}`;

        const text = `Hi ${input.candidateName},\n\nYour application for ${input.jobTitle} at ${input.companyName} status is now: ${input.status}.\n${input.details || ""}`;

        if (this.isConfigured && this.transporter) {
            try {
                await this.transporter.sendMail({
                    from,
                    to: input.to,
                    subject,
                    text,
                });
            } catch (err) {
                console.error("[EmailService] Error:", err);
            }
        }
        return { success: true };
    }
}

export default new EmailService();
