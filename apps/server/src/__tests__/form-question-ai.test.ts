import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import formQuestionAIService from "../modules/ai/form-question-ai.service.js";
import promptService from "../modules/ai/prompt.service.js";

import type { CandidateContext } from "../modules/agent/candidate/candidate.types.js";

const emptyContext: CandidateContext = {
    skills: [],
    languages: [],
    certifications: [],
    experiences: [],
    education: [],
    projects: [],
};

const sampleContext: CandidateContext = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1-555-0123",
    city: "San Francisco",
    country: "USA",
    currentTitle: "Senior Software Engineer",
    currentCompany: "TechCorp Inc.",
    yearsOfExperience: 8,
    willingToRelocate: true,
    sponsorshipRequired: false,
    skills: ["TypeScript", "Node.js", "React", "PostgreSQL"],
    languages: ["English", "Spanish"],
    certifications: ["AWS Certified Solutions Architect"],
    experiences: [
        "Senior Software Engineer at TechCorp Inc.: Led backend team of 5, designed microservices architecture",
        "Software Engineer at StartupXYZ: Built full-stack features using React and Node.js",
    ],
    education: [
        "Bachelor of Science - Stanford University (Computer Science)",
    ],
    projects: [
        "OpenSource CLI Tool: A developer productivity tool with 10k+ GitHub stars",
    ],
    github: "https://github.com/johndoe",
    linkedin: "https://linkedin.com/in/johndoe",
} as any;

