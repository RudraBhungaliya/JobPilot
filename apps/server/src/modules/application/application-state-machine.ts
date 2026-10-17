import { prisma } from "@jobpilot/database";
import type { ApplicationStatus } from "@jobpilot/database";
import emailService from "../notification/email.service.js";

export interface StateTransitionRequest {
    applicationId: string;
    newStatus: ApplicationStatus;
    reason?: string;
    metadata?: Record<string, any>;
    actor?: string; // "USER" | "SYSTEM" | "QUEUE_WORKER" | "ATS_AGENT"
}

// Canonical Application Lifecycle State Machine
const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
    DISCOVERED: ["SAVED", "QUEUED", "ARCHIVED"],
    SAVED: ["QUEUED", "DISCOVERED", "ARCHIVED"],
    PENDING: ["QUEUED", "MATCHED", "TAILORING", "FAILED"],
    MATCHED: ["QUEUED", "SAVED", "ARCHIVED"],
    QUEUED: ["TAILORING", "RUNNING", "WAITING_FOR_USER", "FAILED", "WITHDRAWN"],
    TAILORING: ["REVIEW_REQUIRED", "WAITING_FOR_USER", "READY_TO_SUBMIT", "FAILED", "WITHDRAWN"],
    REVIEW_REQUIRED: ["READY_TO_SUBMIT", "TAILORING", "WITHDRAWN", "REJECTED"],
    WAITING_FOR_USER: ["RESUMED", "READY_TO_SUBMIT", "TAILORING", "SUBMITTING", "QUEUED", "WITHDRAWN", "FAILED"],
    RESUMED: ["SUBMITTING", "READY_TO_SUBMIT", "QUEUED", "RUNNING", "FAILED", "WITHDRAWN"],
    READY_TO_SUBMIT: ["SUBMITTING", "WAITING_FOR_USER", "WITHDRAWN", "FAILED"],
    SUBMITTING: ["VERIFICATION_PENDING", "WAITING_FOR_USER", "SUBMITTED", "APPLIED", "FAILED", "RETRYING"],
    VERIFICATION_PENDING: ["WAITING_FOR_USER", "RESUMED", "SUBMITTED", "APPLIED", "FAILED", "WITHDRAWN"],
    SUBMITTED: ["APPLIED", "INTERVIEW", "REJECTED", "WITHDRAWN", "ARCHIVED"],
    APPLIED: ["INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN", "ARCHIVED"],
    FAILED: ["RETRYING", "QUEUED", "ARCHIVED"],
    RETRYING: ["QUEUED", "SUBMITTING", "FAILED"],
    WITHDRAWN: ["ARCHIVED", "QUEUED"],
    REJECTED: ["ARCHIVED"],
    INTERVIEW: ["OFFER", "REJECTED", "ARCHIVED"],
    OFFER: ["ARCHIVED"],
    ARCHIVED: ["SAVED", "QUEUED"],
    RUNNING: ["SUBMITTED", "WAITING_FOR_USER", "FAILED", "APPLIED", "QUEUED", "RETRYING", "READY_TO_SUBMIT", "SUBMITTING"],
    SKIPPED: ["ARCHIVED", "QUEUED"],
};

