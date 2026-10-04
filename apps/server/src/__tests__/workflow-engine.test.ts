import test from "node:test";
import assert from "node:assert/strict";
import { WorkflowEngine } from "../modules/workflow/workflow.engine.js";
import schedulerService from "../modules/workflow/scheduler.service.js";
import { prisma } from "@jobpilot/database";
import applicationSubmitService from "../modules/application/application-submit.service.js";

test("WorkflowEngine wiring end-to-end (TR-16.1 & TR-16.2)", async (t) => {
  await t.test("TR-16.1: Engine execute(2) on 4 pending → processes first 2; next call processes remaining 2", async () => {
    const engine = new WorkflowEngine();

    // Mock 4 pending applications
    const fakePendingApps = [
      { id: "app-test-1", userId: "u1", jobId: "j1", companyKey: "comp-1" },
      { id: "app-test-2", userId: "u1", jobId: "j2", companyKey: "comp-1" },
      { id: "app-test-3", userId: "u1", jobId: "j3", companyKey: "comp-2" },
      { id: "app-test-4", userId: "u1", jobId: "j4", companyKey: "comp-2" },
    ];

    let currentBatchIndex = 0;
    const origSchedule = schedulerService.schedule;
    const origSubmit = applicationSubmitService.submitApplication;
    const origPrismaUpdateMany = (prisma as any).application.updateMany;
    const origPrismaUpdate = (prisma as any).application.update;

    const submittedAppIds: string[] = [];

    schedulerService.schedule = async (batchSize: number) => {
      const batch = fakePendingApps.slice(currentBatchIndex, currentBatchIndex + batchSize);
      currentBatchIndex += batchSize;
      return batch as any;
    };

    applicationSubmitService.submitApplication = async (userId: string, appId: string) => {
      submittedAppIds.push(appId);
    };

    (prisma as any).application.updateMany = async () => ({ count: 1 });
    (prisma as any).application.update = async (args: any) => args.data;

    try {
      // First call processes first 2
      const res1 = await engine.execute(2);
      assert.equal(res1.executed, 2);
      assert.equal(res1.completed, 2);
      assert.deepEqual(submittedAppIds, ["app-test-1", "app-test-2"]);

      // Second call processes remaining 2
      const res2 = await engine.execute(2);
      assert.equal(res2.executed, 2);
      assert.equal(res2.completed, 2);
      assert.deepEqual(submittedAppIds, ["app-test-1", "app-test-2", "app-test-3", "app-test-4"]);
    } finally {
      schedulerService.schedule = origSchedule;
      applicationSubmitService.submitApplication = origSubmit;
      (prisma as any).application.updateMany = origPrismaUpdateMany;
      (prisma as any).application.update = origPrismaUpdate;
    }
  });

  await t.test("TR-16.2: All status transitions advance correctly (QUEUED -> RUNNING -> SUBMITTED)", async () => {
    const engine = new WorkflowEngine();
    const transitions: Array<{ id: string; status: string }> = [];

    const origSchedule = schedulerService.schedule;
    const origSubmit = applicationSubmitService.submitApplication;
    const origPrismaUpdateMany = (prisma as any).application.updateMany;

    schedulerService.schedule = async () => [
      { id: "app-trans-1", userId: "u1", jobId: "j1", companyKey: "comp-stripe" } as any,
    ];

    (prisma as any).application.updateMany = async (args: any) => {
      transitions.push({ id: args.where.id, status: args.data.status });
      return { count: 1 };
    };

    applicationSubmitService.submitApplication = async () => {
      transitions.push({ id: "app-trans-1", status: "SUBMITTED" });
    };

    try {
      const res = await engine.execute(1);
      assert.equal(res.completed, 1);
      assert.ok(transitions.some((t) => t.status === "RUNNING"));
      assert.ok(transitions.some((t) => t.status === "SUBMITTED"));
    } finally {
      schedulerService.schedule = origSchedule;
      applicationSubmitService.submitApplication = origSubmit;
      (prisma as any).application.updateMany = origPrismaUpdateMany;
    }
  });
});