describe("FormQuestionAIService", () => {
    beforeEach(() => {
        formQuestionAIService.invalidateCache();
        formQuestionAIService.setMockProvider(null);
    });

    afterEach(() => {
        formQuestionAIService.setMockProvider(null);
    });

    it("a) cache hit on second identical call, provider invoked once", async () => {
        let callCount = 0;
        formQuestionAIService.setMockProvider(() => {
            callCount++;
            return "John Doe";
        });

        const params = {
            userId: "user-1",
            jobId: "job-1",
            profileContext: sampleContext,
            question: "What is your full name?",
            fieldLabel: "Full Name",
            fieldType: "text",
        };

        const result1 = await formQuestionAIService.answer(params);
        assert.equal(result1.cached, false);
        assert.equal(result1.value, "John Doe");
        assert.equal(result1.grounded, true);
        assert.equal(callCount, 1);

        const result2 = await formQuestionAIService.answer(params);
        assert.equal(result2.cached, true);
        assert.equal(result2.value, "John Doe");
        assert.equal(callCount, 1);

        assert.deepEqual(result1.value, result2.value);
    });

    it("b) N/A response returns empty value with grounded=false, still cached", async () => {
        let callCount = 0;
        formQuestionAIService.setMockProvider(() => {
            callCount++;
            return "N/A";
        });

        const params = {
            userId: "user-2",
            profileContext: sampleContext,
            question: "What is your marital status?",
            fieldLabel: "Marital Status",
            fieldType: "text",
        };

        const result1 = await formQuestionAIService.answer(params);
        assert.equal(result1.value, "");
        assert.equal(result1.grounded, false);
        assert.equal(callCount, 1);

        const result2 = await formQuestionAIService.answer({
            ...params,
            profileContext: sampleContext,
        });
        assert.equal(callCount, 1);
        assert.equal(result2.cached, true);
    });

    it("c) prompt contains PROVIDED FACTS section", async () => {
        let capturedPrompt = "";
        formQuestionAIService.setMockProvider((prompt) => {
            capturedPrompt = prompt;
            return "Test Answer";
        });

        await formQuestionAIService.answer({
            userId: "user-3",
            profileContext: sampleContext,
            question: "What is your email?",
            fieldLabel: "Email Address",
            fieldType: "email",
        });

        assert.match(capturedPrompt, /PROVIDED FACTS:/);
    });

    it("d) answer with empty facts returns N/A = empty grounded=false", async () => {
        formQuestionAIService.setMockProvider(() => "N/A");

        const result = await formQuestionAIService.answer({
            userId: "user-4",
            profileContext: emptyContext,
            question: "What is your work experience?",
            fieldLabel: "Experience",
            fieldType: "textarea",
        });

        assert.equal(result.value, "");
        assert.equal(result.grounded, false);
        assert.deepEqual(result.sourceFacts, []);
    });

    it("e) TTL expiry after 25h causes cache miss, provider called again", async () => {
        let callCount = 0;
        formQuestionAIService.setMockProvider(() => {
            callCount++;
            return "Answer";
        });

        const params = {
            userId: "user-5",
            profileContext: sampleContext,
            question: "Any question?",
            fieldLabel: "Q",
            fieldType: "text",
        };

        const originalNow = Date.now;

        try {
            await formQuestionAIService.answer(params);
            assert.equal(callCount, 1);

            const twentyFiveHoursMs = 25 * 60 * 60 * 1000;
            Date.now = () => originalNow() + twentyFiveHoursMs;

            await formQuestionAIService.answer(params);
            assert.equal(callCount, 2);
        } finally {
            Date.now = originalNow;
        }
    });

    it("prompt.service buildFormQuestionPrompt structure is correct", () => {
        const prompt = promptService.buildFormQuestionPrompt({
            question: "Are you authorized to work in USA?",
            fieldLabel: "Work Authorization",
            fieldType: "checkbox",
            facts: ["firstName: John", "country: USA", "sponsorshipRequired: false"],
            jobDescription: "Senior Developer role at BigCorp",
            resumeText: "John Doe - Senior Engineer",
        });

        assert.match(prompt, /You are an automated form-answering assistant/);
        assert.match(prompt, /PROVIDED FACTS:/);
        assert.match(prompt, /1\. firstName: John/);
        assert.match(prompt, /QUESTION: Are you authorized to work in USA\?/);
        assert.match(prompt, /FIELD LABEL: Work Authorization/);
        assert.match(prompt, /FIELD TYPE: checkbox/);
        assert.match(prompt, /JOB CONTEXT \(optional\):/);
        assert.match(prompt, /Senior Developer role at BigCorp/);
    });

    it("invalidateCache by user clears only that user", async () => {
        formQuestionAIService.setMockProvider(() => "answer");

        const p1 = {
            userId: "user-A",
            profileContext: sampleContext,
            question: "Q1",
            fieldLabel: "L1",
            fieldType: "text",
        };
        const p2 = {
            userId: "user-B",
            profileContext: sampleContext,
            question: "Q1",
            fieldLabel: "L1",
            fieldType: "text",
        };

        let calls = 0;
        formQuestionAIService.setMockProvider(() => {
            calls++;
            return "X";
        });

        await formQuestionAIService.answer(p1);
        await formQuestionAIService.answer(p2);
        assert.equal(calls, 2);

        formQuestionAIService.invalidateCache("user-A");

        await formQuestionAIService.answer(p1);
        assert.equal(calls, 3);

        await formQuestionAIService.answer(p2);
        assert.equal(calls, 3);
    });

    it("long answer trimmed to 400 chars max and 2 lines", async () => {
        const longAnswer =
            "Line one of the answer.\n" +
            "Line two of the answer.\n" +
            "Line three should be cut.\n";

        const veryLong = "A".repeat(500);

        formQuestionAIService.setMockProvider(() => longAnswer);
        const r1 = await formQuestionAIService.answer({
            userId: "u",
            profileContext: sampleContext,
            question: "Tell me about yourself",
        });
        assert.ok(!r1.value.includes("Line three"));

        formQuestionAIService.setMockProvider(() => veryLong);
        formQuestionAIService.invalidateCache();
        const r2 = await formQuestionAIService.answer({
            userId: "u2",
            profileContext: sampleContext,
            question: "Long q",
        });
        assert.ok(r2.value.length <= 400);
    });
});
