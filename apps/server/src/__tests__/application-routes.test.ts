import test from "node:test";
import assert from "node:assert/strict";
import applicationController from "../modules/application/application.controller.js";
import applicationService from "../modules/application/application.service.js";
import applicationSubmitService from "../modules/application/application-submit.service.js";
import { sourceService } from "../modules/sources/index.js";
import { prisma } from "@jobpilot/database";
import applicationQueueService from "../modules/queue/application-queue.service.js";
import queueWorker from "../modules/queue/queue.worker.js";

test("Application routes (TR-22.1 & TR-22.2)", async (t) => {
  await t.test("TR-22.1: submit endpoint returns 202 + submit service called", async () => {
    const origGetApp = applicationService.getApplication;
    const origSubmit = applicationSubmitService.submitApplication;

    let submitCalledWith = "";

    applicationService.getApplication = async () => ({
      id: "app-sub-1",
      userId: "u1",
      status: "QUEUED",
    } as any);

    applicationSubmitService.submitApplication = async (userId: string, id: string) => {
      submitCalledWith = id;
    };

    const req: any = {
      user: { id: "u1" },
      params: { id: "app-sub-1" },
    };

    let statusCode = 0;
    let responseBody: any = null;

    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        responseBody = data;
        return this;
      },
    };

    try {
      await applicationController.submit(req, res);
      assert.equal(statusCode, 202, "Submit endpoint must return HTTP 202 Accepted");
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.applicationId, "app-sub-1");
      assert.equal(submitCalledWith, "app-sub-1");
    } finally {
      applicationService.getApplication = origGetApp;
      applicationSubmitService.submitApplication = origSubmit;
    }
  });

  await t.test("TR-22.2: discover-and-apply returns enqueuedCount > 0 on mocked sources", async () => {
    const origSearch = sourceService.search;
    const origCreate = applicationService.createApplication;
    const origTransaction = (prisma as any).$transaction;
    const origEnqueue = applicationQueueService.enqueue;
    const origProcessBatch = queueWorker.processBatch;

    sourceService.search = async () => [
      { id: "s1", title: "Distributed Systems Engineer", company: "Stripe", location: "Bengaluru", source: "greenhouse", url: "https://boards.greenhouse.io/stripe/jobs/1" },
      { id: "s2", title: "Backend Engineer", company: "Google", location: "Remote", source: "greenhouse", url: "https://boards.greenhouse.io/google/jobs/2" },
    ] as any;

    (prisma as any).$transaction = async (operation: any) => operation({
      company: {
        upsert: async ({ create }: any) => ({ id: `company-${create.name}`, ...create }),
      },
      job: {
        findFirst: async () => null,
        create: async ({ data }: any) => ({ id: `job-${data.title}`, ...data }),
      },
    });
    applicationService.createApplication = async (userId: string, data: any) => ({
      id: `app-created-${data.jobId}`,
      userId,
      ...data,
    } as any);
    applicationQueueService.enqueue = async ({ applicationId }: any) => ({ id: `queue-${applicationId}` } as any);
    queueWorker.processBatch = async () => 0;

    const req: any = {
      user: { id: "u1" },
      body: { keyword: "Distributed Systems", location: "Bengaluru", limit: 2 },
    };

    let statusCode = 0;
    let responseBody: any = null;

    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        responseBody = data;
        return this;
      },
    };

    try {
      await applicationController.discoverAndApply(req, res);
      assert.equal(statusCode, 202);
      assert.equal(responseBody.success, true);
      assert.ok(responseBody.enqueuedCount > 0);
      assert.ok(Array.isArray(responseBody.data));
    } finally {
      sourceService.search = origSearch;
      applicationService.createApplication = origCreate;
      (prisma as any).$transaction = origTransaction;
      applicationQueueService.enqueue = origEnqueue;
      queueWorker.processBatch = origProcessBatch;
    }
  });
});
