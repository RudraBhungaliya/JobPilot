import type { ApplicationStatus } from "../application/application.types.js";

export interface AgentJob {
    id: string;
    title: string;
    company: string;
    url: string;
    score?: number;
}

export interface AgentJobSearchResult {
    id: string;
    path: string;
    tailored: string;
}

export interface AgentJobSearchResults {
    id: string;
    status: ApplicationStatus;
}

export interface AgentBrowserSession {
    sessionId: string;
    currentUrl?: string;
}

export interface AgentResume {
    id: string;
    path: string;
    tailored: boolean;
}

export interface AgentApplication {
    id: string;
    status: ApplicationStatus;
}

export interface AgentRunInput {
    userId: string;
    query: string;
    resumeId?: string;
}

export interface AgentRunResult {
    threadId: string;
    status:
        | "RUNNING"
        | "COMPLETED"
        | "FAILED";

    history: string[];

    errors: string[];
}