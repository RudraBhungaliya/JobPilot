export type AgentAction =
    | "DISCOVER"
    | "SCRAPE"
    | "EVALUATE"
    | "FETCH"
    | "RANK"
    | "TAILOR"
    | "APPLY"
    | "AUTO_FILL"
    | "VERIFY"
    | "PERSIST"
    | "RETRY"
    | "WAITING_FOR_USER"
    | "END";

export interface PlannerDecision {
    action : AgentAction;
    reason : string;
}