import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import resumeExtractor from "../modules/resume/resume.extractor.js";
import resumeParser from "../modules/resume/resume.parser.js";
import candidateService from "../modules/agent/candidate/candidate.service.js";
import liveAtsService from "../modules/sources/live-ats.service.js";
import discoverNode from "../modules/agent/nodes/discover.node.js";
import evaluateNode from "../modules/agent/nodes/evaluate.node.js";
import evaluationService from "../modules/agent/evaluation/evaluation.service.js";
import type { AgentStateType } from "../modules/agent/graph/state.js";

test("Resume Parsing and Extraction", async (t) => {
    await t.test("extracts text from plain text and markdown resume files", async () => {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "jobpilot-resume-"));
        const resumePath = path.join(tempDir, "resume.txt");
        const resumeContent = `
John Doe
Full Stack Engineer | React, TypeScript, Node.js, PostgreSQL

SKILLS:
React, TypeScript, Node.js, Express, Docker, PostgreSQL, AWS, GraphQL

EXPERIENCE:
Senior Software Engineer at Acme Corp (2022 - Present)
- Built scalable fullstack applications using React, Next.js, and Node.js.
- Deployed microservices on AWS with Docker and Kubernetes.

EDUCATION:
B.S. in Computer Science - Tech University (2018 - 2022)
        `.trim();

        await fs.writeFile(resumePath, resumeContent, "utf8");

        const extracted = await resumeExtractor.extract(resumePath, "resume.txt");
        assert.ok(extracted.includes("John Doe"));
        assert.ok(extracted.includes("React"));
        assert.ok(extracted.includes("PostgreSQL"));

        // Cleanup
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    await t.test("parses structured skills and tech keywords from resume text", () => {
        const sampleText = `
Skills:
React, TypeScript, Node.js, Docker, Kubernetes, GraphQL, PostgreSQL, Tailwind

Experience:
Full Stack Developer at StartUp Inc
- Developed web apps using React and Python FastAPI.
        `;

        const parsed = resumeParser.parse(sampleText);
        assert.ok(parsed.skills.length > 0, "Should extract skills");
        assert.ok(parsed.skills.some((s) => s.toLowerCase().includes("react")), "Should contain react");
        assert.ok(parsed.skills.some((s) => s.toLowerCase().includes("typescript")), "Should contain typescript");
        assert.ok(parsed.skills.some((s) => s.toLowerCase().includes("docker")), "Should contain docker");
        assert.ok(parsed.skills.some((s) => s.toLowerCase().includes("python")), "Should contain python");

        const keywords = resumeParser.extractKeywords(sampleText);
        assert.ok(keywords.includes("react"));
        assert.ok(keywords.includes("typescript"));
        assert.ok(keywords.includes("docker"));
    });
});

test("Live ATS Searching and Filtering", async (t) => {
    await t.test("filters jobs based on keyword terms and remote constraints", async () => {
        const mockJobs = [
            {
                externalId: "job-1",
                title: "Senior Full Stack Engineer (React, Node)",
                company: "Stripe",
                url: "https://stripe.com/jobs/1",
                location: "Remote - US",
                description: "Looking for a React and Node.js engineer",
                source: "greenhouse",
            },
            {
                externalId: "job-2",
                title: "Java Backend Developer",
                company: "Oracle",
                url: "https://oracle.com/jobs/2",
                location: "Onsite - New York",
                description: "Spring Boot enterprise development",
                source: "lever",
            },
        ];

        // Search for React with remote=true
        const results = (liveAtsService as any).filterJobs(mockJobs, {
            keyword: "React",
            remote: true,
        });

        assert.equal(results.length, 1);
        assert.equal(results[0].company, "Stripe");
    });
});

test("Agent Discovery and Evaluation with Resume Skills", async (t) => {
    await t.test("evaluates discovered jobs against candidate resume skills and assigns scores", async () => {
        const jobs = [
            {
                id: "job-react",
                title: "Staff Frontend Engineer",
                company: "Vercel",
                url: "https://vercel.com/jobs/react",
                description: "We are hiring for React, TypeScript, Next.js, and Tailwind CSS experts.",
                location: "Remote",
            },
            {
                id: "job-other",
                title: "Mechanical Reliability Engineer",
                company: "Boeing",
                url: "https://boeing.com/jobs/mech",
                description: "Aircraft systems and materials analysis.",
                location: "Seattle, WA",
            },
        ];

        const candidateSkills = ["react", "typescript", "next.js", "tailwind"];
        const evalResult = await evaluationService.evaluate("Frontend Engineer", jobs, candidateSkills);

        assert.ok(evalResult.evaluations.length === 2);

        const vercelEval = evalResult.evaluations.find((e) => e.jobId === "job-react");
        assert.ok(vercelEval);
        assert.ok(vercelEval.score >= 50, `Vercel job score (${vercelEval.score}) should be boosted by resume skills`);
        assert.ok(evalResult.selectedJobIds.includes("job-react"), "React job should be selected");

        const boeingEval = evalResult.evaluations.find((e) => e.jobId === "job-other");
        assert.ok(boeingEval);
        assert.ok(boeingEval.score < vercelEval.score, "Unrelated job should have a lower score");
    });

    await t.test("evaluateNode processes state and selects matching jobs", async () => {
        const mockState = {
            threadId: "test-thread",
            userId: "test-user-id",
            query: "Frontend Engineer",
            jobs: [
                {
                    id: "j1",
                    title: "Frontend React Developer",
                    company: "TechCorp",
                    url: "https://techcorp.com/jobs/1",
                    description: "React and TypeScript web app development",
                },
            ],
            selectedJobs: [],
            evaluated: false,
            ranked: false,
            tailoringInstructions: [],
            applications: [],
            history: [],
            errors: [],
            plannerAction: "EVALUATE",
            plannerReason: "",
        } as unknown as AgentStateType;

        const result = await evaluateNode.execute(mockState);
        assert.equal(result.evaluated, true);
        assert.ok(result.selectedJobs && result.selectedJobs.length > 0);
        assert.ok(result.selectedJobs[0].score !== undefined);
        assert.ok(result.history && result.history.length > 0);
    });
});
