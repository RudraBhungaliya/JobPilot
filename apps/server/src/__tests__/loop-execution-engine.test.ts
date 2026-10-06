import test from "node:test";
import assert from "node:assert/strict";
import { LoopExecutionEngine } from "../modules/loop/loop-execution.engine.js";
import { prisma } from "@jobpilot/database";
import liveAtsService from "../modules/sources/live-ats.service.js";

test("Loop Execution Engine Suite", async (suite) => {
  await suite.test("Executes loop, filters excluded companies, and persists unique jobs", async () => {
    const engine = new LoopExecutionEngine();
    const userId = "test-user-loop-1";
    const loopId = "loop-active-1";

    const fakeLoop = {
      id: loopId,
      userId,
      name: "Full Stack Campaign",
      status: "ACTIVE",
      targetJobTitles: ["Full Stack Engineer"],
      targetLocations: ["Bengaluru"],
      targetCountries: ["India"],
      remotePreference: "HYBRID_OR_REMOTE",
      excludedCompanies: ["SpamCo"],
      includedCompanies: [],
      dailyDiscoveryLimit: 5,
      discoveredCount: 0,
      appliedCount: 0,
      lastRunAt: null,
      nextRunAt: null,
    };

    const mockDiscoveredJobs = [
      {
        externalId: "job-1",
        title: "Full Stack Engineer",
        company: "Acme Tech",
        url: "https://acme.com/jobs/1",
        location: "Bengaluru",
        source: "greenhouse",
        description: "Node & React",
      },
      {
        externalId: "job-2",
        title: "Full Stack Engineer",
        company: "SpamCo", // Should be filtered out by excludedCompanies
        url: "https://spamco.com/jobs/2",
        location: "Bengaluru",
        source: "lever",
        description: "Spam company job",
      },
      {
        externalId: "job-3",
        title: "Full Stack Engineer",
        company: "Stripe",
        url: "https://stripe.com/jobs/3",
        location: "Remote",
        source: "greenhouse",
        description: "Payment infrastructure",
      },
    ];

    // Mock liveAtsService.searchAll
    const origSearchAll = liveAtsService.searchAll;
    liveAtsService.searchAll = async () => mockDiscoveredJobs as any;

    // Track DB operations
    const persistedJobs: any[] = [];
    const persistedCompanies: any[] = [];
    let updatedLoopData: any = null;

    const origFindLoop = (prisma as any).jobSearchLoop.findFirst;
    const origUpdateLoop = (prisma as any).jobSearchLoop.update;
    const origFindJob = (prisma as any).job.findFirst;
    const origCreateJob = (prisma as any).job.create;
    const origFindCompany = (prisma as any).company.findUnique;
    const origCreateCompany = (prisma as any).company.create;
    const origCreateApp = (prisma as any).application.create;
    const origCreateQueue = (prisma as any).queueJob.create;

    let appCreatedCount = 0;
    let queueCreatedCount = 0;

    (prisma as any).jobSearchLoop.findFirst = async () => fakeLoop;
    (prisma as any).jobSearchLoop.update = async (args: any) => {
      updatedLoopData = args.data;
      return { ...fakeLoop, ...args.data };
    };
    (prisma as any).job.findFirst = async () => null; // No existing jobs
    (prisma as any).job.create = async (args: any) => {
      persistedJobs.push(args.data);
      return { id: `db-job-${persistedJobs.length}`, ...args.data };
    };
    (prisma as any).company.findUnique = async () => null;
    (prisma as any).company.create = async (args: any) => {
      persistedCompanies.push(args.data);
      return { id: `comp-${persistedCompanies.length}`, ...args.data };
    };
    (prisma as any).application.create = async () => {
      appCreatedCount++;
      return { id: "app-id" };
    };
    (prisma as any).queueJob.create = async () => {
      queueCreatedCount++;
      return { id: "q-id" };
    };

    try {
      const result = await engine.executeLoop(loopId, userId);

      assert.equal(result.success, true);
      assert.equal(result.discoveredCount, 2); // Acme Tech + Stripe (SpamCo excluded)
      assert.equal(result.newlyPersistedCount, 2);
      assert.equal(result.dispatchedCount, 0); // Must NOT dispatch auto-apply

      // Verify SpamCo was excluded
      const companies = persistedJobs.map((j) => j.title);
      assert.equal(persistedJobs.length, 2);
      assert.ok(persistedCompanies.some((c) => c.name === "Acme Tech"));
      assert.ok(persistedCompanies.some((c) => c.name === "Stripe"));
      assert.ok(!persistedCompanies.some((c) => c.name === "SpamCo"));

      // Verify loop was updated with schedule and counts
      assert.ok(updatedLoopData.lastRunAt instanceof Date);
      assert.ok(updatedLoopData.nextRunAt instanceof Date);
      assert.ok(updatedLoopData.nextRunAt.getTime() > updatedLoopData.lastRunAt.getTime());
      assert.equal(updatedLoopData.status, "ACTIVE");

      // Verify no auto-apply application or queue items created
      assert.equal(appCreatedCount, 0);
      assert.equal(queueCreatedCount, 0);
    } finally {
      liveAtsService.searchAll = origSearchAll;
      (prisma as any).jobSearchLoop.findFirst = origFindLoop;
      (prisma as any).jobSearchLoop.update = origUpdateLoop;
      (prisma as any).job.findFirst = origFindJob;
      (prisma as any).job.create = origCreateJob;
      (prisma as any).company.findUnique = origFindCompany;
      (prisma as any).company.create = origCreateCompany;
      (prisma as any).application.create = origCreateApp;
      (prisma as any).queueJob.create = origCreateQueue;
    }
  });

  await suite.test("Deduplicates previously persisted jobs and respects discovery limit", async () => {
    const engine = new LoopExecutionEngine();
    const userId = "test-user-loop-2";
    const loopId = "loop-active-2";

    const fakeLoop = {
      id: loopId,
      userId,
      name: "Backend Campaign",
      status: "ACTIVE",
      targetJobTitles: ["Backend Engineer"],
      targetLocations: ["India"],
      targetCountries: ["India"],
      remotePreference: "HYBRID_OR_REMOTE",
      excludedCompanies: [],
      includedCompanies: [],
      dailyDiscoveryLimit: 1, // Limit is 1
      discoveredCount: 5,
    };

    const mockJobs = [
      {
        externalId: "job-existing",
        title: "Senior Backend Engineer",
        company: "Uber",
        url: "https://uber.com/jobs/existing",
        location: "Bengaluru",
        source: "greenhouse",
      },
      {
        externalId: "job-new-1",
        title: "Staff Backend Engineer",
        company: "Uber",
        url: "https://uber.com/jobs/new-1",
        location: "Bengaluru",
        source: "greenhouse",
      },
      {
        externalId: "job-new-2",
        title: "Lead Backend Engineer",
        company: "Uber",
        url: "https://uber.com/jobs/new-2",
        location: "Bengaluru",
        source: "greenhouse",
      },
    ];

    const origSearchAll = liveAtsService.searchAll;
    liveAtsService.searchAll = async () => mockJobs as any;

    const persistedJobs: any[] = [];
    const origFindLoop = (prisma as any).jobSearchLoop.findFirst;
    const origUpdateLoop = (prisma as any).jobSearchLoop.update;
    const origFindJob = (prisma as any).job.findFirst;
    const origCreateJob = (prisma as any).job.create;
    const origFindCompany = (prisma as any).company.findUnique;
    const origCreateCompany = (prisma as any).company.create;

    (prisma as any).jobSearchLoop.findFirst = async () => fakeLoop;
    (prisma as any).jobSearchLoop.update = async (args: any) => ({ ...fakeLoop, ...args.data });
    // First job exists; second and third do not
    (prisma as any).job.findFirst = async (args: any) => {
      if (args.where.url === "https://uber.com/jobs/existing") {
        return { id: "existing-job-id", url: args.where.url };
      }
      return null;
    };
    (prisma as any).job.create = async (args: any) => {
      persistedJobs.push(args.data);
      return { id: `db-job-${persistedJobs.length}`, ...args.data };
    };
    (prisma as any).company.findUnique = async () => ({ id: "uber-id", name: "Uber" });

    try {
      const result = await engine.executeLoop(loopId, userId);

      assert.equal(result.success, true);
      assert.equal(result.discoveredCount, 3);
      // Because dailyDiscoveryLimit = 1, only 1 new job is persisted despite 2 new jobs available
      assert.equal(result.newlyPersistedCount, 1);
      assert.equal(persistedJobs.length, 1);
      assert.equal(persistedJobs[0].url, "https://uber.com/jobs/new-1");
    } finally {
      liveAtsService.searchAll = origSearchAll;
      (prisma as any).jobSearchLoop.findFirst = origFindLoop;
      (prisma as any).jobSearchLoop.update = origUpdateLoop;
      (prisma as any).job.findFirst = origFindJob;
      (prisma as any).job.create = origCreateJob;
      (prisma as any).company.findUnique = origFindCompany;
    }
  });

  await suite.test("Handles failure safely: sets loop to ERROR status and updates timestamps", async () => {
    const engine = new LoopExecutionEngine();
    const userId = "test-user-loop-3";
    const loopId = "loop-error-1";

    const fakeLoop = {
      id: loopId,
      userId,
      name: "Failing Campaign",
      status: "ACTIVE",
      targetJobTitles: ["DevOps Engineer"],
      targetLocations: ["India"],
      targetCountries: ["India"],
    };

    const origSearchAll = liveAtsService.searchAll;
    liveAtsService.searchAll = async () => {
      throw new Error("Network timeout contacting live ATS cluster");
    };

    let updatedStatus: string | null = null;
    const origFindLoop = (prisma as any).jobSearchLoop.findFirst;
    const origUpdateLoop = (prisma as any).jobSearchLoop.update;
    const origFindJob = (prisma as any).job.findFirst;

    (prisma as any).jobSearchLoop.findFirst = async () => fakeLoop;
    (prisma as any).jobSearchLoop.update = async (args: any) => {
      if (args.data.status) {
        updatedStatus = args.data.status;
      }
      return { ...fakeLoop, ...args.data };
    };

    // Make live ATS return at least 1 job
    liveAtsService.searchAll = async () => [
      {
        externalId: "fatal-job",
        title: "DevOps Engineer",
        company: "FatalCorp",
        url: "https://fatalcorp.com/jobs/1",
        location: "India",
        source: "greenhouse",
      },
    ] as any;

    // Simulate database failure during deduplication / job lookup
    (prisma as any).job.findFirst = async () => {
      throw new Error("Fatal PostgreSQL connection drop");
    };

    try {
      await assert.rejects(
        async () => {
          await engine.executeLoop(loopId, userId);
        },
        {
          message: "Fatal PostgreSQL connection drop",
        }
      );

      assert.equal(updatedStatus, "ERROR");
    } finally {
      liveAtsService.searchAll = origSearchAll;
      (prisma as any).jobSearchLoop.findFirst = origFindLoop;
      (prisma as any).jobSearchLoop.update = origUpdateLoop;
      (prisma as any).job.findFirst = origFindJob;
    }
  });

  await suite.test("executeDueLoops processes active due loops and skips non-due or paused loops", async () => {
    const engine = new LoopExecutionEngine();
    const now = new Date();

    const dueLoop1 = { id: "loop-due-1", name: "Due 1", userId: "u1" };
    const dueLoop2 = { id: "loop-due-2", name: "Due 2", userId: "u2" };

    const origFindMany = (prisma as any).jobSearchLoop.findMany;
    let findManyCriteria: any = null;

    (prisma as any).jobSearchLoop.findMany = async (args: any) => {
      findManyCriteria = args;
      return [dueLoop1, dueLoop2];
    };

    const executedLoopIds: string[] = [];
    const origExecuteLoop = engine.executeLoop;
    engine.executeLoop = async (loopId: string) => {
      executedLoopIds.push(loopId);
      return {
        success: true,
        loop: { id: loopId },
        discoveredCount: 4,
        newlyPersistedCount: 2,
        dispatchedCount: 0,
        jobs: [],
      };
    };

    try {
      const results = await engine.executeDueLoops();

      // Verify Prisma query strictly targeted ACTIVE loops with nextRunAt <= now or null
      assert.equal(findManyCriteria.where.status, "ACTIVE");
      assert.ok(findManyCriteria.where.OR);

      assert.equal(results.length, 2);
      assert.deepEqual(executedLoopIds, ["loop-due-1", "loop-due-2"]);
      assert.equal(results[0].status, "SUCCESS");
      assert.equal(results[0].newlyPersistedCount, 2);
    } finally {
      (prisma as any).jobSearchLoop.findMany = origFindMany;
      engine.executeLoop = origExecuteLoop;
    }
  });

  await suite.test("Scheduler start, status, and stop lifecycle", async () => {
    const engine = new LoopExecutionEngine();

    assert.equal(engine.getStatus().schedulerRunning, false);

    // Start with short interval
    engine.startScheduler(30000);
    assert.equal(engine.getStatus().schedulerRunning, true);
    assert.equal(engine.getStatus().checkIntervalMs, 30000);

    // Stop scheduler
    engine.stopScheduler();
    assert.equal(engine.getStatus().schedulerRunning, false);
  });
});
