import {
    END,
    START,
    StateGraph,
} from "@langchain/langgraph";

import plannerNode from "../nodes/planner.node.js";
import discoverNode from "../nodes/discover.node.js";
import fetchNode from "../nodes/fetch.node.js";
import rankNode from "../nodes/rank.node.js";
import tailorNode from "../nodes/tailor.node.js";
import applyNode from "../nodes/apply.node.js";
import verifyNode from "../nodes/verify.node.js";
import persistNode from "../nodes/persist.node.js";
import retryNode from "../nodes/retry.node.js";
import waitForUserNode from "../nodes/wait-for-user.node.js";

import { AgentState } from "./state.js";

const workflow = new StateGraph(
    AgentState,
)   
    .addNode(
        "planner",
        async (state) =>
            plannerNode.execute(state),
    )
    .addNode(
        "discover",
        async (state) =>
            discoverNode.execute(state),
    )
    .addNode(
        "fetch",
        async (state) =>
            fetchNode.execute(state),
    )
    .addNode(
        "rank",
        async (state) =>
            rankNode.execute(state),
    )
    .addNode(
        "tailor",
        async (state) =>
            tailorNode.execute(state),
    )
    .addNode(
        "apply",
        async (state) =>
            applyNode.execute(state),
    )
    .addNode(
        "verify",
        async (state) =>
            verifyNode.execute(state),
    )
    .addNode(
        "persist",
        async (state) =>
            persistNode.execute(state),
    )
    .addNode(
        "retry",
        async (state) =>
            retryNode.execute(state),
    )
    .addNode(
        "waitForUser",
        async (state) =>
            waitForUserNode.execute(state),
    )

    .addEdge(
            START,
            "planner",
        )

    .addConditionalEdges(
        "planner",
        (state) => state.plannerAction,
        {
            DISCOVER: "discover",
            FETCH: "fetch",
            RANK: "rank",
            TAILOR: "tailor",
            APPLY: "apply",
            VERIFY: "verify",
            PERSIST: "persist",
            RETRY: "retry",
            WAITING_FOR_USER: "waitForUser",
            END: END,
        },
    )

    .addEdge(
        "discover",
        "planner",
    )

    .addEdge(
        "fetch",
        "planner",
    )

    .addEdge(
        "rank",
        "planner",
    )

    .addEdge(
        "tailor",
        "planner",
    )

    .addEdge(
        "apply",
        "planner",
    )

    .addEdge(
        "verify",
        "planner",
    )

    .addEdge(
        "persist",
        "planner",
    )

    .addEdge(
        "retry",
        "planner",
    )

    .addEdge(
        "waitForUser",
        END,
    );


export const agentGraph =
    workflow.compile();
