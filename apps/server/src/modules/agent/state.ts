import {
    StateSchema,
} from "@langchain/langgraph";

import * as z from "zod";

import type {
    AgentApplication,
    AgentBrowserSession,
    AgentJob,
    AgentResume,
} from "./agent.types.js";

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

    browser: z
        .custom<AgentBrowserSession>()
        .optional(),

    plannerAction: z
        .string()
        .default("DISCOVER"),

    plannerReason: z
        .string()
        .default(""),

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