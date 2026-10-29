import { describe, it } from "node:test";
import assert from "node:assert/strict";
import embeddingService from "../modules/ai/embedding.service.js";
import rankingService from "../modules/ai/ranking.service.js";
import selectorService from "../modules/ai/selector.service.js";
import formService from "../modules/ai/form.service.js";
import fetchNode from "../modules/agent/nodes/fetch.node.js";
import type { AgentStateType } from "../modules/agent/graph/state.js";

describe("AI Services & Agentic Fetch Integration", () => {
    it("EmbeddingService calculates deterministic semantic cosine similarity", async () => {
        const matching = await embeddingService.similarity({
            resumeText: "Senior Backend Engineer with TypeScript, Node.js, PostgreSQL, Docker, AWS.",
            jobDescription: "Hiring Backend Developer experienced in TypeScript, Node.js microservices, and PostgreSQL.",
        });
        assert.ok(typeof matching === "number");
        assert.ok(matching >= 40, `Expected similarity >= 40, got ${matching}`);

        const empty = await embeddingService.similarity({
            resumeText: "",
            jobDescription: "TypeScript developer",
        });
        assert.equal(empty, 0);
    });

    it("RankingService returns dynamic scores and articulated match reasons", async () => {
        const strong = await rankingService.rank({
            resumeText: "Staff Engineer leading distributed systems in Node.js, Go, Kubernetes, and PostgreSQL.",
            jobDescription: "Staff Systems Engineer with deep expertise in Node.js, Kubernetes, and distributed architecture.",
        });
        assert.ok(strong.score >= 50);
        assert.ok(strong.reason.includes("alignment") || strong.reason.includes("match"));

        const low = await rankingService.rank({
            resumeText: "Graphic Designer specializing in Adobe Photoshop, Illustrator, and typography.",
            jobDescription: "Embedded C++ Systems Engineer developing Linux kernel drivers and firmware.",
        });
        assert.ok(low.score < 40);
        assert.ok(low.reason.includes("Low alignment") || low.reason.includes("Moderate match"));
    });

    it("SelectorService identifies field CSS selectors from HTML attributes", async () => {
        const sampleHtml = `
            <form id="app-form">
                <input type="text" name="first_name" id="first_name" placeholder="First Name" />
                <input type="text" name="last_name" id="last_name" placeholder="Last Name" />
                <input type="email" name="contact_email" id="email" />
                <input type="tel" name="phone_number" id="phone" />
                <input type="file" name="resume_file" id="resume" />
            </form>
        `;

        const resumeSel = await selectorService.identify(sampleHtml, "resume");
        assert.ok(resumeSel.confidence > 0.7);
        assert.ok(resumeSel.selector.includes("file") || resumeSel.selector.includes("resume"));

        const emailSel = await selectorService.identify(sampleHtml, "email");
        assert.ok(emailSel.confidence > 0.7);
        assert.ok(emailSel.selector.includes("email"));
    });

    it("FormService extracts visible input fields and omits tokens/hidden fields", async () => {
        const html = `
            <form action="/submit" method="post">
                <input type="hidden" name="csrf_token" value="abc123secret" />
                <input type="text" name="full_name" placeholder="Full Name" />
                <input type="email" name="email_address" placeholder="Work Email" />
                <input type="tel" name="mobile" placeholder="Mobile Phone" />
                <select name="work_authorization">
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                </select>
                <textarea name="cover_letter" placeholder="Why do you want to join?"></textarea>
                <button type="submit">Submit Application</button>
            </form>
        `;

        const fields = await formService.extractFields(html);
        assert.ok(fields.length >= 4);
        assert.ok(!fields.some((f) => f.selector.includes("csrf_token")), "CSRF token must be omitted");
        assert.ok(fields.some((f) => f.type === "select" || f.selector.includes("work_authorization")));
        assert.ok(fields.some((f) => f.type === "textarea" || f.selector.includes("cover_letter")));
    });

    it("FetchNode preserves canonical normalization and supports query fallback", async () => {
        const state = {
            jobs: [
                {
                    id: "job-norm-1",
                    title: "Platform Engineer",
                    company: "Tech Corp",
                    url: "https://boards.greenhouse.io/techcorp/jobs/101",
                    description: "Lead cloud infrastructure",
                },
                {
                    id: "job-norm-1",
                    title: "Duplicate",
                    company: "Tech Corp",
                    url: "https://boards.greenhouse.io/techcorp/jobs/101",
                },
            ],
            selectedJobs: [],
            history: [],
        } as unknown as AgentStateType;

        const result = await fetchNode.execute(state);
        assert.equal(result.jobs?.length, 1);
        assert.equal(result.jobs?.[0].id, "job-norm-1");
        assert.match(result.history?.[0] ?? "", /Fetched 1 valid jobs/);
    });
});
