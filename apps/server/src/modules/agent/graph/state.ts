import {
    StateSchema,
} from "@langchain/langgraph";

import * as z from "zod";

import type {
    AgentApplication,
    AgentBrowserSession,
    AgentJob,
    AgentResume,
} from "../agent.types.js";

export const AgentState = new StateSchema({
    threadId: z.string().default(""),

    userId: z.string(),

    query: z.string(),

    jobs: z
        .array(z.custom<AgentJob>())
        .default([]),

    selectedJobs: z
        .array(z.custom<AgentJob>())
        .default([]),

    resume: z
        .custom<AgentResume>()
        .optional(),

    application: z
        .custom<AgentApplication>()
        .optional(),

    applications: z
        .array(
            z.custom<AgentApplication>(),
        )
        .default([]),

    browser: z
        .custom<AgentBrowserSession>()
        .optional(),

    plannerAction: z
        .enum([
            "DISCOVER",
            "EVALUATE",
            "FETCH",
            "RANK",
            "TAILOR",
            "APPLY",
            "VERIFY",
            "PERSIST",
            "RETRY",
            "WAITING_FOR_USER",
            "END",
        ])
        .default("DISCOVER"),

    plannerReason: z
        .string()
        .default(""),

    evaluated: z
        .boolean()
        .default(false),

    ranked: z
        .boolean()
        .default(false),

    tailoringInstructions: z
        .array(z.string())
        .default([]),

    history: z
        .array(z.string())
        .default([]),

    errors: z
        .array(z.string())
        .default([]),
});

export type AgentStateType =
    typeof AgentState.State;

export type AgentStateUpdate =
    typeof AgentState.Update;