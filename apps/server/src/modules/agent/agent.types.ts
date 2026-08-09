export interface AgentJob {
    id : string;
    title : string;
    company : string;
    url : string;
    score ?: number;
}

export interface AgentJobSearchResult {
    id : string;
    path : string;
    tailored : string;
}

export interface AgentJobSearchResults {
    id : string;
    status : 
        | "PENDING"
        | "RUNNING"
        | "SUBMITTED"
        | "FAILED";
}

export interface AgentBrowserSession {
    sessionId: string;
    currentUrl?: string;
}

export interface AgentJob {
    id: string;
    title: string;
    company: string;
    url: string;
    score?: number;
}

export interface AgentResume {
    id: string;
    path: string;
    tailored: boolean;
}

export interface AgentApplication {
    id: string;
    status:
        | "PENDING"
        | "RUNNING"
        | "SUBMITTED"
        | "FAILED";
}

export interface AgentBrowserSession {
    sessionId: string;
    currentUrl?: string;
}