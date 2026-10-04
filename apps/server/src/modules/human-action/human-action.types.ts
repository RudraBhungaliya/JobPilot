export interface HumanActionQuestion {
    /** CSS selector of the form field */
    selector: string;
    /** Human-readable label */
    label: string;
    /** Input type, e.g. "text" | "select" | "file" */
    type: string;
    /** Whether the field is required */
    required: boolean;
    /** Optional hint about what value is expected */
    hint?: string;
}

export type HumanActionAnswers = Record<string, string>;

export interface CreateHumanActionInput {
    userId: string;
    applicationId: string;
    agentRunId?: string;
    questions: HumanActionQuestion[];
}

export interface ResolveHumanActionInput {
    id: string;
    userId: string;
    answers: HumanActionAnswers;
}
