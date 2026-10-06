import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@jobpilot/database";
import { PipelineSyncService } from "../modules/application/pipeline-sync.service.js";
import ApplicationStateMachine from "../modules/application/application-state-machine.js";
import applicationQueueService from "../modules/queue/application-queue.service.js";
import eventEmitter from "../core/events/event.emitter.js";

test("Application Pipeline Sync Module Suite", async (suite) => {
  const syncService = new PipelineSyncService();

  const userId = "test-user-sync-1";
  const resumeId = "test-resume-1";
  const profileId = "test-profile-1";

  // In-memory mock database state for testing
  const mockJobs = new Map<string, any>();
  const mockApplications = new Map<string, any>();
  const mockQueues = new Map<string, any>();
  const mockTransitions: any[] = [];
  const emittedEvents: any[] = [];

  // Setup spies/mocks on prisma
  const origFindUniqueJob = prisma.job.findUnique;
  const origFindManyJob = prisma.job.findMany;
  const origFindUniqueApp = prisma.application.findUnique;
  const origCreateApp = prisma.application.create;
  const origUpdateApp = prisma.application.update;
  const origCountApp = prisma.application.count;
  const origFindManyApp = prisma.application.findMany;
  const origFindUniqueProfile = prisma.profile.findUnique;
  const origFindFirstResume = prisma.resume.findFirst;
  const origFindFirstLoop = prisma.jobSearchLoop.findFirst;
  const origFindUniqueLoop = prisma.jobSearchLoop.findUnique;
  const origUpdateLoop = prisma.jobSearchLoop.update;
  const origCreateQueue = prisma.applicationQueue.create;
  const origFindUniqueQueue = prisma.applicationQueue.findUnique;
  const origUpdateQueue = prisma.applicationQueue.update;
  const origCreateTransition = prisma.applicationStatusTransition.create;
  const origTransaction = prisma.$transaction;
  const origEmit = eventEmitter.emit;

  // Intercept event emitter to capture realtime SSE events
  (eventEmitter as any).emit = (event: any) => {
    emittedEvents.push(event);
    return origEmit.call(eventEmitter, event);
  };

  // Mock Prisma methods
  (prisma.job as any).findUnique = async ({ where }: any) => {
    return mockJobs.get(where.id) || null;
  };

  (prisma.job as any).findMany = async ({ where }: any) => {
    return Array.from(mockJobs.values()).filter((j) => {
      if (where?.userId && j.userId !== where.userId) return false;
      if (where?.tags?.has && !j.tags?.includes(where.tags.has)) return false;
      return true;
    });
  };

  (prisma.profile as any).findUnique = async () => ({ id: profileId, userId });
  (prisma.resume as any).findFirst = async () => ({ id: resumeId, userId });

  (prisma.application as any).findUnique = async ({ where }: any) => {
    if (where.userId_jobId) {
      const key = `${where.userId_jobId.userId}:${where.userId_jobId.jobId}`;
      return mockApplications.get(key) || null;
    }
    if (where.id) {
      return Array.from(mockApplications.values()).find((a) => a.id === where.id) || null;
    }
    return null;
  };

  (prisma.application as any).create = async ({ data }: any) => {
    const app = {
      id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      appliedAt: null,
      failureReason: null,
      ...data,
      user: { id: data.userId, profile: { id: profileId } },
      job: mockJobs.get(data.jobId) || { id: data.jobId, title: "Engineer", company: { name: "Acme" } },
    };
    mockApplications.set(`${data.userId}:${data.jobId}`, app);
    return app;
  };

  (prisma.application as any).update = async ({ where, data }: any) => {
    const existing = Array.from(mockApplications.values()).find((a) => a.id === where.id);
    if (existing) {
      Object.assign(existing, data);
      return existing;
    }
    return null;
  };

  (prisma.application as any).count = async ({ where }: any) => {
    return Array.from(mockApplications.values()).filter((a) => {
      if (where?.userId && a.userId !== where.userId) return false;
      if (where?.status?.in && !where.status.in.includes(a.status)) return false;
      if (where?.status && typeof where.status === "string" && a.status !== where.status) return false;
      return true;
    }).length;
  };

  (prisma.applicationStatusTransition as any).create = async ({ data }: any) => {
    const trans = { id: `trans-${mockTransitions.length + 1}`, ...data, createdAt: new Date() };
    mockTransitions.push(trans);
    return trans;
  };

  (prisma.$transaction as any) = async (ops: any[]) => {
    return Promise.all(ops);
  };

  (prisma.applicationQueue as any).findUnique = async ({ where }: any) => {
    return mockQueues.get(where.applicationId) || null;
  };

  (prisma.applicationQueue as any).create = async ({ data }: any) => {
    const q = { id: `queue-${Date.now()}`, ...data, createdAt: new Date() };
    mockQueues.set(data.applicationId, q);
    return q;
  };

  (prisma.applicationQueue as any).update = async ({ where, data }: any) => {
    const existing = Array.from(mockQueues.values()).find((q) => q.id === where.id);
    if (existing) {
      Object.assign(existing, data);
      return existing;
    }
    return null;
  };

  // Pre-populate sample real jobs
  mockJobs.set("job-1", {
    id: "job-1",
    title: "Senior Backend Engineer",
    company: { name: "TechCorp" },
    location: "Bengaluru",
    workMode: "REMOTE",
    url: "https://techcorp.com/jobs/1",
    userId,
    tags: ["Loop-Campaign-1", "score:90", "tier:TIER_1"],
    notes: JSON.stringify({ matchScore: 90, companyTier: "TIER_1" }),
  });

  mockJobs.set("job-2", {
    id: "job-2",
    title: "Full Stack Engineer",
    company: { name: "InnovateLabs" },
    location: "Remote",
    workMode: "REMOTE",
    url: "https://innovatelabs.com/jobs/2",
    userId,
    tags: ["Loop-Campaign-1", "score:85", "tier:TIER_2"],
    notes: JSON.stringify({ matchScore: 85, companyTier: "TIER_2" }),
  });

  mockJobs.set("job-3", {
    id: "job-3",
    title: "DevOps Engineer",
    company: { name: "CloudWorks" },
    location: "Hyderabad",
    workMode: "HYBRID",
    url: "https://cloudworks.com/jobs/3",
    userId,
    tags: ["Loop-Campaign-1", "score:70", "tier:TIER_3"],
    notes: JSON.stringify({ matchScore: 70, companyTier: "TIER_3" }),
  });

  await suite.test("1. syncJobToApplication preserves DISCOVERED -> SAVED lifecycle when autoApply is disabled", async () => {
    mockTransitions.length = 0;
    emittedEvents.length = 0;

    const result = await syncService.syncJobToApplication({
      userId,
      jobId: "job-1",
      resumeId,
      autoApply: false,
    });

    assert.equal(result.jobId, "job-1");
    assert.equal(result.status, "SAVED");
    assert.equal(result.created, true);
    assert.equal(result.queued, false);
    assert.equal(result.matchScore, 90);

    // Verify application in DB is SAVED
    const app = mockApplications.get(`${userId}:job-1`);
    assert.ok(app, "Application record must exist");
    assert.equal(app.status, "SAVED");

    // Verify DISCOVERED -> SAVED transition was recorded
    const transition = mockTransitions.find((t) => t.applicationId === result.applicationId);
    assert.ok(transition, "Status transition record must exist");
    assert.equal(transition.previousStatus, "DISCOVERED");
    assert.equal(transition.newStatus, "SAVED");

    // Verify realtime event was emitted for SAVED
    const sseEvent = emittedEvents.find((e) => e.applicationId === result.applicationId);
    assert.ok(sseEvent, "Realtime SSE event must be emitted");
    assert.equal(sseEvent.type, "application.status_changed");
    assert.equal(sseEvent.status, "SAVED");
  });

  await suite.test("2. syncJobToApplication transitions SAVED -> QUEUED and creates persistent Queue record when autoApply is enabled", async () => {
    mockTransitions.length = 0;
    emittedEvents.length = 0;

    const result = await syncService.syncJobToApplication({
      userId,
      jobId: "job-2",
      resumeId,
      autoApply: true,
      priority: 5,
    });

    assert.equal(result.jobId, "job-2");
    assert.equal(result.status, "QUEUED");
    assert.equal(result.created, true);
    assert.equal(result.queued, true);
    assert.ok(result.queueId, "Queue record ID must be present");

    // Verify application in DB is QUEUED
    const app = mockApplications.get(`${userId}:job-2`);
    assert.ok(app);
    assert.equal(app.status, "QUEUED");

    // Verify queue item exists in mock queue
    const queueItem = mockQueues.get(result.applicationId);
    assert.ok(queueItem, "Persistent application queue record must exist");
    assert.equal(queueItem.status, "QUEUED");
    assert.equal(queueItem.priority, 5);

    // Verify both transitions occurred: DISCOVERED -> SAVED and SAVED -> QUEUED
    const appTransitions = mockTransitions.filter((t) => t.applicationId === result.applicationId);
    assert.equal(appTransitions.length, 2, "Must log both DISCOVERED->SAVED and SAVED->QUEUED transitions");
    assert.equal(appTransitions[0].previousStatus, "DISCOVERED");
    assert.equal(appTransitions[0].newStatus, "SAVED");
    assert.equal(appTransitions[1].previousStatus, "SAVED");
    assert.equal(appTransitions[1].newStatus, "QUEUED");
  });

  await suite.test("3. Duplicate application sync is strictly idempotent and prevents duplicates", async () => {
    const initialAppCount = mockApplications.size;

    // Call sync on job-1 again (already SAVED)
    const secondSyncResult = await syncService.syncJobToApplication({
      userId,
      jobId: "job-1",
      resumeId,
      autoApply: false,
    });

    assert.equal(secondSyncResult.created, false, "Must not create a new application");
    assert.equal(secondSyncResult.status, "SAVED");
    assert.equal(mockApplications.size, initialAppCount, "Total application count must not increase");

    // Call sync on job-2 (already QUEUED) with autoApply: true
    const reQueueResult = await syncService.syncJobToApplication({
      userId,
      jobId: "job-2",
      resumeId,
      autoApply: true,
    });

    assert.equal(reQueueResult.created, false, "Must not create a duplicate for queued app");
    assert.equal(reQueueResult.status, "QUEUED");
    assert.equal(mockApplications.size, initialAppCount);
  });

  await suite.test("4. syncLoop respects daily limits, autoApply settings, and prioritizes highest match scores", async () => {
    // Reset applications for clean loop sync test
    mockApplications.clear();
    mockQueues.clear();
    mockTransitions.length = 0;
    emittedEvents.length = 0;

    let appliedIncrement = 0;

    // Mock loop with daily limit = 2 and autoApplyEnabled = true
    const fakeLoop = {
      id: "loop-100",
      userId,
      name: "Loop-Campaign-1",
      dailyApplicationLimit: 2, // Limit is 2
      autoApplyEnabled: true,
      resumeId,
      appliedCount: 0,
      resume: { id: resumeId },
    };

    (prisma.jobSearchLoop as any).findFirst = async () => fakeLoop;
    (prisma.jobSearchLoop as any).update = async ({ data }: any) => {
      if (data?.appliedCount?.increment) {
        appliedIncrement += data.appliedCount.increment;
      }
      return fakeLoop;
    };

    const syncSummary = await syncService.syncLoop("loop-100", userId);

    assert.equal(syncSummary.success, true);
    assert.equal(syncSummary.totalEligibleJobs, 3);
    assert.equal(syncSummary.dailyLimit, 2);

    // Only 2 should be queued because daily limit is 2
    assert.equal(syncSummary.newlyQueuedCount, 2, "Must queue only up to daily limit (2)");
    assert.equal(syncSummary.savedCount, 1, "Remaining job (1) must be saved, not queued");
    assert.equal(syncSummary.remainingDailyQuota, 0, "Remaining daily quota should be 0");
    assert.equal(appliedIncrement, 2, "Must increment loop appliedCount by 2");

    // The two queued jobs must be the ones with the highest match scores (job-1 with 90, job-2 with 85)
    const job1App = mockApplications.get(`${userId}:job-1`);
    const job2App = mockApplications.get(`${userId}:job-2`);
    const job3App = mockApplications.get(`${userId}:job-3`);

    assert.equal(job1App.status, "QUEUED", "Job-1 (score 90) must be QUEUED");
    assert.equal(job2App.status, "QUEUED", "Job-2 (score 85) must be QUEUED");
    assert.equal(job3App.status, "SAVED", "Job-3 (score 70) must remain SAVED due to limit");
  });

  await suite.test("5. syncLoop keeps all jobs at SAVED when autoApplyEnabled is false", async () => {
    mockApplications.clear();
    mockQueues.clear();
    mockTransitions.length = 0;

    const disabledLoop = {
      id: "loop-200",
      userId,
      name: "Loop-Campaign-1",
      dailyApplicationLimit: 10,
      autoApplyEnabled: false, // Auto-apply disabled
      resumeId,
      appliedCount: 0,
      resume: { id: resumeId },
    };

    (prisma.jobSearchLoop as any).findFirst = async () => disabledLoop;

    const summary = await syncService.syncLoop("loop-200", userId);

    assert.equal(summary.success, true);
    assert.equal(summary.newlyQueuedCount, 0, "Should queue 0 jobs when autoApplyEnabled is false");
    assert.equal(summary.savedCount, 3, "All 3 jobs should be saved for manual review");

    // Check all applications in DB are in SAVED state
    for (const app of mockApplications.values()) {
      assert.equal(app.status, "SAVED");
    }
    assert.equal(mockQueues.size, 0, "Application queue must be empty");
  });

  await suite.test("6. getPipelineStats aggregates real pipeline states and quota remaining", async () => {
    (prisma.jobSearchLoop as any).findUnique = async () => ({
      dailyApplicationLimit: 15,
      autoApplyEnabled: true,
    });

    const stats = await syncService.getPipelineStats(userId, "loop-200");

    assert.equal(typeof stats.totalApplications, "number");
    assert.equal(typeof stats.queuedCount, "number");
    assert.equal(typeof stats.savedCount, "number");
    assert.equal(typeof stats.remainingDailyQuota, "number");
    assert.equal(stats.dailyLimit, 15);
  });

  // Restore Prisma and Event Emitter methods
  (prisma.job as any).findUnique = origFindUniqueJob;
  (prisma.job as any).findMany = origFindManyJob;
  (prisma.application as any).findUnique = origFindUniqueApp;
  (prisma.application as any).create = origCreateApp;
  (prisma.application as any).update = origUpdateApp;
  (prisma.application as any).count = origCountApp;
  (prisma.application as any).findMany = origFindManyApp;
  (prisma.profile as any).findUnique = origFindUniqueProfile;
  (prisma.resume as any).findFirst = origFindFirstResume;
  (prisma.jobSearchLoop as any).findFirst = origFindFirstLoop;
  (prisma.jobSearchLoop as any).findUnique = origFindUniqueLoop;
  (prisma.jobSearchLoop as any).update = origUpdateLoop;
  (prisma.applicationQueue as any).create = origCreateQueue;
  (prisma.applicationQueue as any).findUnique = origFindUniqueQueue;
  (prisma.applicationQueue as any).update = origUpdateQueue;
  (prisma.applicationStatusTransition as any).create = origCreateTransition;
  (prisma.$transaction as any) = origTransaction;
  (eventEmitter as any).emit = origEmit;
});
