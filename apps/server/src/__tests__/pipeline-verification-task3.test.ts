import test from "node:test";
import assert from "node:assert/strict";
import { autoApplyService } from "../modules/application/auto-apply.service.js";
import atsAdapterFactory from "../modules/ats/adapters/adapter.factory.js";
import { greenhouseAdapter } from "../modules/ats/adapters/greenhouse.adapter.js";
import { leverAdapter } from "../modules/ats/adapters/lever.adapter.js";
import { ashbyAdapter } from "../modules/ats/adapters/ashby.adapter.js";
import { workdayAdapter } from "../modules/ats/adapters/workday.adapter.js";
import { greenhouseDomAdapter, leverDomAdapter, workdayDomAdapter, ashbyDomAdapter } from "../modules/browser/adapters/index.js";
import applyAdapterRegistry from "../modules/application/adapters/apply-adapter.registry.js";
import ApplicationStateMachine from "../modules/application/application-state-machine.js";
import humanActionService from "../modules/human-action/human-action.service.js";
import candidateMapper from "../modules/agent/candidate/candidate.mapper.js";
import type { CandidateContext } from "../modules/agent/candidate/candidate.types.js";
import { prisma } from "@jobpilot/database";

test("Task 3 Application Pipeline & Adapter Verification Suite", async (t) => {
  await t.test("1. ATS Adapter Detection & URL Routing for Greenhouse, Lever, Ashby, Workday", () => {
    const testCases = [
      { url: "https://boards.greenhouse.io/stripe/jobs/5678", expected: "Greenhouse" },
      { url: "https://job-boards.eu.greenhouse.io/groww/jobs/4567", expected: "Greenhouse" },
      { url: "https://jobs.lever.co/postman/1234-abcd", expected: "Lever" },
      { url: "https://jobs.ashbyhq.com/glean/efgh-5678", expected: "Ashby" },
      { url: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/India/Software-Engineer_JR198", expected: "Workday" },
    ];

    for (const { url, expected } of testCases) {
      const adapter = atsAdapterFactory.getAdapterForUrl(url);
      assert.equal(adapter.providerName, expected, `Adapter provider must be ${expected} for ${url}`);
      const detected = autoApplyService.detectAtsProvider(url);
      assert.equal(detected, expected.toLowerCase(), `Detected provider must be ${expected.toLowerCase()}`);
    }
  });

  await t.test("2. DOM Adapters registered for all 4 ATS portals", () => {
    assert.equal(greenhouseDomAdapter.name, "greenhouse-dom");
    assert.equal(leverDomAdapter.name, "lever-dom");
    assert.equal(ashbyDomAdapter.name, "ashby-dom");
    assert.equal(workdayDomAdapter.name, "workday-dom");
  });

  await t.test("3. Form Field Mapping with Candidate Context", () => {
    const sampleProfile: CandidateContext = {
      firstName: "Rudra",
      lastName: "Bhungaliya",
      email: "rudra@example.com",
      phone: "+91 9876543210",
      city: "Surat",
      state: "Gujarat",
      country: "India",
      linkedin: "https://linkedin.com/in/rudrabhungaliya",
      github: "https://github.com/RudraBhungaliya",
      portfolio: "https://rudra.dev",
      workAuthorization: "YES_AUTHORIZED",
      sponsorshipRequired: false,
      experiences: [{ title: "Software Engineer", company: "TechCorp" } as any],
      educations: [{ degree: "B.Tech Computer Science", school: "University" } as any],
      skills: [{ name: "TypeScript" }, { name: "Node.js" }, { name: "React" }, { name: "PostgreSQL" }] as any,
    };

    const fieldsToTest = [
      { name: "first_name", label: "First Name", expected: "Rudra" },
      { name: "last_name", label: "Last Name", expected: "Bhungaliya" },
      { name: "email", label: "Email Address", expected: "rudra@example.com" },
      { name: "phone", label: "Phone Number", expected: "+91 9876543210" },
      { name: "urls[LinkedIn]", label: "LinkedIn Profile", expected: "https://linkedin.com/in/rudrabhungaliya" },
      { name: "urls[GitHub]", label: "GitHub Profile", expected: "https://github.com/RudraBhungaliya" },
      { name: "urls[Portfolio]", label: "Website / Portfolio", expected: "https://rudra.dev" },
    ];

    for (const field of fieldsToTest) {
      const resolved = candidateMapper.resolve(field.name, field.label, sampleProfile);
      assert.equal(resolved.value, field.expected, `Field ${field.name} must resolve to ${field.expected}`);
      assert.equal(resolved.source, "PROFILE");
    }
  });

  await t.test("4. Ambiguous Foreign Work Authorization triggers UNKNOWN/HITL instead of inventing answers", () => {
    const sampleProfile: CandidateContext = {
      firstName: "Rudra",
      lastName: "Bhungaliya",
      email: "rudra@example.com",
      country: "India",
      workAuthorization: "YES_AUTHORIZED", // India authorized
    };

    const resolvedArgentina = candidateMapper.resolve("work_auth_ar", "Are you authorized to work in Argentina without visa sponsorship?", sampleProfile);
    assert.equal(resolvedArgentina.value, "", "Must not guess work authorization for foreign country");
    assert.equal(resolvedArgentina.confidence, "LOW");
    assert.equal(resolvedArgentina.source, "UNKNOWN");
  });

  await t.test("5. Application Lifecycle State Machine transitions strictly enforced", () => {
    // Valid transitions
    assert.equal(ApplicationStateMachine.canTransition("DISCOVERED", "SAVED"), true);
    assert.equal(ApplicationStateMachine.canTransition("SAVED", "QUEUED"), true);
    assert.equal(ApplicationStateMachine.canTransition("QUEUED", "WAITING_FOR_USER"), true);
    assert.equal(ApplicationStateMachine.canTransition("WAITING_FOR_USER", "RESUMED"), true);
    assert.equal(ApplicationStateMachine.canTransition("RESUMED", "SUBMITTING"), true);
    assert.equal(ApplicationStateMachine.canTransition("SUBMITTING", "SUBMITTED"), true);

    // Invalid / Unsafe transitions
    assert.equal(ApplicationStateMachine.canTransition("WAITING_FOR_USER", "SUBMITTED"), false, "Direct jump to SUBMITTED without verification must be rejected");
    assert.equal(ApplicationStateMachine.canTransition("DISCOVERED", "SUBMITTED"), false, "Direct jump from DISCOVERED to SUBMITTED must be rejected");
  });

  await t.test("6. HumanAction creation and persistence for security challenges & approvals", async () => {
    let testApp: any = await prisma.application.findFirst({ include: { user: true } });
    if (!testApp) {
      const user = await prisma.user.findFirst();
      const job = await prisma.job.findFirst();
      if (user && job) {
        let resume = await prisma.resume.findFirst({ where: { userId: user.id } });
        if (!resume) {
          resume = await prisma.resume.create({
            data: { userId: user.id, title: "Default Resume", originalName: "resume.pdf", fileUrl: "https://example.com/resume.pdf" },
          });
        }
        testApp = await prisma.application.create({
          data: {
            userId: user.id,
            jobId: job.id,
            resumeId: resume.id,
            status: "WAITING_FOR_USER",
          },
          include: { user: true },
        });
      }
    }

    assert.ok(testApp, "Application must exist in database");

    const action = await humanActionService.createAction({
      userId: testApp.userId,
      applicationId: testApp.id,
      questions: [
        {
          selector: "recaptcha-anchor",
          label: "Google reCAPTCHA verification detected on application portal.",
          type: "captcha",
          required: true,
        },
        {
          selector: "submission_approval",
          label: "Ready to submit application. Approve submission?",
          type: "approval",
          required: true,
        },
      ],
    });

    const qs = action.questions as any[];
    assert.equal(qs.length, 2);
    assert.equal(qs[0].type, "captcha");
    assert.equal(qs[1].type, "approval");

    // Clean up
    await prisma.humanAction.delete({ where: { id: action.id } }).catch(() => {});
  });

  await t.test("7. API adapters correctly match respective job URLs", async () => {
    const { default: applyBootstrap } = await import("../modules/application/adapters/apply.bootstrap.js");
    applyBootstrap.initialize();

    const list = applyAdapterRegistry.list();
    const ghCanApply = list.some((a) => a.canApply("https://boards.greenhouse.io/test/jobs/1"));
    const leverCanApply = list.some((a) => a.canApply("https://jobs.lever.co/test/1"));
    const ashbyCanApply = list.some((a) => a.canApply("https://jobs.ashbyhq.com/test/1"));
    assert.equal(ghCanApply, true, "Greenhouse API adapter canApply must match URL");
    assert.equal(leverCanApply, true, "Lever API adapter canApply must match URL");
    assert.equal(ashbyCanApply, true, "Ashby API adapter canApply must match URL");
  });
});
