import type { ApplicationStatus } from "@jobpilot/database";
export type { ApplicationStatus };

export type CompanyTier = "S" | "A" | "B" | "C";

export interface CompanyDTO {
    id: string;
    name: string;
    domain: string;
    logoText: string;
    location: string;
    stage: string;
    verifiedAts: "Greenhouse" | "Lever" | "Ashby" | "Workday" | "Custom";
    tier: CompanyTier;
    employeeCount?: string;
}

export interface QuestionAnswerDTO {
    id: string;
    label: string;
    field: string;
    type: "text" | "textarea" | "select" | "boolean";
    aiProposedValue: string;
    userEditedValue?: string;
    confidence: number;
    isFlaggedForReview: boolean;
    reviewReason?: string;
}

export interface HumanActionDTO {
    id: string;
    applicationId: string;
    type: "VERIFY_ANSWERS" | "CAPTCHA_RESOLUTION" | "COMPENSATION_CONFIRMATION" | "CUSTOM_ESSAY";
    title: string;
    description: string;
    status: "PENDING" | "RESOLVED" | "DISMISSED";
    deadline?: string;
    requiredFields: string[];
}

export interface GreenhouseScorecardDTO {
    overallRecommendation: "Definitely Not" | "No" | "Yes" | "Strong Yes";
    score: 1 | 2 | 3 | 4 | 5;
    interviewer: string;
    interviewStage: string;
    submittedAt: string;
    technicalCompetence: number;
    systemDesign: number;
    communication: number;
    cultureAdd: number;
    keyStrengths: string[];
    areasOfConcern: string[];
    notes: string;
}

export interface TailoringNotesDTO {
    highlightedSkills: string[];
    customExecutiveSummary: string;
    gapAnalysis: string[];
}

export interface TelemetryLogDTO {
    timestamp: string;
    level: "INFO" | "SUCCESS" | "WARN" | "ERROR";
    step: string;
    detail: string;
}

export interface BackendApplicationDTO {
    id: string;
    jobId: string;
    userId: string;
    resumeId: string;
    attempts: number;
    failureReason?: string | null;
    jobTitle: string;
    company: CompanyDTO;
    jobUrl: string;
    location: string;
    workMode: "Remote" | "Hybrid" | "On-site";
    salaryRange: string;
    status: ApplicationStatus;
    matchScore: number;
    atsProvider: "Greenhouse" | "Lever" | "Ashby" | "Workday" | "Custom";
    resumeVersionUsed: string;
    appliedAt?: string;
    lastUpdated: string;
    confirmationCode?: string;
    rejectionReason?: string;
    interviewRound?: string;
    scorecard?: GreenhouseScorecardDTO;
    humanActions: HumanActionDTO[];
    questions: QuestionAnswerDTO[];
    tailoringNotes: TailoringNotesDTO;
    telemetryLogs: TelemetryLogDTO[];
}

export interface JobApplication {
    id: string;
    jobId: string;
    userId: string;
    resumeId: string;
    status: ApplicationStatus;
    attempts: number;
    appliedAt: Date | null;
    failureReason: string | null;
    rejectionReason?: string | null;
    interviewRound?: string | null;
    confirmationCode?: string | null;
    matchScore?: number | null;
    scorecard?: unknown;
    tailoringNotes?: unknown;
    createdAt: Date;
    updatedAt: Date;
}