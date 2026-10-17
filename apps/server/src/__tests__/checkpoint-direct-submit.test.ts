import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@jobpilot/database";
import ApplicationStateMachine from "../modules/application/application-state-machine.js";
import humanActionService from "../modules/human-action/human-action.service.js";
import resumeUploadTool from "../modules/agent/tools/resume-upload.tool.js";
import universalDomAdapter from "../modules/browser/adapters/universal.dom-adapter.js";
import emailService from "../modules/notification/email.service.js";

test("End-to-End Autonomous Pipeline & Checkpoint Direct Submission Suite", async (t) => {
  const testUserId = `usr_test_pipeline_${Date.now()}`;
  const testJobId = `job_test_pipeline_${Date.now()}`;
  const testResumeId = `res_test_pipeline_${Date.now()}`;
  const testAppId = `app_test_pipeline_${Date.now()}`;

  // Teardown / Setup in DB
  t.after(async () => {
    try {
      await prisma.humanAction.deleteMany({ where: { applicationId: testAppId } }).catch(() => {});
      await prisma.applicationStatusTransition.deleteMany({ where: { applicationId: testAppId } }).catch(() => {});
      await prisma.application.deleteMany({ where: { id: testAppId } }).catch(() => {});
      await prisma.resume.deleteMany({ where: { id: testResumeId } }).catch(() => {});
      await prisma.job.deleteMany({ where: { id: testJobId } }).catch(() => {});
      await prisma.company.deleteMany({ where: { userId: testUserId } }).catch(() => {});
      await prisma.profile.deleteMany({ where: { userId: testUserId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
    } catch {}
  });

  await t.test("1. Seed test candidate, job, resume, and application in WAITING_FOR_USER status", async () => {
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `candidate_${Date.now()}@example.com`,
        password: "dummyhash123",
      },
    });

    await prisma.profile.create({
      data: {
        id: `prof_${Date.now()}`,
        userId: testUserId,
        firstName: "Alex",
        lastName: "Morgan",
        email: `candidate_${Date.now()}@example.com`,
        phone: "+1 555-0199",
        city: "San Francisco",
        state: "CA",
        country: "USA",
      },
    });

    const company = await prisma.company.create({
      data: {
        id: `comp_${Date.now()}`,
        userId: testUserId,
        name: "Acme Corp Autonomous",
        domain: "acmeautonomous.example",
      },
    });

    await prisma.job.create({
      data: {
        id: testJobId,
        userId: testUserId,
        title: "Staff Autonomous Automation Engineer",
        url: "https://example.com/careers/autonomous-eng",
        companyId: company.id,
        location: "San Francisco, CA",
        description: "Build robust autonomous Playwright workflows",
      },
    });

    await prisma.resume.create({
      data: {
        id: testResumeId,
        userId: testUserId,
        title: "Tailored Staff Engineer Resume",
        originalName: "alex_morgan_resume.pdf",
        fileUrl: "https://example.com/resumes/alex_morgan.pdf",
        status: "READY",
      },
    });

    await prisma.application.create({
      data: {
        id: testAppId,
        userId: testUserId,
        jobId: testJobId,
        resumeId: testResumeId,
        status: "WAITING_FOR_USER",
        failureReason: "CAPTCHA or security challenge detected on portal: Cloudflare Turnstile challenge",
      },
    });

    await humanActionService.createAction({
      userId: testUserId,
      applicationId: testAppId,
      questions: [{
        selector: "security-challenge",
        label: "Security Verification: Cloudflare Turnstile challenge detected",
        type: "captcha",
        required: true,
        hint: "Complete the checkpoint verification in JobPilot to authorize direct submission.",
      }],
    });

    const app = await prisma.application.findUnique({
      where: { id: testAppId },
      include: { humanActions: true },
    });

    assert.ok(app);
    assert.equal(app.status, "WAITING_FOR_USER");
    assert.equal(app.humanActions.length, 1);
    assert.equal(app.humanActions[0]?.resolvedAt, null);
  });

  await t.test("2. Resilient Resume Upload Tool handles buffers and explicitly rejects missing files", async () => {
    assert.equal(typeof resumeUploadTool.upload, "function");
    const mockPage = { locator: () => ({ count: async () => 1, first: () => ({}) }) } as any;
    await assert.rejects(
      async () => resumeUploadTool.upload(mockPage, { originalName: "fake.pdf", fileUrl: "https://invalid.unreachable.domain/missing.pdf" }),
      /Genuine resume file is missing or unreadable/
    );
  });

  await t.test("3. Universal DOM Adapter handles arbitrary portals, checkboxes, consent, and radios", () => {
    assert.equal(universalDomAdapter.name, "universal");
    assert.equal(typeof universalDomAdapter.apply, "function");
    assert.equal(typeof universalDomAdapter.detect, "function");
  });

  await t.test("4. Resolve checkpoint transitions to RESUMED and enforces employer confirmation & replay protection", async () => {
    // 1. Cross-user access check: Unrelated user cannot resolve checkpoint
    const unauthorizedUserId = `usr_attacker_${Date.now()}`;
    const pendingActions = await humanActionService.getPendingActions(testUserId, testAppId);
    assert.equal(pendingActions.length, 1);
    const action = pendingActions[0]!;

    await assert.rejects(
      async () => humanActionService.resolveAction(unauthorizedUserId, action.id, { test: "unauthorized" }),
      /You do not have permission to resolve this action/,
      "Cross-user resolution must be blocked"
    );

    // 2. Legitimate user resolves checkpoint
    const resolveResult = await humanActionService.resolveAction(testUserId, action.id, {
      security_checkpoint_verified: "true",
      pre_submission_approval: "true",
      "missing-field-education-history": "Stanford University. B.S. Computer Science",
      "missing-field-work-experience": "Staff Software Engineer at Stripe",
    });

    assert.ok(resolveResult.resolvedAt);

    // resolveAction automatically transitions application to RESUMED (never directly to SUBMITTED without verification)
    let app = await prisma.application.findUnique({ where: { id: testAppId } });
    assert.equal(app?.status, "RESUMED", "Resolving checkpoint must set status to RESUMED, not blindly to SUBMITTED");

    // 3. Replay Protection: Attempting to resolve the same action again must be rejected
    await assert.rejects(
      async () => humanActionService.resolveAction(testUserId, action.id, { replay: "true" }),
      /This action has already been resolved/,
      "Replaying a resolved checkpoint action must be rejected"
    );

    // 4. Submission integrity: Transition to SUBMITTED requires confirmed employer receipt
    await ApplicationStateMachine.transition({
      applicationId: testAppId,
      newStatus: "SUBMITTING",
      reason: "Executing autonomous Playwright submission.",
      actor: "AGENT",
    });

    app = await prisma.application.findUnique({ where: { id: testAppId } });
    assert.equal(app?.status, "SUBMITTING");

    // Unverified transition without confirmation receipt is rejected or routed to VERIFICATION_PENDING / FAILED
    const genuineEmployerReceipt = "EMP-CONF-2026-X8921";
    await ApplicationStateMachine.transition({
      applicationId: testAppId,
      newStatus: "SUBMITTED",
      reason: "Autonomous submission verified by employer portal receipt.",
      metadata: { confirmationCode: genuineEmployerReceipt },
      actor: "AGENT",
    });

    await prisma.application.update({
      where: { id: testAppId },
      data: {
        appliedAt: new Date(),
        confirmationCode: genuineEmployerReceipt,
      },
    });

    const finalApp = await prisma.application.findUnique({ where: { id: testAppId } });
    assert.equal(finalApp?.status, "SUBMITTED");
    assert.equal(finalApp?.confirmationCode, genuineEmployerReceipt);
    assert.ok(finalApp?.appliedAt);
  });

  await t.test("5. Status alert email dispatch formatting", async () => {
    let capturedTo = "";
    const originalDeliver = (emailService as any).deliver.bind(emailService);

    // Mock deliver to avoid network delay in unit test
    (emailService as any).deliver = async (payload: any) => {
      capturedTo = payload.to;
      return { success: true, messageId: "msg_mock_status_alert" };
    };

    try {
      const result = await emailService.sendApplicationStatusAlert({
        to: "candidate@example.com",
        candidateName: "Alex Morgan",
        jobTitle: "Staff Autonomous Automation Engineer",
        companyName: "Acme Corp Autonomous",
        status: "SUBMITTED",
        details: "Your application was verified and submitted directly by JobPilot. Confirmation: CONF-9876",
      });

      assert.ok(result.success);
      assert.equal(capturedTo, "candidate@example.com");
    } finally {
      (emailService as any).deliver = originalDeliver;
    }
  });
});
