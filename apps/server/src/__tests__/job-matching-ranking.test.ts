import test from "node:test";
import assert from "node:assert/strict";
import matchingService from "../modules/agent/evaluation/matching.service.js";
import evaluationService from "../modules/agent/evaluation/evaluation.service.js";
import jobMatchingService from "../modules/matching/job-matching.service.js";
import { prisma } from "@jobpilot/database";
import type { CandidateContext } from "../modules/agent/candidate/candidate.types.js";

test("Job Matching & Ranking Module Suite", async (suite) => {
  const sampleCandidateContext: CandidateContext = {
    firstName: "Rudra",
    lastName: "B",
    currentTitle: "Full Stack Engineer",
    yearsOfExperience: 4,
    skills: [
      { name: "TypeScript" },
      { name: "Node.js" },
      { name: "React" },
      { name: "PostgreSQL" },
      { name: "Docker" },
      { name: "AWS" },
    ],
    educations: [
      {
        degree: "B.Tech in Computer Science",
        institution: "IIT Bombay",
        fieldOfStudy: "Computer Science",
      },
    ],
    city: "Bengaluru",
    country: "India",
    workMode: "HYBRID",
    remoteOnly: false,
  };

  await suite.test("1. Skills Matcher detects matched and missing skills deterministically", () => {
    const candidateSkills = ["TypeScript", "Node.js", "React", "PostgreSQL"];
    const jobDescription = `
      We are hiring a Senior Software Engineer.
      Requirements:
      - 4+ years building backend systems with TypeScript and Node.js
      - Frontend proficiency with React
      - Strong knowledge of PostgreSQL
      - Experience with Kubernetes and Kafka is a huge plus.
    `;

    const result = matchingService.matchSkills(candidateSkills, jobDescription);

    // Matched skills should be TypeScript, Node.js, React, PostgreSQL
    assert.ok(result.matchedSkills.includes("TypeScript"), "Should match TypeScript");
    assert.ok(result.matchedSkills.includes("Node.js"), "Should match Node.js");
    assert.ok(result.matchedSkills.includes("React"), "Should match React");
    assert.ok(result.matchedSkills.includes("PostgreSQL"), "Should match PostgreSQL");

    // Missing skills should include Kubernetes and Kafka
    assert.ok(result.missingSkills.includes("Kubernetes"), "Should identify Kubernetes as missing");
    assert.ok(result.missingSkills.includes("Kafka"), "Should identify Kafka as missing");

    // Score should reflect matched skills out of detected requirements
    assert.ok(result.score >= 50 && result.score <= 75, `Score was ${result.score}`);
    assert.ok(result.reason.includes("Matched 4 skills"), "Reason should explain match");
  });

  await suite.test("2. Experience Matcher evaluates seniority and candidate experience accurately", () => {
    // 4 years experience matches 3-5 years range
    const midJob = "We require 3-5 years of hands-on software development experience.";
    const midResult = matchingService.matchExperience(4, midJob);
    assert.equal(midResult.score, 100);
    assert.equal(midResult.expectedYears, 3);

    // 4 years experience is slightly below 7+ years Staff role
    const staffJob = "Staff Engineer: 7+ years of distributed systems engineering.";
    const staffResult = matchingService.matchExperience(4, staffJob);
    assert.ok(staffResult.score < 80, "Underqualified experience should have lower score");
    assert.equal(staffResult.expectedYears, 7);

    // Intern position for 4 years experience
    const internJob = "Software Engineering Intern position for university students.";
    const internResult = matchingService.matchExperience(4, internJob);
    assert.ok(internResult.score <= 85);
  });

  await suite.test("3. Education Matcher handles Bachelor/Master degrees correctly", () => {
    const candidateEdu = [{ degree: "B.Tech Computer Science", institution: "IIT" }];

    // Job requires Bachelor's
    const bachelorsJob = "Bachelor's degree in Computer Science or related field required.";
    const bResult = matchingService.matchEducation(candidateEdu, bachelorsJob);
    assert.equal(bResult.score, 100);

    // Job requires PhD
    const phdJob = "PhD in Artificial Intelligence required for this research role.";
    const phdResult = matchingService.matchEducation(candidateEdu, phdJob);
    assert.ok(phdResult.score <= 50, "Candidate lacks required PhD");
  });

  await suite.test("4. Location Matcher evaluates Remote vs Onsite vs Regional hubs", () => {
    // Candidate in Bengaluru, flexible
    const remoteJob = matchingService.matchLocation("Bengaluru", ["Bengaluru"], "HYBRID_OR_REMOTE", "Remote", "REMOTE");
    assert.equal(remoteJob.score, 95);

    const sameCityJob = matchingService.matchLocation("Bengaluru", ["Bengaluru"], "HYBRID_OR_REMOTE", "Bengaluru, Karnataka");
    assert.equal(sameCityJob.score, 100);

    const outsideJob = matchingService.matchLocation("Bengaluru", ["Bengaluru"], "REMOTE_ONLY", "San Francisco, CA (Onsite)");
    assert.equal(outsideJob.score, 20, "Onsite job should score low when remote-only requested");
  });

  await suite.test("5. evaluateCandidateForJob generates reliable multi-dimensional scorecard", () => {
    const job = {
      id: "job-stripe-1",
      title: "Senior Full Stack Engineer",
      company: "Stripe",
      location: "Bengaluru, India",
      workMode: "HYBRID",
      description: `
        Join Stripe payments team in Bengaluru.
        Skills required: TypeScript, React, Node.js, PostgreSQL, AWS, Docker.
        Experience: 3-6 years building scalable web services.
        Bachelor's degree in Computer Science.
      `,
    };

    const scorecard = evaluationService.evaluateCandidateForJob(sampleCandidateContext, job, {
      priorityStrategy: "MNC_FIRST",
      targetJobTitles: ["Full Stack Engineer"],
      targetLocations: ["Bengaluru"],
    });

    // Scorecard assertions
    assert.ok(scorecard.matchScore >= 80, `Expected high match score, got: ${scorecard.matchScore}`);
    assert.equal(scorecard.companyTier, "S", "Stripe should be S-tier company");
    assert.ok(scorecard.matchedSkills.length >= 4, "Should match primary skills");
    assert.equal(scorecard.breakdown.education, 100);
    assert.equal(scorecard.breakdown.experience, 100);
    assert.ok(scorecard.breakdown.location >= 85);
    assert.ok(scorecard.reasons.length >= 2, "Should provide clear human-readable reasons");
  });

  await suite.test("6. matchAndRankJobs ranks jobs according to loop priority strategy", () => {
    const jobs = [
      {
        id: "job-startup",
        title: "Full Stack Engineer",
        company: "UnknownStartup", // Tier C
        location: "Bengaluru",
        description: "TypeScript, Node.js, React, PostgreSQL",
        createdAt: new Date("2026-10-01"),
      },
      {
        id: "job-google",
        title: "Full Stack Engineer",
        company: "Google", // Tier S
        location: "Bengaluru",
        description: "TypeScript, Node.js, React, PostgreSQL",
        createdAt: new Date("2026-09-20"),
      },
      {
        id: "job-swiggy",
        title: "Full Stack Engineer",
        company: "Swiggy", // Tier B
        location: "Bengaluru",
        description: "TypeScript, Node.js, React, PostgreSQL",
        createdAt: new Date("2026-10-05"),
      },
    ];

    // Priority 1: MNC_FIRST strategy (Google S-Tier should be #1)
    const mncRanked = evaluationService.matchAndRankJobs(sampleCandidateContext, jobs, {
      priorityStrategy: "MNC_FIRST",
      targetJobTitles: ["Full Stack Engineer"],
    });

    assert.equal(mncRanked[0].job.company, "Google", "MNC_FIRST should rank Google #1");
    assert.equal(mncRanked[0].rank, 1);
    assert.equal(mncRanked[1].job.company, "Swiggy", "Tier B should rank before Tier C");
    assert.equal(mncRanked[1].rank, 2);
    assert.equal(mncRanked[2].job.company, "UnknownStartup", "Tier C should rank last");
    assert.equal(mncRanked[2].rank, 3);

    // Priority 2: RECENT_FIRST strategy
    const recentRanked = evaluationService.matchAndRankJobs(sampleCandidateContext, jobs, {
      priorityStrategy: "RECENT_FIRST",
      targetJobTitles: ["Full Stack Engineer"],
    });

    assert.equal(recentRanked[0].job.company, "Swiggy", "RECENT_FIRST should rank most recent date first");
    assert.equal(recentRanked[0].rank, 1);
  });

  await suite.test("7. JobMatchingService persists match results and does not trigger Auto-Apply", async () => {
    const userId = "user-match-test";
    const loopId = "loop-match-1";

    const fakeLoop = {
      id: loopId,
      userId,
      name: "Bangalore Full Stack Campaign",
      targetJobTitles: ["Full Stack Engineer"],
      targetLocations: ["Bengaluru"],
      targetCountries: ["India"],
      remotePreference: "HYBRID_OR_REMOTE",
      priorityStrategy: "MNC_FIRST",
      targetTiers: ["S", "A", "B"],
      resumeId: "resume-1",
      autoApplyEnabled: true,
    };

    const mockJobsInDb = [
      {
        id: "db-job-1",
        title: "Senior Full Stack Engineer",
        location: "Bengaluru",
        url: "https://stripe.com/jobs/1",
        description: "TypeScript, Node.js, React, PostgreSQL",
        tags: [fakeLoop.name],
        notes: null,
        company: { name: "Stripe" },
        createdAt: new Date(),
      },
    ];

    // Track DB operations
    let updatedJobNotes: string | null = null;
    let applicationCreated: any = null;
    let queueJobCreatedCount = 0;

    const origFindLoop = (prisma as any).jobSearchLoop.findFirst;
    const origFindJobs = (prisma as any).job.findMany;
    const origUpdateJob = (prisma as any).job.update;
    const origFindProfile = (prisma as any).profile.findUnique;
    const origFindResume = (prisma as any).resume.findUnique;
    const origFindUser = (prisma as any).user.findUnique;
    const origFindApp = (prisma as any).application.findUnique;
    const origCreateApp = (prisma as any).application.create;
    const origCreateQueue = (prisma as any).queueJob.create;

    (prisma as any).jobSearchLoop.findFirst = async () => fakeLoop;
    (prisma as any).job.findMany = async () => mockJobsInDb;
    (prisma as any).job.update = async (args: any) => {
      updatedJobNotes = args.data.notes;
      return { ...mockJobsInDb[0], ...args.data };
    };
    (prisma as any).profile.findUnique = async () => ({
      id: "profile-1",
      userId,
      skills: [{ name: "TypeScript" }, { name: "Node.js" }, { name: "React" }, { name: "PostgreSQL" }],
      experiences: [{ company: "Acme", title: "Full Stack Engineer" }],
      educations: [{ degree: "B.Tech Computer Science", institution: "IIT" }],
      yearsOfExperience: 4,
      city: "Bengaluru",
      country: "India",
    });
    (prisma as any).resume.findUnique = async () => ({
      id: "resume-1",
      userId,
      extractedText: "Skills: TypeScript, Node.js, React, PostgreSQL. Experience: 4 years.",
    });
    (prisma as any).user.findUnique = async () => ({ id: userId, email: "user@test.com" });
    (prisma as any).application.findUnique = async () => null;
    (prisma as any).application.create = async (args: any) => {
      applicationCreated = args.data;
      return { id: "app-created-1", ...args.data };
    };
    (prisma as any).queueJob.create = async () => {
      queueJobCreatedCount++;
      return { id: "q-1" };
    };

    try {
      const results = await jobMatchingService.matchAndRankLoopJobs(loopId, userId, {
        persistApplications: true,
      });

      assert.equal(results.length, 1);
      assert.ok(results[0].matchScore >= 70);

      // Verify scorecard was persisted in Job notes
      assert.ok(updatedJobNotes, "Job notes should be updated with scorecard");
      const parsedNotes = JSON.parse(updatedJobNotes);
      assert.ok(parsedNotes.matchScore >= 70);
      assert.equal(parsedNotes.companyTier, "S");

      // Verify Application record was created with status MATCHED
      assert.ok(applicationCreated, "Application record should be created");
      assert.equal(applicationCreated.status, "MATCHED");
      assert.equal(applicationCreated.jobId, "db-job-1");
      assert.equal(applicationCreated.userId, userId);

      // CRITICAL: verify QueueJob / Auto-apply was NOT dispatched
      assert.equal(queueJobCreatedCount, 0, "Auto-apply queue job must NOT be created");
    } finally {
      (prisma as any).jobSearchLoop.findFirst = origFindLoop;
      (prisma as any).job.findMany = origFindJobs;
      (prisma as any).job.update = origUpdateJob;
      (prisma as any).profile.findUnique = origFindProfile;
      (prisma as any).resume.findUnique = origFindResume;
      (prisma as any).user.findUnique = origFindUser;
      (prisma as any).application.findUnique = origFindApp;
      (prisma as any).application.create = origCreateApp;
      (prisma as any).queueJob.create = origCreateQueue;
    }
  });
});
