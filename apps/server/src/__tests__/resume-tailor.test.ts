import test from "node:test";
import assert from "node:assert/strict";
import resumeTailorService from "../modules/ai/resume-tailor.service.js";
import coverLetterService from "../modules/ai/coverLetter.service.js";

test("ResumeTailoringService + CoverLetterService reject unsupported fake success", async (t) => {
  await t.test("Tailored resume persistence is rejected until file storage is implemented", async () => {
      await assert.rejects(() => resumeTailorService.tailor({
        userId: "user-123",
        resumeText: "Staff Engineer experienced with Distributed Systems, Go, Kafka",
        jobDescription: "Looking for Staff Engineer with Kubernetes and PostgreSQL expertise.",
        persist: true,
      }), /file persistence is not configured/);
  });

  await t.test("Cover letter generation requires source resume evidence", async () => {
    await assert.rejects(() => coverLetterService.generate({
      jobTitle: "Staff Infrastructure Engineer",
      companyName: "Stripe",
      candidateName: "Alex Rivera",
      jobDescription: "Distributed Systems, Global Payments, 5-nines availability",
      candidateSkills: ["Distributed Systems", "Go", "PostgreSQL", "Kafka"],
    }), /Resume text, job description, company, and role are required/);
  });
});
