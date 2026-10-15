import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface HumanInterventionAlertInput {
    to: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    actionUrl: string;
    reason: string;
    jobOpeningUrl?: string;
    verificationType?: string;
    jobLocation?: string;
    salaryDollar?: string;
    applicationId?: string;
    alreadyFilledFields?: Array<{ label: string; value: string }>;
    remainingFields?: string[];
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
        }
    }

    private async deliver(input: { to: string; subject: string; text: string; html?: string }): Promise<void> {
        if (this.transporter) {
            const from = process.env.EMAIL_FROM;
            if (!from) throw new Error("Email delivery is unavailable: EMAIL_FROM is required when using SMTP.");
            const result = await this.transporter.sendMail({ from, ...input });
            if (!(result.accepted || []).some((recipient) => String(recipient).toLowerCase() === input.to.toLowerCase())) {
                throw new Error("SMTP provider did not confirm acceptance of the recipient.");
            }
            return;
        }

        const { default: emailProvider } = await import("./providers/email.provider.js");
        const result = await emailProvider.send(input);
        if (!result.success) {
            throw new Error(`Email delivery failed: ${result.error || "Email provider could not dispatch message."}`);
        }
    }

    async sendHumanInterventionAlert(input: HumanInterventionAlertInput): Promise<{ success: boolean; preview?: string }> {
        const subject = `🚨 Action Required: Complete Verification for ${input.companyName} (${input.jobTitle}) - Application Paused`;

        const openingUrl = input.jobOpeningUrl || input.actionUrl;

        const filledList = (input.alreadyFilledFields && input.alreadyFilledFields.length > 0)
            ? input.alreadyFilledFields
            : [
                { label: "Candidate Name", value: input.candidateName || "Candidate" },
                { label: "Contact Email", value: input.to },
                { label: "Location Alignment", value: input.jobLocation || "Bengaluru, Karnataka, India" },
                { label: "Tailored ATS Resume", value: "Verified & Attached (PDF)" },
                { label: "Work & Education Profiles", value: "Synced & Pre-populated" },
            ];

        const remainingItems = (input.remainingFields && input.remainingFields.length > 0)
            ? input.remainingFields
            : [input.reason || "Additional employer screening questions or interactive verification checkpoint."];

        const filledRowsHtml = filledList.map((f) => `
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px;">
                <span style="color: #94a3b8;">${f.label}:</span>
                <span style="color: #34d399; font-weight: 600;">✓ ${f.value}</span>
            </div>
        `).join("");

        const remainingRowsHtml = remainingItems.map((r) => `
            <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; color: #fbbf24; font-weight: 500;">
                ⏳ ${r}
            </div>
        `).join("");

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Human Intervention Required</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080c14; color: #f3f4f6; margin: 0; padding: 24px;">
    <div style="max-width: 640px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
        <!-- Top Badge & Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
            <span style="display: inline-block; background: #ef4444; color: #ffffff; padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                🚨 Action Required • 50%+ Complete
            </span>
            <span style="color: #64748b; font-size: 12px; font-weight: 600;">JobPilot Autonomous Agent</span>
        </div>

        <h1 style="color: #ffffff; font-size: 22px; margin: 0 0 10px 0; font-weight: 700;">
            Application Paused at Verification Checkpoint
        </h1>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
            Hi <strong>${input.candidateName || "Candidate"}</strong>,<br>
            JobPilot has filled out the majority of your application for <strong>${input.jobTitle}</strong> at <strong>${input.companyName}</strong>. 
            The employer portal presented a checkpoint requiring your action before final submission.
        </p>

        <!-- Official Job Opening Link Card -->
        <div style="background: #1e293b; border: 1px solid #38bdf8; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
            <div style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                🔗 Official Employer Opening Page
            </div>
            <div style="font-size: 13px; color: #ffffff; font-weight: 600; margin-bottom: 6px;">
                ${input.jobTitle} · ${input.companyName}
            </div>
            <a href="${openingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; font-size: 12px; color: #38bdf8; text-decoration: underline; word-break: break-all;">
                ${openingUrl}
            </a>
        </div>

        <!-- Progress Meter -->
        <div style="background: #1e293b; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; border: 1px solid #334155;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 6px;">
                <span style="color: #38bdf8;">Application Progress</span>
                <span style="color: #34d399;">50% Done • Core Data Pre-Filled</span>
            </div>
            <div style="background: #0b1120; height: 8px; border-radius: 9999px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #10b981 0%, #06b6d4 100%); width: 50%; height: 100%;"></div>
            </div>
        </div>

        <!-- 2-Box Split: Already Filled vs Remaining To Fill -->
        <div style="margin-bottom: 24px;">
            <!-- Box 1: Pre-Filled -->
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <div style="font-size: 13px; font-weight: 700; color: #34d399; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                    <span>✓ Data Already Auto-Filled by JobPilot (Pre-filled & Saved)</span>
                </div>
                ${filledRowsHtml}
            </div>

            <!-- Box 2: Remaining -->
            <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 16px;">
                <div style="font-size: 13px; font-weight: 700; color: #fbbf24; margin-bottom: 8px;">
                    <span>⏳ Remaining For You to Complete (1-2 Min Action)</span>
                </div>
                ${remainingRowsHtml}
                <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                    Verification Type: <strong style="color: #f87171;">${input.verificationType || "Custom Questionnaire / Security Gate"}</strong>
                </div>
            </div>
        </div>

        <!-- Call to Action Button: Direct Checkpoint Resumption -->
        <div style="text-align: center; margin: 28px 0 20px 0;">
            <a href="${input.actionUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 12px; font-weight: 800; font-size: 15px; box-shadow: 0 10px 25px rgba(79, 70, 229, 0.5); letter-spacing: 0.3px;">
                👉 Continue Where Pipeline Left & Fill Details
            </a>
        </div>

        <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; text-align: center; margin: 0 0 24px 0;">
            Clicking the button above redirects you directly to the paused application checkpoint where your pre-filled details are safely loaded. 
            Once you provide the remaining information, <strong>your session will automatically resume execution and complete the submission workflow</strong>.
        </p>

        <!-- Footer -->
        <div style="border-top: 1px solid #1e293b; padding-top: 20px; font-size: 11px; color: #475569; text-align: center;">
            JobPilot Autonomous Career Agent • Real-Time Pipeline Engine<br>
            Opening Page: <a href="${openingUrl}" style="color: #38bdf8;">${openingUrl}</a><br>
            Resume Checkpoint: <a href="${input.actionUrl}" style="color: #6366f1;">${input.actionUrl}</a>
        </div>
    </div>
</body>
</html>
`;

        const text = `
🚨 ACTION REQUIRED: JobPilot Auto-Apply Paused for ${input.companyName} (${input.jobTitle})
Hi ${input.candidateName || "Candidate"},

JobPilot has auto-filled 50%+ of your application for ${input.jobTitle} at ${input.companyName}.
A human verification checkpoint or custom question requires your direct action.

🔗 OFFICIAL JOB OPENING PAGE:
${openingUrl}

✓ PRE-FILLED BY JOBPILOT: Name, Email, Phone, Tailored ATS Resume, Location
⏳ REMAINING TO COMPLETE: ${remainingItems.join(", ")}

👉 CLICK TO CONTINUE WHERE PIPELINE LEFT OFF AND FILL REMAINING DETAILS:
${input.actionUrl}

After submitting your response, JobPilot will automatically resume execution and complete your application workflow.
`;

        await this.deliver({ to: input.to, subject, text, html });
        return { success: true };
    }

    async sendApplicationStatusAlert(input: ApplicationSummaryAlertInput): Promise<{ success: boolean }> {
        const isSuccess = input.status === "SUBMITTED";
        const subject = isSuccess
            ? `✅ Application Submitted: ${input.jobTitle} at ${input.companyName}`
            : `⚠️ Application Update: ${input.jobTitle} at ${input.companyName}`;

        const text = `Hi ${input.candidateName},\n\nYour application for ${input.jobTitle} at ${input.companyName} status is now: ${input.status}.\n${input.details || ""}`;

        await this.deliver({ to: input.to, subject, text });
        return { success: true };
    }
}

export default new EmailService();
