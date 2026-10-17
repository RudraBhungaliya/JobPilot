import applicationRepository from "./application.repository.js";
import { eventEmitter } from "../../core/events/index.js";
import { AppError } from "../../core/errors/AppError.js";
import { isValidStageTransition } from "./application.constants.js";
import type {
    ApplicationStatus,
    BackendApplicationDTO,
    CompanyDTO,
    GreenhouseScorecardDTO,
    HumanActionDTO,
    QuestionAnswerDTO,
    TailoringNotesDTO,
    TelemetryLogDTO,
} from "./application.types.js";
import type {
    CreateApplicationDTO,
    UpdateApplicationDTO,
} from "./application.validators.js";
import { prisma } from "@jobpilot/database";

class ApplicationService {
    /**
     * Map Prisma record with relations to the standard frontend BackendApplicationDTO
     */
    public formatApplicationDTO(raw: any): BackendApplicationDTO {
        if (!raw.job || !raw.job.company) {
            throw new Error(`Application ${raw.id} is missing its persisted job or company relation.`);
        }
        const job = raw.job;
        const persistedCompany = job.company;
        const humanActions: HumanActionDTO[] = (raw.humanActions || []).map((action: any) => ({
            id: action.id,
            applicationId: raw.id,
            type: "VERIFY_ANSWERS",
            title: "Review required application information",
            description: "Review the questions and answers recorded for this application.",
            status: action.resolvedAt ? "RESOLVED" : "PENDING",
            requiredFields: Array.isArray(action.questions)
                ? action.questions.map((question: any) => question.label || question.field || question.selector).filter(Boolean)
                : [],
        }));
        const firstAction = raw.humanActions?.[0];
        const answers = (firstAction?.answers && typeof firstAction.answers === "object") ? firstAction.answers : {};
        const questions: QuestionAnswerDTO[] = Array.isArray(firstAction?.questions)
            ? firstAction.questions.map((question: any, index: number) => {
                const qKey = question.field || question.selector || "";
                const qLabel = question.label || "";
                let resolvedAnswer = answers[qKey] || answers[qLabel];
                if (!resolvedAnswer) {
                    for (const [k, v] of Object.entries(answers)) {
                        if (typeof v === "string" && (k.toLowerCase() === qLabel.toLowerCase() || k.toLowerCase() === qKey.toLowerCase())) {
                            resolvedAnswer = v;
                            break;
                        }
                    }
                }
                if (!resolvedAnswer && raw.user?.profile) {
                    const prof = raw.user.profile;
                    if (/education/i.test(qLabel) || /education/i.test(qKey)) {
                        const edu = prof.educations?.[0];
                        if (edu) {
                            resolvedAnswer = `${edu.institution}${edu.degree ? `, ${edu.degree}` : ""}`;
                        }
                    } else if (/experience/i.test(qLabel) || /experience/i.test(qKey)) {
                        const exp = prof.experiences?.[0];
                        if (exp) {
                            resolvedAnswer = `${exp.title || "Software Engineer"} at ${exp.company || ""}`;
                        }
                    }
                }
                return {
                    id: question.id || question.field || question.selector || `question-${index + 1}`,
                    label: question.label || question.field || question.selector || "",
                    field: question.field || question.selector || "",
                    type: ["text", "textarea", "select", "boolean"].includes(question.type) ? question.type : "text",
                    aiProposedValue: typeof resolvedAnswer === "string" ? resolvedAnswer : undefined,
                    userEditedValue: typeof resolvedAnswer === "string" ? resolvedAnswer : undefined,
                    confidence: typeof question.confidence === "number" ? question.confidence : undefined,
                    isFlaggedForReview: question.isFlaggedForReview === true,
                    reviewReason: typeof question.reviewReason === "string" ? question.reviewReason : undefined,
                };
            })
            : [];
        const logs: TelemetryLogDTO[] = (raw.auditLogs || []).map((log: any) => ({
            timestamp: new Date(log.createdAt).toISOString(),
            level: log.action?.includes("FAILED") ? "ERROR" : log.action?.includes("SUBMITTED") || log.action?.includes("COMPLETED") ? "SUCCESS" : "INFO",
            step: log.action || "",
            detail: log.description || "",
        }));
        const company: CompanyDTO = {
            id: persistedCompany.id,
            name: persistedCompany.name,
            domain: persistedCompany.domain || undefined,
            logoText: persistedCompany.logoText || undefined,
            location: persistedCompany.location || undefined,
            stage: persistedCompany.stage || undefined,
            verifiedAts: persistedCompany.verifiedAts || job.atsProvider || undefined,
            tier: persistedCompany.tier || undefined,
            employeeCount: persistedCompany.employeeCount || undefined,
        };
        return {
            id: raw.id,
            jobId: raw.jobId,
            userId: raw.userId,
            resumeId: raw.resumeId || raw.resume?.id || undefined,
            attempts: raw.attempts,
            failureReason: raw.failureReason,
            jobTitle: job.title,
            company,
            jobUrl: job.url,
            location: job.location,
            workMode: job.workMode || undefined,
            salaryRange: job.salaryRange || undefined,
            status: raw.status as ApplicationStatus,
            matchScore: raw.matchScore ?? undefined,
            atsProvider: job.atsProvider || persistedCompany.verifiedAts || undefined,
            resumeVersionUsed: raw.resume?.title || undefined,
            appliedAt: raw.appliedAt ? new Date(raw.appliedAt).toISOString() : undefined,
            lastUpdated: this.formatRelativeTime(raw.updatedAt),
            confirmationCode: raw.confirmationCode || undefined,
            rejectionReason: raw.rejectionReason || undefined,
            interviewRound: raw.interviewRound || undefined,
            scorecard: raw.scorecard || undefined,
            humanActions,
            questions,
            tailoringNotes: raw.tailoringNotes || undefined,
            telemetryLogs: logs,
            profile: raw.user?.profile || raw.profile || undefined,
        };
    }

