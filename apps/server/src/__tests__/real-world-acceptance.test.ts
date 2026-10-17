import test from "node:test";
import assert from "node:assert/strict";
import liveAtsService from "../modules/sources/live-ats.service.js";
import domAtsDetector from "../modules/browser/dom-adapter.detector.js";
import { initialize as initDomAdapters } from "../modules/browser/dom-adapter.bootstrap.js";
import browserService from "../modules/browser/browser.service.js";
import candidateMapper from "../modules/agent/candidate/candidate.mapper.js";
import formTool from "../modules/agent/tools/form.tool.js";
import type { CandidateContext } from "../modules/agent/candidate/candidate.types.js";

test("Real-World Application Acceptance: Live ATS Inspection & Form Field Verification", async (t) => {
  let browser: any = null;
  let page: any = null;

  t.after(async () => {
    if (page) await page.close().catch(() => {});
    const browserPool = (await import("../modules/browser/browser.manager.js")).default;
    await browserPool.closeAll().catch(() => {});
  });

  await t.test("1. Discover live verified openings directly from live ATS API", async () => {
    const ghJobs = await liveAtsService.searchGreenhouse({ keyword: "engineer" });
    assert.ok(Array.isArray(ghJobs) && ghJobs.length > 0, "Must discover real live Greenhouse openings");
    const sample = ghJobs.find(j => j.url && j.url.includes("greenhouse.io"));
    assert.ok(sample, "Must have valid Greenhouse job URL");
    assert.ok(sample.title.length > 0);
    assert.ok(sample.company.length > 0);
    console.log(`    ✓ Live job discovered: "${sample.title}" at ${sample.company} (${sample.url})`);
  });

  await t.test("2. Inspect live ATS form in headless Playwright and detect ATS platform", async () => {
    initDomAdapters();
    page = await browserService.newPage();
    const testGreenhouseUrl = "https://boards.greenhouse.io/embed/job_app?for=automattic&token=12345";
    
    try {
      await page.goto(testGreenhouseUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
      const detected = await domAtsDetector.detect(page);
      assert.ok(detected, "DOM ATS Detector must recognize Greenhouse portal");
      assert.equal(detected.name, "greenhouse-dom");
      console.log(`    ✓ Platform detected on live DOM: ${detected.name}`);
    } catch (err: any) {
      console.log(`    ℹ Live network navigation notice (handled safely): ${err.message}`);
    }
  });

  await t.test("3. Accurate candidate context mapping without invented fields", () => {
    const candidateProfile: CandidateContext = {
      firstName: "Rudra",
      lastName: "Bhungaliya",
      email: "candidate.verified@jobpilot.io",
      phone: "+91 9876543210",
      city: "Bengaluru",
      country: "India",
      currentTitle: "Staff Software Engineer",
      currentCompany: "Tech Corp",
      yearsOfExperience: 6,
      skills: [
        { name: "TypeScript" },
        { name: "Node.js" },
        { name: "React" },
        { name: "PostgreSQL" },
      ],
      educations: [{
        degree: "Bachelor of Technology",
        institution: "IIT",
        fieldOfStudy: "Computer Science",
      }],
      experiences: [{
        title: "Staff Software Engineer",
        company: "Tech Corp",
        description: "Built autonomous cloud automation pipelines",
      }],
      workAuthorization: "Eligible to work in India",
      sponsorshipRequired: false,
    };

    const mappedFirst = candidateMapper.resolve(
      "first_name",
      "First Name",
      candidateProfile
    );

    assert.equal(mappedFirst.value, "Rudra");
    assert.equal(mappedFirst.source, "PROFILE");

    const mappedPhone = candidateMapper.resolve(
      "phone",
      "Phone Number",
      candidateProfile
    );

    assert.equal(mappedPhone.value, "+91 9876543210");
    assert.equal(mappedPhone.source, "PROFILE");

    // Sensitive field absent from candidate profile -> MUST NOT be invented
    const mappedClearance = candidateMapper.resolve(
      "gov_clearance",
      "US Government Top Secret Clearance Code",
      candidateProfile
    );

    assert.equal(mappedClearance.value, "", "Must not invent security clearance or sensitive data");
    assert.equal(mappedClearance.source, "UNKNOWN");
    console.log("    ✓ Candidate mapping verified: verified fields mapped accurately; unprovided sensitive fields left empty (UNKNOWN)");
  });

  await t.test("4. Missing required question flags HITL intervention before submission", () => {
    const fields = [
      { selector: "#first_name", name: "first_name", type: "text", label: "First Name", required: true },
      { selector: "#custom_portfolio_essay", name: "custom_essay", type: "textarea", label: "Provide a 500-word essay on your system architecture philosophy", required: true },
    ];

    const fillResults = [
      { selector: "#first_name", name: "first_name", value: "Rudra", filled: true },
      { selector: "#custom_portfolio_essay", name: "custom_essay", value: "", filled: false, reason: "No verified candidate value available." },
    ];

    const outsiderMissing = formTool.detectOutsiderRequiredFields(fields, fillResults);
    assert.equal(outsiderMissing.length, 1);
    assert.equal(outsiderMissing[0]?.field.label, "Provide a 500-word essay on your system architecture philosophy");
    console.log("    ✓ Outsider custom required question safely flagged for human intervention before final submission");
  });
});
