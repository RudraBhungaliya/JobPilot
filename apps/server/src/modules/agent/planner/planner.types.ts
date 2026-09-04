export type AgentAction =
    | "DISCOVER"
    | "FETCH"
    | "RANK"
    | "TAILOR"
    | "APPLY"
    | "VERIFY"
    | "PERSIST"
    | "RETRY"
    | "WAITING_FOR_USER"
    | "END";

export interface PlannerDecision {
    action : AgentAction;
    reason : string;
}