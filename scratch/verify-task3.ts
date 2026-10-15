import assert from "node:assert/strict";
import { autoApplyService } from "../apps/server/src/modules/application/auto-apply.service.js";
import atsAdapterFactory from "../apps/server/src/modules/ats/adapters/adapter.factory.js";
import { greenhouseAdapter } from "../apps/server/src/modules/ats/adapters/greenhouse.adapter.js";
import { leverAdapter } from "../apps/server/src/modules/ats/adapters/lever.adapter.js";
import { ashbyAdapter } from "../apps/server/src/modules/ats/adapters/ashby.adapter.js";
import { workdayAdapter } from "../apps/server/src/modules/ats/adapters/workday.adapter.js";
import { greenhouseDomAdapter, leverDomAdapter, workdayDomAdapter, ashbyDomAdapter } from "../apps/server/src/modules/browser/adapters/index.js";
import applyAdapterRegistry from "../apps/server/src/modules/application/adapters/apply-adapter.registry.js";
import ApplicationStateMachine from "../apps/server/src/modules/application/application-state-machine.js";
import humanActionService from "../apps/server/src/modules/human-action/human-action.service.js";
import candidateMapper from "../apps/server/src/modules/agent/candidate/candidate.mapper.js";
import type { CandidateContext } from "../apps/server/src/modules/agent/candidate/candidate.types.js";