    private formatRelativeTime(date: Date): string {
        const diffMs = Date.now() - new Date(date).getTime();
        const diffMins = Math.floor(diffMs / (60 * 1000));
        if (diffMins < 2) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    }

    async createApplication(userId: string, data: CreateApplicationDTO): Promise<BackendApplicationDTO> {
        if (!data.jobId) throw new AppError("A persisted job ID is required.", 400);
        const job = await prisma.job.findFirst({ where: { id: data.jobId, userId } });
        if (!job) throw new AppError("Job not found for this candidate.", 404);
        const resume = data.resumeId
            ? await prisma.resume.findFirst({ where: { id: data.resumeId, userId } })
            : await prisma.resume.findFirst({ where: { userId, status: "READY", extractedText: { not: null } }, orderBy: { updatedAt: "desc" } });
        if (!resume?.extractedText) throw new AppError("An owned, parsed resume is required.", 400);

        const app = await applicationRepository.create(userId, {
            jobId: job.id,
            resumeId: resume.id,
            status: data.status ?? "SAVED",
        });

        // Record initial audit log
        try {
            await prisma.auditLog.create({
                data: {
                    userId,
                    applicationId: app.id,
                    jobId: job.id,
                    action: "APPLICATION_CREATED",
                    description: `Application created in stage ${data.status ?? "SAVED"}.`,
                },
            });
        } catch {
            // Ignore audit log error
        }

        const fresh = await applicationRepository.findById(app.id);
        return this.formatApplicationDTO(fresh ?? app);
    }

    async getApplications(userId: string): Promise<BackendApplicationDTO[]> {
        const applications = await applicationRepository.findByUser(userId);
        return applications.map((app) => this.formatApplicationDTO(app));
    }

    async getApplication(id: string): Promise<BackendApplicationDTO | null> {
        const application = await applicationRepository.findById(id);
        if (!application) return null;
        return this.formatApplicationDTO(application);
    }

    async updateApplication(id: string, data: UpdateApplicationDTO): Promise<BackendApplicationDTO> {
        const existing = await applicationRepository.findById(id);
        if (!existing) {
            throw new AppError("Application not found", 404);
        }

        // Validate stage transition if status is being updated
        if (data.status && data.status !== existing.status) {
            const isValid = isValidStageTransition(
                existing.status as ApplicationStatus,
                data.status as ApplicationStatus
            );

            if (!isValid) {
                throw new AppError(
                    `Invalid stage transition: cannot move application from '${existing.status}' to '${data.status}'.`,
                    400,
                    "INVALID_STAGE_TRANSITION"
                );
            }
        }

        const updated = await applicationRepository.update(id, data);

        // Record audit log for the transition
        try {
            await prisma.auditLog.create({
                data: {
                    userId: updated.userId,
                    applicationId: updated.id,
                    jobId: updated.jobId,
                    action: data.status === "SUBMITTED" ? "APPLICATION_SUBMITTED" : data.status === "RUNNING" ? "APPLICATION_STARTED" : "APPLICATION_CREATED",
                    description: data.status
                        ? `Application stage transitioned to ${data.status}${data.rejectionReason ? ` (Reason: ${data.rejectionReason})` : ""}`
                        : "Application details updated.",
                },
            });
        } catch {
            // Ignore audit creation failure in memory mode
        }

        // Emit real-time WebSocket / SSE event
        if (data.status) {
            eventEmitter.emit({
                type: "application.status_changed",
                userId: updated.userId,
                applicationId: updated.id,
                status: updated.status,
                jobId: updated.jobId,
                timestamp: new Date().toISOString(),
            });
        }

        // Refetch latest record with all relations
        const fresh = await applicationRepository.findById(id);
        return this.formatApplicationDTO(fresh ?? updated);
    }

    async deleteApplication(id: string) {
        return applicationRepository.delete(id);
    }

    async findOrCreate(userId: string, data: CreateApplicationDTO) {
        if (!data.jobId) {
            const created = await this.createApplication(userId, data);
            return { application: created, created: true, skipped: false };
        }

        const existing = await applicationRepository.findByUserAndJob(
            userId,
            data.jobId
        );

        if (existing) {
            if (existing.status === "SUBMITTED" || existing.status === "RUNNING") {
                return { application: this.formatApplicationDTO(existing), created: false, skipped: true };
            }
            return { application: this.formatApplicationDTO(existing), created: false, skipped: false };
        }

        const application = await this.createApplication(userId, data);
        return { application, created: true, skipped: false };
    }


}

export default new ApplicationService();
