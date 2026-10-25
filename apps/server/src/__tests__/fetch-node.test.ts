import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fetchNode from "../modules/agent/nodes/fetch.node.js";
import type { AgentStateType } from "../modules/agent/graph/state.js";

const makeState = (jobs: AgentStateType["jobs"], selectedJobs: AgentStateType["selectedJobs"] = []) =>
    ({
        jobs,
        selectedJobs,
        history: [],
    }) as unknown as AgentStateType;

describe("FetchNode", () => {
    it("normalizes valid jobs and removes malformed or duplicate records", async () => {
        const update = await fetchNode.execute(makeState([
            {
                id: " job-1 ",
                title: "  Backend Engineer  ",
                company: "  Acme  ",
                url: "https://jobs.acme.test/roles/1/",
                description: "  Build APIs  ",
            },
            {
                id: "job-1",
                title: "Duplicate",
                company: "Acme",
                url: "https://jobs.acme.test/roles/1",
            },
            {
                id: "job-duplicate-url",
                title: "Duplicate URL",
                company: "Acme",
                url: "https://jobs.acme.test/roles/1",
            },
            {
                id: "job-2",
                title: "Missing URL",
                company: "Acme",
                url: "",
            },
        ]));

        assert.deepEqual(update.jobs, [{
            id: "job-1",
            title: "Backend Engineer",
            company: "Acme",
            url: "https://jobs.acme.test/roles/1/",
            description: "Build APIs",
            location: undefined,
            source: undefined,
            platform: undefined,
        }]);
        assert.match(update.history?.[0] ?? "", /Fetched 1 valid jobs and skipped 3/);
    });

    it("reconciles selected jobs with the fetched set", async () => {
        const jobs = [{
            id: "job-1",
            title: "Engineer",
            company: "Acme",
            url: "https://acme.test/jobs/1",
        }];
        const update = await fetchNode.execute(makeState(jobs, [
            ...jobs,
            {
                id: "stale",
                title: "Stale",
                company: "Acme",
                url: "https://acme.test/jobs/stale",
            },
        ]));

        assert.deepEqual(update.selectedJobs, jobs);
    });

    it("returns an explicit empty result when all records are invalid", async () => {
        const update = await fetchNode.execute(makeState([{
            id: "local",
            title: "Engineer",
            company: "Acme",
            url: "http://localhost:3000/jobs/1",
        }]));

        assert.deepEqual(update.jobs, []);
        assert.deepEqual(update.selectedJobs, []);
        assert.match(update.history?.[0] ?? "", /no valid jobs/i);
    });
});
