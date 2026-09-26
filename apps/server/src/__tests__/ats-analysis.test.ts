import test from "node:test";
import assert from "node:assert/strict";
import atsService from "../modules/ats/ats.service.js";
import atsRepository from "../modules/ats/ats.repository.js";
import { prisma } from "@jobpilot/database";

test("ATS analysis upgrade — JD-vs-resume match scoring (TR-21.1 & TR-21.2)", async (t) => {
  await t.test("TR-21.1: analyzeResume returns score 0–100, scorecard with matched/missing arrays", async () => {
    const origGetResume = atsRepository.getResume;

    atsRepository.getResume = async () => ({
      id: "res-ats-1",
      extractedText: "Proficient in React, TypeScript, Node.js, PostgreSQL, Docker, AWS, Git, and Go.",
    } as any);

    try {
      const result = await atsService.analyzeResume("res-ats-1", {
        jobDescription: "We need React, TypeScript, Node.js, Kubernetes, and GraphQL experience.",
      });

      assert.ok(typeof result.score === "number");
      assert.ok(result.score >= 0 && result.score <= 100);
      assert.ok(Array.isArray(result.strengths));
      assert.ok(Array.isArray(result.matchedKeywords));
      assert.ok(Array.isArray(result.missingKeywords));
      assert.ok(result.scorecard);
      assert.ok(Array.isArray(result.scorecard.matchedKeywords));
      assert.ok(Array.isArray(result.scorecard.missingKeywords));
    } finally {
      atsRepository.getResume = origGetResume;
    }
  });

  await t.test("TR-21.2: Application.matchScore updated after analyze call", async () => {
    const origGetResume = atsRepository.getResume;
    const origPrismaUpdate = (prisma as any).application.update;

    let updatedApplicationId = "";
    let updatedMatchScore = -1;

    atsRepository.getResume = async () => ({
      id: "res-ats-2",
      extractedText: "Experienced with TypeScript, Node.js, PostgreSQL, Docker.",
    } as any);

    (prisma as any).application.update = async (args: any) => {
      updatedApplicationId = args.where.id;
      updatedMatchScore = args.data.matchScore;
      return { id: updatedApplicationId, matchScore: updatedMatchScore };
    };

    try {
      const res = await atsService.analyzeResume("res-ats-2", {
        applicationId: "app-row-99",
        requiredKeywords: ["typescript", "node", "postgresql", "docker"],
      });

      assert.equal(updatedApplicationId, "app-row-99");
      assert.equal(updatedMatchScore, res.score);
      assert.ok(updatedMatchScore >= 80);
    } finally {
      atsRepository.getResume = origGetResume;
      (prisma as any).application.update = origPrismaUpdate;
    }
  });
});