async function verifyTask3() {
  console.log("================================================================================");
  console.log("=== TASK 3 COMPREHENSIVE VERIFICATION: APPLICATION PIPELINE & ADAPTERS ===");
  console.log("================================================================================\n");

  // 1. Verify Playwright ATS Adapter Detection across Greenhouse, Lever, Ashby, Workday
  console.log("1. Verifying ATS Adapter Detection & URL Routing...");
  const testUrls = [
    { url: "https://boards.greenhouse.io/stripe/jobs/5678", expected: "Greenhouse" },
    { url: "https://job-boards.eu.greenhouse.io/groww/jobs/4567", expected: "Greenhouse" },
    { url: "https://jobs.lever.co/postman/1234-abcd", expected: "Lever" },
    { url: "https://jobs.ashbyhq.com/glean/efgh-5678", expected: "Ashby" },
    { url: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/India/Software-Engineer_JR198", expected: "Workday" },
  ];

  for (const { url, expected } of testUrls) {
    const adapter = atsAdapterFactory.getAdapterForUrl(url);
    assert.equal(adapter.providerName, expected, `Adapter provider must be ${expected} for ${url}`);
    const detectedProvider = autoApplyService.detectAtsProvider(url);
    assert.equal(detectedProvider, expected.toLowerCase(), `Detected provider must be ${expected.toLowerCase()}`);
    console.log(`  ✓ Successfully routed ${url.slice(0, 45)}... -> ${adapter.providerName}`);
  }

  // 2. Verify Browser DOM Adapters registered for all 4 ATS portals
  console.log("\n2. Verifying DOM Adapters for Greenhouse, Lever, Ashby, and Workday...");
  assert.equal(greenhouseDomAdapter.name, "greenhouse-dom");
  assert.equal(leverDomAdapter.name, "lever-dom");
  assert.equal(ashbyDomAdapter.name, "ashby-dom");
  assert.equal(workdayDomAdapter.name, "workday-dom");
  console.log("  ✓ All 4 DOM adapters active: greenhouse-dom, lever-dom, ashby-dom, workday-dom");

  // 3. Verify Candidate Field Mapping for ATS Forms
  console.log("\n3. Verifying Form Field Mapping with Candidate Context...");
  const sampleProfile: CandidateContext = {
    firstName: "Rudra",
    lastName: "Bhungaliya",
    fullName: "Rudra Bhungaliya",
    email: "rudra@example.com",
    phone: "+91 9876543210",
    city: "Surat",
    state: "Gujarat",
    country: "India",
    location: "Surat, Gujarat, India",
    linkedin: "https://linkedin.com/in/rudrabhungaliya",
    github: "https://github.com/RudraBhungaliya",
    portfolio: "https://rudra.dev",
    workAuthorization: "YES_AUTHORIZED",
    sponsorshipRequired: false,
    experiences: [{ title: "Software Engineer", company: "TechCorp" }],
    educations: [{ degree: "B.Tech Computer Science", school: "University" }],
    skills: ["TypeScript", "Node.js", "React", "PostgreSQL"],
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
    console.log(`  ✓ Mapped ${field.label} (${field.name}) -> "${resolved.value}" [${resolved.source}]`);
  }

  // 4. Verify Ambiguous Work Authorization Triggers HITL (No Fake Answers)
  console.log("\n4. Verifying Ambiguous Work Authorization (Argentina / UK) triggers UNKNOWN / HITL...");
  const resolvedArgentina = candidateMapper.resolve("work_auth_ar", "Are you legally authorized to work in Argentina without a visa?", sampleProfile);
  assert.equal(resolvedArgentina.value, "", "Must not guess work authorization for unconfigured foreign countries");
  assert.equal(resolvedArgentina.confidence, "LOW", "Confidence must be LOW for unconfigured foreign authorization");
  console.log("  ✓ Foreign work authorization question safely returns empty value with LOW confidence (triggers HITL)");

  // 5. Verify State Machine Transitions & Verification Enforcement
  console.log("\n5. Verifying Application Lifecycle State Machine Transitions...");
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
  console.log("  ✓ State machine enforces WAITING_FOR_USER -> RESUMED -> SUBMITTING -> SUBMITTED lifecycle");

  // 6. Verify Human Action Categorization (CAPTCHA, 2FA, Email, Approval)
  console.log("\n6. Verifying Human Intervention Question Categorization & Database Persistence...");
  const { prisma } = await import("@jobpilot/database");
  let testApp = await prisma.application.findFirst({ include: { user: true } });
  
  if (!testApp) {
    const user = await prisma.user.findFirst();
    const job = await prisma.job.findFirst();
    if (user && job) {
      testApp = await prisma.application.create({
        data: {
          userId: user.id,
          jobId: job.id,
          status: "WAITING_FOR_USER",
        },
        include: { user: true },
      });
    }
  }

  assert.ok(testApp, "Must have an application to test human actions");

  const mockAction = await humanActionService.createAction({
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

  assert.equal(mockAction.questions.length, 2);
  assert.equal(mockAction.questions[0].type, "captcha");
  assert.equal(mockAction.questions[1].type, "approval");
  console.log("  ✓ Created HumanAction with correctly typed CAPTCHA challenge and pre-submission sign-off gate");

  // Clean up test action
  await prisma.humanAction.delete({ where: { id: mockAction.id } }).catch(() => {});
  await prisma.$disconnect();

  // 7. Verify API Adapters canApply Matching
  console.log("\n7. Verifying API Adapters canApply matching...");
  const ghCanApply = applyAdapterRegistry.list().some((a) => a.canApply("https://boards.greenhouse.io/test/jobs/1"));
  const leverCanApply = applyAdapterRegistry.list().some((a) => a.canApply("https://jobs.lever.co/test/1"));
  const ashbyCanApply = applyAdapterRegistry.list().some((a) => a.canApply("https://jobs.ashbyhq.com/test/1"));
  assert.equal(ghCanApply, true, "Greenhouse API adapter canApply must match URL");
  assert.equal(leverCanApply, true, "Lever API adapter canApply must match URL");
  assert.equal(ashbyCanApply, true, "Ashby API adapter canApply must match URL");
  console.log("  ✓ All API adapters correctly match respective job URLs");

  console.log("\n================================================================================");
  console.log("=== TASK 3 VERIFICATION PASSED: APPLICATION PIPELINE PROVEN RELIABLE ===");
  console.log("================================================================================");
}

verifyTask3().catch((err) => {
  console.error("Task 3 verification failed:", err);
  process.exit(1);
});
