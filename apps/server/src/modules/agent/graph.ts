import {
    END,
    START,
    StateGraph,
} from "@langchain/langgraph";

import discoverNode from "./nodes/discover.node.js";
import fetchNode from "./nodes/fetch.node.js";
import rankNode from "./nodes/rank.node.js";
import tailorNode from "./nodes/tailor.node.js";
import applyNode from "./nodes/apply.node.js";
import verifyNode from "./nodes/verify.node.js";
import persistNode from "./nodes/persist.node.js";
import retryNode from "./nodes/retry.node.js";

import { AgentState } from "./state.js";

const workflow = new StateGraph(
    AgentState,
)
    .addNode(
        "discover",
        async (state) => {
            discoverNode.execute(state);
        }
    )
    .addNode(
        "fetch",
        async (state) => {
            fetchNode.execute(state);
        }
    )
    .addNode(
        "rank",
        async (state) => {
            rankNode.execute(state);
        }
    )
    .addNode(
        "tailor",
        async (state) => {
            tailorNode.execute(state);
        }
    )
    .addNode(
        "apply",
        async (state) => {
            applyNode.execute(state);
        }
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

    .addEdge(
        START,
        "discover",
    )
    .addEdge(
        "discover",
        "fetch",
    )
    .addEdge(
        "fetch",
        "rank",
    )
    .addEdge(
        "rank",
        "tailor",
    )
    .addEdge(
        "tailor",
        "apply",
    )
    .addEdge(
        "apply",
        "verify",
    )
    .addEdge(
        "verify",
        "persist",
    )
    .addEdge(
        "persist",
        END,
    );

export const agentGraph =
    workflow.compile();