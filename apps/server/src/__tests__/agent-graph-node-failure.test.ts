import test from "node:test";
import assert from "node:assert/strict";
import agentService from "../modules/agent/agent.service.js";
import agentRepository from "../modules/agent/agent.repository.js";
import { agentGraph } from "../modules/agent/graph/graph.js";
import notificationService from "../modules/notification/notification.service.js";
import auditService from "../modules/audit/audit.service.js";

test("LangGraph node failure handling (TR-23.3)", async (t) => {
  await t.test("TR-23.3: LangGraph any node throwing results in status FAILED AgentRun with errors[0] non-empty; notification row created", async () => {
    const origGetRun = agentRepository.getRun;
    const origCreateRun = agentRepository.createRun;
    const origUpdateRun = agentRepository.updateRun;
    const origGraphInvoke = agentGraph.invoke;
    const origNotify = notificationService.create;
    const origAudit = auditService.create;

    let updatedStatus = "";
    let updatedErrors: string[] = [];
    let notificationCreated = false;
    let notificationMessage = "";

    agentRepository.getRun = async () => null;
    agentRepository.createRun = async (userId, threadId, query) => ({
      id: "run-err-1",
      userId,
      threadId,
      query,
      status: "RUNNING",
      history: [],
      errors: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    agentRepository.updateRun = async (threadId, data) => {
      if (data.status) updatedStatus = data.status;
      if (data.errors) updatedErrors = data.errors;
      return {} as any;
    };

    // Simulate node throwing an error during execution
    agentGraph.invoke = async () => {
      throw new Error("Greenhouse crawler rate limited / DOM selector failure");
    };

    notificationService.create = async (userId, data) => {
      if (data.type === "AGENT_FAILED") {
        notificationCreated = true;
        notificationMessage = data.message;
      }
      return {} as any;
    };

    auditService.create = async () => ({}) as any;

    try {
      const result = await agentService.run({
        userId: "test-user-node-fail",
        query: "Staff Distributed Systems Engineer",
      });

      assert.equal(result.status, "FAILED");
      assert.equal(updatedStatus, "FAILED");
      assert.ok(result.errors.length > 0);
      assert.match(result.errors[0], /DOM selector failure|rate limited/i);
      assert.equal(notificationCreated, true);
      assert.match(notificationMessage, /DOM selector failure|rate limited/i);
    } finally {
      agentRepository.getRun = origGetRun;
      agentRepository.createRun = origCreateRun;
      agentRepository.updateRun = origUpdateRun;
      agentGraph.invoke = origGraphInvoke;
      notificationService.create = origNotify;
      auditService.create = origAudit;
    }
  });
});
