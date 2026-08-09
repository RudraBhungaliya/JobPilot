import type {
    AgentApplication,
    AgentBrowserSession,
    AgentJob,
    AgentResume,
} from "./agent.types.js";

export interface AgentState {
    threadId: string;
    userId: string;
    query: string;
    jobs: AgentJob[];
    selectedJobs: AgentJob[];
    resume?: AgentResume;
    application?: AgentApplication;
    browser?: AgentBrowserSession;
    history: string[];
    errors: string[];
}