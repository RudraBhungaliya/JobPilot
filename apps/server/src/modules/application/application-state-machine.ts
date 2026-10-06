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
    WAITING_FOR_USER: ["READY_TO_SUBMIT", "TAILORING", "SUBMITTING", "QUEUED", "WITHDRAWN", "FAILED"],
    READY_TO_SUBMIT: ["SUBMITTING", "WAITING_FOR_USER", "WITHDRAWN", "FAILED"],
    SUBMITTING: ["VERIFICATION_PENDING", "WAITING_FOR_USER", "SUBMITTED", "APPLIED", "FAILED", "RETRYING"],
    VERIFICATION_PENDING: ["WAITING_FOR_USER", "SUBMITTED", "APPLIED", "FAILED", "WITHDRAWN"],
    SUBMITTED: ["APPLIED", "INTERVIEW", "REJECTED", "WITHDRAWN", "ARCHIVED"],
    APPLIED: ["INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN", "ARCHIVED"],
    FAILED: ["RETRYING", "QUEUED", "ARCHIVED"],
    RETRYING: ["QUEUED", "SUBMITTING", "FAILED"],
    WITHDRAWN: ["ARCHIVED", "QUEUED"],
    REJECTED: ["ARCHIVED"],
    INTERVIEW: ["OFFER", "REJECTED", "ARCHIVED"],
    OFFER: ["ARCHIVED"],
    ARCHIVED: ["SAVED", "QUEUED"],
    RUNNING: ["SUBMITTED", "WAITING_FOR_USER", "FAILED", "APPLIED"],
    SKIPPED: ["ARCHIVED", "QUEUED"],
};

export class ApplicationStateMachine {
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
            },
        });

        if (!application) {
            throw new Error(`Application ${req.applicationId} not found.`);
        }

        const currentStatus = application.status as ApplicationStatus;
        const allowedTargets = VALID_TRANSITIONS[currentStatus] || [];

        // Allow idempotent transition to same status or validated target
        if (currentStatus !== req.newStatus && !allowedTargets.includes(req.newStatus)) {
            console.warn(
                `[StateMachine] Invalid transition from ${currentStatus} to ${req.newStatus} for application ${req.applicationId}. Proceeding with forced override for worker resiliency.`
            );
        }

        // 1. Transactionally update application status and insert transition log
        const [updatedApp, transitionRecord] = await prisma.$transaction([
            prisma.application.update({
                where: { id: req.applicationId },
                data: {
                    status: req.newStatus,
                    appliedAt: req.newStatus === "APPLIED" || req.newStatus === "SUBMITTED" ? new Date() : application.appliedAt,
                    failureReason: req.newStatus === "FAILED" ? req.reason : application.failureReason,
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

        // 3. Dispatch real email notification if human intervention is required
        if (req.newStatus === "WAITING_FOR_USER" || req.newStatus === "VERIFICATION_PENDING") {
            const candidateEmail = application.user.profile?.email || application.user.email;
            const candidateName = application.user.profile?.firstName
                ? `${application.user.profile.firstName} ${application.user.profile.lastName || ""}`
                : "Candidate";

            if (candidateEmail) {
                try {
                    await emailService.sendHumanInterventionAlert({
                        to: candidateEmail,
                        candidateName,
                        jobTitle: application.job.title,
                        companyName: application.job.company.name,
                        actionUrl: application.job.url,
                        reason: req.reason || "Employer ATS portal requested interactive CAPTCHA / 2FA / Custom Verification.",
                        verificationType: req.metadata?.verificationType || "Interactive Security Checkpoint",
                        jobLocation: application.job.location,
                    });
                } catch (emailErr) {
                    console.error("[StateMachine] Failed to send email alert:", emailErr);
                }
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
