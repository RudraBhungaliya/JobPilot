import test from "node:test";
import assert from "node:assert/strict";
import applicationSubmitService from "../modules/application/application-submit.service.js";
import applicationService from "../modules/application/application.service.js";
import auditService from "../modules/audit/audit.service.js";
import notificationService from "../modules/notification/notification.service.js";
import applyAdapterRegistry from "../modules/application/adapters/apply-adapter.registry.js";
import browserPool from "../modules/browser/browser.manager.js";
import { prisma } from "@jobpilot/database";
import formTool from "../modules/agent/tools/form.tool.js";

test("ApplicationSubmitService (TR-18.1 to TR-18.4)", async (t) => {
  const origUpdateApp = applicationService.updateApplication;
  const origAuditCreate = auditService.create;
  const origNotifCreate = notificationService.create;
  applicationService.updateApplication = async () => ({} as any);
  auditService.create = async () => ({} as any);
  notificationService.create = async () => ({} as any);

  t.after(() => {
    applicationService.updateApplication = origUpdateApp;
    auditService.create = origAuditCreate;
    notificationService.create = origNotifCreate;
  });

  await t.test("TR-18.1: Successful API apply path → application status SUBMITTED", async () => {
    const origFind = (prisma as any).application.findFirst;
    const origTryApi = applyAdapterRegistry.tryApiApply;
    const origTransSubmitted = (applicationSubmitService as any)._transitionSubmitted;

    let submittedCalled = false;
    let transitionToken = "";

    (prisma as any).application.findFirst = async () => ({
      id: "app-api-1",
      userId: "u1",
      jobId: "j1",
      resumeId: "res-1",
      attempts: 0,
      job: { id: "j1", title: "Software Engineer", url: "https://boards.greenhouse.io/test/jobs/1", company: { name: "TestCo" } },
      resume: { id: "res-1", title: "CV.pdf" },
      profile: {
        firstName: "Alex",
        lastName: "Rivera",
        email: "alex@example.com",
        phone: "1234567890",
        educations: [{ id: "edu-1", degree: "B.S." }],
        experiences: [{ id: "exp-1", title: "SWE" }],
      },
    });

    applyAdapterRegistry.tryApiApply = async () => ({
      success: true,
      confirmationId: "CONF-API-12345",
      requiresBrowserFallback: false,
    });

    (applicationSubmitService as any)._transitionSubmitted = async (
      userId: string,
      appId: string,
      raw: any,
      jobTitle: string,
      compName: string,
      token: string
    ) => {
      submittedCalled = true;
      transitionToken = token;
    };

    try {
      await applicationSubmitService.submitApplication("u1", "app-api-1");
      assert.equal(submittedCalled, true);
      assert.equal(transitionToken, "CONF-API-12345");
    } finally {
      (prisma as any).application.findFirst = origFind;
      applyAdapterRegistry.tryApiApply = origTryApi;
      (applicationSubmitService as any)._transitionSubmitted = origTransSubmitted;
    }
  });

  await t.test("TR-18.2: API fallback → browser path executed; browser pool acquire once", async () => {
    const origFind = (prisma as any).application.findFirst;
    const origTryApi = applyAdapterRegistry.tryApiApply;
    const origAcquire = browserPool.acquire;
    const origTransSubmitted = (applicationSubmitService as any)._transitionSubmitted;

    let acquireCalls = 0;

    (prisma as any).application.findFirst = async () => ({
      id: "app-browser-1",
      userId: "u1",
      jobId: "j1",
      resumeId: "res-1",
      job: { id: "j1", title: "Software Engineer", url: "https://example.com/jobs/1", company: { name: "TestCo" } },
      resume: { id: "res-1", title: "CV.pdf" },
      profile: {
        firstName: "Alex",
        lastName: "Rivera",
        email: "alex@example.com",
        phone: "1234567890",
        educations: [{ id: "edu-1", degree: "B.S." }],
        experiences: [{ id: "exp-1", title: "SWE" }],
      },
    });

    // API fails -> trigger browser fallback
    applyAdapterRegistry.tryApiApply = async () => ({ success: false, requiresBrowserFallback: true });

    browserPool.acquire = async () => {
      acquireCalls++;
      return {
        id: "mock-context-id",
        context: {
          newPage: async () => ({
            goto: async () => {},
            close: async () => {},
          }),
        },
        release: async () => {},
      } as any;
    };

    (applicationSubmitService as any)._transitionSubmitted = async () => {};

    try {
      await applicationSubmitService.submitApplication("u1", "app-browser-1");
      assert.equal(acquireCalls, 1, "Browser pool should acquire exactly once on browser fallback path");
    } finally {
      (prisma as any).application.findFirst = origFind;
      applyAdapterRegistry.tryApiApply = origTryApi;
      browserPool.acquire = origAcquire;
      (applicationSubmitService as any)._transitionSubmitted = origTransSubmitted;
    }
  });

  await t.test("TR-18.3: Missing profile fields → WAITING_FOR_USER + HumanAction record created", async () => {
    const origFind = (prisma as any).application.findFirst;
    const origTransMissing = (applicationSubmitService as any)._transitionWaitingForUserMissingFields;

    let missingFieldsPassed: string[] = [];

    (prisma as any).application.findFirst = async () => ({
      id: "app-missing-1",
      userId: "u1",
      jobId: "j1",
      resumeId: "res-1",
      job: { id: "j1", title: "Software Engineer", url: "https://example.com/jobs/1", company: { name: "TestCo" } },
      resume: { id: "res-1", title: "CV.pdf" },
      profile: {
        firstName: "Alex",
        lastName: "", // missing
        email: "alex@example.com",
        phone: "", // missing
        educations: [], // missing
        experiences: [],
      },
    });

    (applicationSubmitService as any)._transitionWaitingForUserMissingFields = async (
      userId: string,
      appId: string,
      raw: any,
      missing: string[]
    ) => {
      missingFieldsPassed = missing;
    };

    try {
      await applicationSubmitService.submitApplication("u1", "app-missing-1");
      assert.ok(missingFieldsPassed.includes("Last name"));
      assert.ok(missingFieldsPassed.includes("Phone number"));
      assert.ok(missingFieldsPassed.some((m) => m.includes("education")));
    } finally {
      (prisma as any).application.findFirst = origFind;
      (applicationSubmitService as any)._transitionWaitingForUserMissingFields = origTransMissing;
    }
  });

  await t.test("TR-18.4: CAPTCHA detected → WAITING_FOR_USER + notification created", async () => {
    const origFind = (prisma as any).application.findFirst;
    const origTryApi = applyAdapterRegistry.tryApiApply;
    const origAcquire = browserPool.acquire;
    const origDetectCaptcha = formTool.detectHumanVerification;
    const origTransCaptcha = (applicationSubmitService as any)._transitionCaptcha;

    let captchaTransitionCalled = false;

    (prisma as any).application.findFirst = async () => ({
      id: "app-captcha-1",
      userId: "u1",
      jobId: "j1",
      resumeId: "res-1",
      job: { id: "j1", title: "Software Engineer", url: "https://example.com/jobs/1", company: { name: "TestCo" } },
      resume: { id: "res-1", title: "CV.pdf" },
      profile: {
        firstName: "Alex",
        lastName: "Rivera",
        email: "alex@example.com",
        phone: "1234567890",
        educations: [{ id: "edu-1", degree: "B.S." }],
        experiences: [{ id: "exp-1", title: "SWE" }],
      },
    });

    applyAdapterRegistry.tryApiApply = async () => ({ success: false, requiresBrowserFallback: true });

    browserPool.acquire = async () => ({
      id: "mock-ctx",
      context: {
        newPage: async () => ({
          goto: async () => {},
          close: async () => {},
        }),
      },
      release: async () => {},
    } as any);

    formTool.detectHumanVerification = async () => ({
      detected: true,
      message: "Cloudflare Turnstile challenge present",
    });

    (applicationSubmitService as any)._transitionCaptcha = async () => {
      captchaTransitionCalled = true;
    };

    try {
      await applicationSubmitService.submitApplication("u1", "app-captcha-1");
      assert.equal(captchaTransitionCalled, true);
    } finally {
      (prisma as any).application.findFirst = origFind;
      applyAdapterRegistry.tryApiApply = origTryApi;
      browserPool.acquire = origAcquire;
      formTool.detectHumanVerification = origDetectCaptcha;
      (applicationSubmitService as any)._transitionCaptcha = origTransCaptcha;
    }
  });
});
