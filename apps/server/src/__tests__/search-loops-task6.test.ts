import test from "node:test";
import assert from "node:assert/strict";
import loopService from "../modules/loop/loop.service.js";
import loopExecutionEngine from "../modules/loop/loop-execution.engine.js";
import { prisma } from "@jobpilot/database";
import liveAtsService from "../modules/sources/live-ats.service.js";
import jobMatchingService from "../modules/matching/job-matching.service.js";

test("Task 6: Search Loops & Scheduling Verification Suite", async (t) => {
  const userIdA = "user_loop_test_alice";
  const userIdB = "user_loop_test_bob";

  t.before(async () => {
    // Ensure test users exist in database
    await prisma.user.upsert({
      where: { id: userIdA },
      update: {},
      create: { id: userIdA, email: "alice@test.ai", password: "hash", role: "USER" },
    });
    await prisma.user.upsert({
      where: { id: userIdB },
      update: {},
      create: { id: userIdB, email: "bob@test.ai", password: "hash", role: "USER" },
    });
  });

  t.after(async () => {
    // Cleanup
    await prisma.jobSearchLoop.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.job.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.company.deleteMany({ where: { userId: { in: [userIdA, userIdB] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userIdA, userIdB] } } });
  });

  let createdLoop: any = null;

  await t.test("1. Create: Search loop created with target parameters and persisted in PostgreSQL", async () => {
    createdLoop = await loopService.createLoop(userIdA, {
      name: "Alice FullStack Search Campaign",
      targetJobTitles: ["Senior FullStack Engineer", "Backend Engineer"],
      targetLocations: ["Bengaluru", "Remote India"],
      targetCountries: ["India"],
      remotePreference: "REMOTE_ONLY",
      dailyDiscoveryLimit: 3,
      dailyApplicationLimit: 2,
      excludedCompanies: ["SpamCo"],
    });

    assert.ok(createdLoop.id);
    assert.equal(createdLoop.name, "Alice FullStack Search Campaign");
    assert.equal(createdLoop.status, "ACTIVE");
    assert.equal(createdLoop.dailyDiscoveryLimit, 3);
    assert.deepEqual(createdLoop.targetJobTitles, ["Senior FullStack Engineer", "Backend Engineer"]);
    console.log(`    ✓ Loop created with ID: ${createdLoop.id}`);
  });

  await t.test("2. Edit: Loop parameters updated successfully", async () => {
    const updated = await loopService.updateLoop(userIdA, createdLoop.id, {
      name: "Alice Updated Staff Engineer Campaign",
      dailyDiscoveryLimit: 5,
    });

    assert.equal(updated.name, "Alice Updated Staff Engineer Campaign");
    assert.equal(updated.dailyDiscoveryLimit, 5);
    console.log("    ✓ Loop edited successfully (name and daily discovery limit)");
  });

  await t.test("3. Per-User Isolation: User B cannot access or edit User A's loop", async () => {
    await assert.rejects(
      async () => {
        await loopService.getLoopById(userIdB, createdLoop.id);
      },
      /Job search loop not found/,
      "User B must not be able to read User A's loop"
    );

    await assert.rejects(
      async () => {
        await loopService.updateLoop(userIdB, createdLoop.id, { name: "Hacked" });
      },
      /Job search loop not found/,
      "User B must not be able to edit User A's loop"
    );

    console.log("    ✓ Per-user isolation strictly verified");
  });

  await t.test("4. Run Loop: Discovers genuine jobs, deduplicates, and updates loop statistics", async () => {
    const origSearchAll = liveAtsService.searchAll;
    const origContext = jobMatchingService.getRealCandidateContext;

    jobMatchingService.getRealCandidateContext = async () => ({
      firstName: "Alice",
      skills: [{ name: "TypeScript" }, { name: "React" }],
      experiences: [],
      educations: [],
    }) as any;

    liveAtsService.searchAll = async () => [
      {
        externalId: "job-t6-1",
        title: "Senior FullStack Engineer",
        company: "Stripe",
        url: "https://stripe.com/jobs/101",
        location: "Bengaluru",
        source: "greenhouse",
        description: "Payments API",
      },
      {
        externalId: "job-t6-2",
        title: "Backend Engineer",
        company: "SpamCo", // Excluded company
        url: "https://spamco.com/jobs/102",
        location: "Bengaluru",
        source: "lever",
        description: "Spam",
      },
      {
        externalId: "job-t6-3",
        title: "Backend Engineer",
        company: "Uber",
        url: "https://uber.com/jobs/103",
        location: "Remote India",
        source: "greenhouse",
        description: "Rider backend",
      },
    ] as any;

    try {
      const runResult = await loopService.runLoop(userIdA, createdLoop.id, { syncPipeline: false });

      assert.equal(runResult.success, true);
      assert.equal(runResult.discoveredCount, 2); // Stripe + Uber (SpamCo excluded)
      assert.equal(runResult.newlyPersistedCount, 2);

      // Verify jobs persisted in database for Alice
      const aliceJobs = await prisma.job.findMany({ where: { userId: userIdA } });
      assert.equal(aliceJobs.length, 2);
      assert.ok(aliceJobs.some((j) => j.title === "Senior FullStack Engineer"));
      assert.ok(aliceJobs.some((j) => j.title === "Backend Engineer"));

      // Verify loop record statistics updated in PostgreSQL
      const loopDb = await prisma.jobSearchLoop.findUnique({ where: { id: createdLoop.id } });
      assert.ok(loopDb?.lastRunAt);
      assert.ok(loopDb?.nextRunAt);
      assert.equal(loopDb?.discoveredCount, 2);
      console.log(`    ✓ Loop executed: persisted ${aliceJobs.length} deduplicated jobs, statistics updated`);

      // Test Idempotent Re-run (Deduplication)
      const rerunResult = await loopService.runLoop(userIdA, createdLoop.id, { syncPipeline: false });
      assert.equal(rerunResult.newlyPersistedCount, 0, "Repeated run must not duplicate existing jobs");
      console.log("    ✓ Re-run deduplication verified: 0 duplicate jobs created");
    } finally {
      liveAtsService.searchAll = origSearchAll;
      jobMatchingService.getRealCandidateContext = origContext;
    }
  });

  await t.test("5. Pause and Resume: Paused loop is skipped by due scheduler; Resumed loop is executed", async () => {
    // A. Pause the loop
    const paused = await loopService.updateLoop(userIdA, createdLoop.id, { status: "PAUSED" });
    assert.equal(paused.status, "PAUSED");

    // Force nextRunAt to the past
    await prisma.jobSearchLoop.update({
      where: { id: createdLoop.id },
      data: { nextRunAt: new Date(Date.now() - 10000) },
    });

    // Push any other active loops' nextRunAt into the future so only test-targeted loops are due
    await prisma.jobSearchLoop.updateMany({
      where: {
        id: { not: createdLoop.id },
        status: "ACTIVE",
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: new Date() } }],
      },
      data: {
        nextRunAt: new Date(Date.now() + 86400000),
      },
    });

    // Scheduler executeDueLoops should NOT process paused loop
    const origSearchAll = liveAtsService.searchAll;
    let searchCalled = false;
    liveAtsService.searchAll = async () => {
      searchCalled = true;
      return [];
    };

    try {
      const dueResults = await loopExecutionEngine.executeDueLoops();
      const executedOurLoop = dueResults.some((r) => r.loopId === createdLoop.id);
      assert.equal(executedOurLoop, false, "Paused loop must be skipped by scheduler");
      assert.equal(searchCalled, false, "Live ATS search must not be invoked for paused loops");
      console.log("    ✓ Paused loop safely skipped by scheduler");

      // B. Resume the loop
      const resumed = await loopService.updateLoop(userIdA, createdLoop.id, { status: "ACTIVE" });
      assert.equal(resumed.status, "ACTIVE");

      // Reset nextRunAt to the past
      await prisma.jobSearchLoop.update({
        where: { id: createdLoop.id },
        data: { nextRunAt: new Date(Date.now() - 10000) },
      });

      const dueResultsResumed = await loopExecutionEngine.executeDueLoops();
      const executedResumed = dueResultsResumed.some((r) => r.loopId === createdLoop.id);
      assert.equal(executedResumed, true, "Active due loop must be executed by scheduler");
      assert.equal(searchCalled, true, "Scheduler executed active loop");
      console.log("    ✓ Resumed loop successfully picked up and executed by scheduler");
    } finally {
      liveAtsService.searchAll = origSearchAll;
    }
  });

  await t.test("6. Delete: Search loop deleted and removed from PostgreSQL", async () => {
    const deleteResult = await loopService.deleteLoop(userIdA, createdLoop.id);
    assert.equal(deleteResult.success, true);

    const checkLoop = await prisma.jobSearchLoop.findUnique({ where: { id: createdLoop.id } });
    assert.equal(checkLoop, null, "Deleted loop must no longer exist in database");
    console.log("    ✓ Loop deleted cleanly from database");
  });
});
