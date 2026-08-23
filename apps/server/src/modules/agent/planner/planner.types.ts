export type AgentAction = 
    | "DISCOVER"
    | "FETCH"
    | "RANK"
    | "TAILOR"
    | "APPLY"
    | "VERIFY"
    | "PERSIST"
    | "RETRY"
    | "END";

export interface PlannerDecision {
    action : AgentAction;
    reason : string;
}