export class ApplicationStateMachine {
    /**
     * Check if a state transition is valid according to canonical lifecycle
     */
    static canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
        if (from === to) return true;
        const allowed = VALID_TRANSITIONS[from] || [];
        return allowed.includes(to);
    }

    /**
     * Transition an application to a new state with strict audit logging
     */
    static async transition(req: StateTransitionRequest) {
        const application = await prisma.application.findUnique({
            where: { id: req.applicationId },
            include: {
                user: {
                    include: { profile: true },
                },
                job: {
                    include: { company: true },
                },
                resume: true,
            },
        });

        if (!application) {
            throw new Error(`Application ${req.applicationId} not found.`);
        }

        const currentStatus = application.status as ApplicationStatus;
        const allowedTargets = VALID_TRANSITIONS[currentStatus] || [];

        // Evidence-backed transition enforcement and false-success prevention (Requirement 3)
        if (req.newStatus === "SUBMITTED" || req.newStatus === "APPLIED") {
            const allowedSubmissionSources: ApplicationStatus[] = ["SUBMITTING", "VERIFICATION_PENDING", "RUNNING", "SUBMITTED", "APPLIED"];
            if (!allowedSubmissionSources.includes(currentStatus)) {
                throw new Error(
                    `Invalid state transition: Cannot transition application ${req.applicationId} to ${req.newStatus} from ${currentStatus}. Must pass through submission pipeline.`
                );
            }

            const confirmationCode =
                (req.metadata?.confirmationCode as string) ||
                (req.metadata?.confirmationId as string) ||
                application.confirmationCode;
            const hasEvidence =
                Boolean(confirmationCode && confirmationCode.trim().length > 0) ||
                Boolean(req.metadata?.verifiedSubmission) ||
                Boolean(req.metadata?.submissionEvidence);

            if (!hasEvidence) {
                throw new Error(
                    `False-success prevention: Cannot transition application ${req.applicationId} to ${req.newStatus} without verified employer confirmation evidence or confirmation code.`
                );
            }
        } else if (currentStatus !== req.newStatus && !allowedTargets.includes(req.newStatus)) {
            console.warn(
                `[StateMachine] Invalid transition from ${currentStatus} to ${req.newStatus} for application ${req.applicationId}. Proceeding with forced override for worker resiliency.`
            );
        }

        const confirmationCodeToPersist =
            (req.metadata?.confirmationCode as string) ||
            (req.metadata?.confirmationId as string) ||
            application.confirmationCode;

        // 1. Transactionally update application status and insert transition log
        const [updatedApp, transitionRecord] = await prisma.$transaction([
            prisma.application.update({
                where: { id: req.applicationId },
                data: {
                    status: req.newStatus,
                    appliedAt: req.newStatus === "APPLIED" || req.newStatus === "SUBMITTED" ? (application.appliedAt || new Date()) : application.appliedAt,
                    failureReason: req.newStatus === "FAILED" ? req.reason : application.failureReason,
                    confirmationCode: confirmationCodeToPersist,
                },
            }),
            prisma.applicationStatusTransition.create({
                data: {
                    applicationId: req.applicationId,
                    previousStatus: currentStatus,
                    newStatus: req.newStatus,
                    reason: req.reason || `Status updated to ${req.newStatus}`,
                    metadata: req.metadata || {},
                    actor: req.actor || "SYSTEM",
                },
            }),
        ]);

        // 1b. Synchronize persistent ApplicationQueue record to prevent state drift
        try {
            if (req.newStatus === "SUBMITTED" || req.newStatus === "APPLIED" || req.newStatus === "OFFER") {
                await prisma.applicationQueue.updateMany({
                    where: { applicationId: req.applicationId },
                    data: {
                        status: "COMPLETED",
                        completedAt: new Date(),
                        lockedAt: null,
                        lockedBy: null,
                    },
                });
            } else if (req.newStatus === "FAILED" || req.newStatus === "REJECTED") {
                await prisma.applicationQueue.updateMany({
                    where: { applicationId: req.applicationId },
                    data: {
                        status: "FAILED",
                        lastError: req.reason || "Application execution failed",
                        lockedAt: null,
                        lockedBy: null,
                    },
                });
            } else if (req.newStatus === "WAITING_FOR_USER" || req.newStatus === "REVIEW_REQUIRED") {
                await prisma.applicationQueue.updateMany({
                    where: { applicationId: req.applicationId },
                    data: {
                        status: "WAITING_FOR_USER",
                        lastError: req.reason || "Human intervention required",
                        lockedAt: null,
                        lockedBy: null,
                    },
                });
            } else if (req.newStatus === "QUEUED" || req.newStatus === "RESUMED") {
                await prisma.applicationQueue.updateMany({
                    where: { applicationId: req.applicationId },
                    data: {
                        status: "QUEUED",
                        lockedAt: null,
                        lockedBy: null,
                    },
                });
            }
        } catch {
            // Queue record sync non-blocking
        }

        // 2. Realtime SSE event emission to connected web clients
        try {
            const { default: eventEmitter } = await import("../../core/events/event.emitter.js");
            eventEmitter.emit({
                type: "application.status_changed",
                userId: application.userId,
                applicationId: req.applicationId,
                status: req.newStatus,
                jobId: application.jobId,
                timestamp: new Date().toISOString(),
            });
        } catch {
            // Non-blocking realtime event failure
        }

        // 3. Dispatch real email notification if human intervention is required (Idempotent)
        if (req.newStatus === "WAITING_FOR_USER" || req.newStatus === "VERIFICATION_PENDING") {
            const alreadyNotifiedIntervention = await prisma.notification.findFirst({
                where: {
                    applicationId: application.id,
                    type: "HUMAN_ACTION_REQUIRED",
                    createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
                },
            });

            const shouldSendInterventionAlert = !alreadyNotifiedIntervention && currentStatus !== "WAITING_FOR_USER";

            if (shouldSendInterventionAlert) {
                const candidateEmail = application.user.profile?.email || application.user.email;
                const candidateName = application.user.profile?.firstName
                    ? `${application.user.profile.firstName} ${application.user.profile.lastName || ""}`
                    : "Candidate";

                if (candidateEmail) {
                    try {
                        const frontendUrl = process.env.WEB_URL || process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
                        const { generateCheckpointToken } = await import("../auth/auth.tokens.js");
                        const checkpointToken = generateCheckpointToken(application.id, application.userId);
                        const actionUrl = `${frontendUrl}/checkpoint/${application.id}?token=${checkpointToken}`;
                        const prof = application.user.profile;
                        const alreadyFilledFields = [
                            { label: "Candidate Name", value: candidateName },
                            { label: "Contact Email", value: candidateEmail },
                            { label: "Phone Number", value: prof?.phone || "Pre-filled from Profile" },
                            { label: "Target Location", value: prof?.city || application.job.location || "Bengaluru, Karnataka, India" },
                            { label: "Tailored ATS Resume", value: application.resume?.title || "Tailored ATS Resume Attached (PDF)" },
                            { label: "Synced Profiles", value: prof?.linkedin || prof?.github ? "LinkedIn & GitHub Attached" : "Profile Verified" },
                        ];

                        const remainingFields = req.metadata?.missingFields || [
                            req.reason || "Additional employer screening questions or interactive verification checkpoint."
                        ];

                        await emailService.sendHumanInterventionAlert({
                            to: candidateEmail,
                            candidateName,
                            jobTitle: application.job.title,
                            companyName: application.job.company.name,
                            actionUrl,
                            jobOpeningUrl: application.job.url,
                            reason: req.reason || "Employer ATS portal requested interactive CAPTCHA / 2FA / Custom Verification.",
                            verificationType: req.metadata?.verificationType || "Interactive Security Checkpoint",
                            jobLocation: application.job.location,
                            applicationId: application.id,
                            alreadyFilledFields,
                            remainingFields,
                        });

                        await prisma.notification.create({
                            data: {
                                userId: application.userId,
                                applicationId: application.id,
                                type: "HUMAN_ACTION_REQUIRED",
                                title: `Action Required: ${application.job.title} at ${application.job.company.name}`,
                                message: `Human checkpoint needed: ${req.reason || "Interactive verification"}`,
                            },
                        });
                    } catch (emailErr) {
                        console.error("[StateMachine] Non-fatal human intervention email alert failure:", emailErr);
                    }
                }
            }
        }

        // 4. Idempotent submission confirmation email dispatch (Requirements 1, 2, 4)
        if (req.newStatus === "SUBMITTED" || req.newStatus === "APPLIED") {
            const alreadyNotified = await prisma.notification.findFirst({
                where: {
                    applicationId: application.id,
                    type: "APPLICATION_SUBMITTED",
                },
            });

            // Suppress duplicate emails on duplicate state transitions, retries, or progression from SUBMITTED to APPLIED
            const shouldSendSubmissionAlert = !alreadyNotified && currentStatus !== "SUBMITTED" && currentStatus !== "APPLIED";

            if (shouldSendSubmissionAlert) {
                const candidateEmail = application.user.profile?.email || application.user.email;
                const candidateName = application.user.profile?.firstName
                    ? `${application.user.profile.firstName} ${application.user.profile.lastName || ""}`.trim()
                    : "Candidate";

                if (candidateEmail) {
                    try {
                        const confirmationCode =
                            (req.metadata?.confirmationCode as string) ||
                            (req.metadata?.confirmationId as string) ||
                            updatedApp.confirmationCode ||
                            application.confirmationCode ||
                            null;

                        await emailService.sendApplicationStatusAlert({
                            to: candidateEmail,
                            candidateName,
                            jobTitle: application.job.title,
                            companyName: application.job.company.name,
                            status: "SUBMITTED",
                            details: req.reason || `Official Employer Confirmation Reference: ${confirmationCode || "Verified via Automation Pipeline"}`,
                            confirmationCode: confirmationCode || undefined,
                            jobLocation: application.job.location,
                            applicationId: application.id,
                            resumeTitle: application.resume?.title || "Tailored ATS Resume (PDF)",
                            appliedAt: updatedApp.appliedAt || new Date(),
                        });

                        // Persist notification record for audit trail and idempotency guarantee
                        await prisma.notification.create({
                            data: {
                                userId: application.userId,
                                applicationId: application.id,
                                type: "APPLICATION_SUBMITTED",
                                title: `Application Submitted: ${application.job.title} at ${application.job.company.name}`,
                                message: `Your application has been verified and submitted to ${application.job.company.name}. Confirmation reference: ${confirmationCode || "Verified"}`,
                            },
                        });
                    } catch (emailErr) {
                        // REQUIREMENT 2: Non-fatal email error MUST NOT corrupt application state or trigger duplicate submissions
                        console.error("[StateMachine] Non-fatal submission status alert notification failure:", emailErr);
                    }
                }
            } else {
                console.log(`[StateMachine] Idempotent notification suppressed for application ${application.id} (already notified or already submitted)`);
            }
        }

        return { application: updatedApp, transition: transitionRecord };
    }

    /**
     * Fetch complete transition history for an application
     */
    static async getHistory(applicationId: string) {
        return prisma.applicationStatusTransition.findMany({
            where: { applicationId },
            orderBy: { createdAt: "desc" },
        });
    }
}

export default ApplicationStateMachine;
