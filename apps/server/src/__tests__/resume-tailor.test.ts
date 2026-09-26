import test from "node:test";
import assert from "node:assert/strict";
import resumeTailorService from "../modules/ai/resume-tailor.service.js";
import coverLetterService from "../modules/ai/coverLetter.service.js";
import { prisma } from "@jobpilot/database";

test("ResumeTailoringService + CoverLetterService (TR-20.1 & TR-20.2)", async (t) => {
  await t.test("TR-20.1: TailorResume with mocked LLM returns new Resume id; tailored=true persisted", async () => {
    const origPrismaCreate = (prisma as any).resume.create;
    (prisma as any).resume.create = async (args: any) => ({
      id: "res-tailored-999",
      ...args.data,
    });

    try {
      const result = await resumeTailorService.tailor({
        userId: "user-123",
        resumeText: "Staff Engineer experienced with Distributed Systems, Go, Kafka",
        jobDescription: "Looking for Staff Engineer with Kubernetes and PostgreSQL expertise.",
        persist: true,
      });

      assert.ok(result.id);
      assert.equal(result.tailored, true);
      assert.ok(result.tailoredResume.length > 50);
      assert.ok(result.prompt.length > 0);
    } finally {
      (prisma as any).resume.create = origPrismaCreate;
    }
  });

  await t.test("TR-20.2: Cover letter service returns non-empty 200+ char string from mocked LLM", async () => {
    const result = await coverLetterService.generate({
      jobTitle: "Staff Infrastructure Engineer",
      companyName: "Stripe",
      candidateName: "Alex Rivera",
      jobDescription: "Distributed Systems, Global Payments, 5-nines availability",
      candidateSkills: ["Distributed Systems", "Go", "PostgreSQL", "Kafka"],
    });

    assert.ok(result.coverLetter);
    assert.ok(
      result.coverLetter.length >= 200,
      `Cover letter length (${result.coverLetter.length}) must be at least 200 characters`
    );
    assert.match(result.coverLetter, /Stripe/i);
    assert.match(result.coverLetter, /Alex Rivera/i);
  });
});
