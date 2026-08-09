export interface AgentCheckpoint {
    threadId: string;
    namespace: string;
    node: string;
    state: unknown;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}