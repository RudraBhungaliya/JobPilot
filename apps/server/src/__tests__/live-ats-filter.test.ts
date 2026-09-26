import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LiveAtsService } from "../modules/sources/live-ats.service.js";
import type { SourceJob, SourceSearchInput } from "../modules/sources/source.types.js";

const svc = new LiveAtsService();
const anySvc = svc as unknown as Record<string, unknown>;

const normalizeLocationForMatch = (loc: string): string => {
    return (anySvc.normalizeLocationForMatch as (loc: string) => string).call(svc, loc);
};

const isRemoteLocation = (loc: string): boolean => {
    return (anySvc.isRemoteLocation as (loc: string) => boolean).call(svc, loc);
};

const isIndiaLocation = (loc: string): boolean => {
    return (anySvc.isIndiaLocation as (loc: string) => boolean).call(svc, loc);
};

const filterJobs = (jobs: SourceJob[], input: SourceSearchInput): SourceJob[] => {
    return (anySvc.filterJobs as (jobs: SourceJob[], input: SourceSearchInput) => SourceJob[]).call(svc, jobs, input);
};

const makeJob = (overrides: Partial<SourceJob> = {}): SourceJob => ({
    externalId: overrides.externalId ?? "test-1",
    title: overrides.title ?? "Software Engineer",
    company: overrides.company ?? "TestCo",
    url: overrides.url ?? "https://example.com/job/1",
    location: overrides.location ?? "Remote",
    description: overrides.description ?? "Build great software",
    source: overrides.source ?? "greenhouse",
});

describe("normalizeLocationForMatch", () => {
    it("maps Bangalore → bengaluru", () => {
        assert.equal(normalizeLocationForMatch("Bangalore"), "bengaluru");
    });

    it("maps Bombay → mumbai", () => {
        assert.equal(normalizeLocationForMatch("Bombay"), "mumbai");
    });

    it("maps Gurgaon → delhi ncr", () => {
        assert.equal(normalizeLocationForMatch("Gurgaon"), "delhi ncr");
    });

    it("trims and lowercases unknown locations unchanged", () => {
        assert.equal(normalizeLocationForMatch("  San Francisco  "), "san francisco");
    });

    it("maps Gurugram → delhi ncr", () => {
        assert.equal(normalizeLocationForMatch("Gurugram"), "delhi ncr");
    });
});

describe("isRemoteLocation", () => {
    it("returns true for 'Remote'", () => {
        assert.equal(isRemoteLocation("Remote"), true);
    });

    it("returns true for 'WFH'", () => {
        assert.equal(isRemoteLocation("WFH"), true);
    });

    it("returns true for 'Work From Home, India'", () => {
        assert.equal(isRemoteLocation("Work From Home, India"), true);
    });

    it("returns true for 'Global'", () => {
        assert.equal(isRemoteLocation("Global"), true);
    });

    it("returns false for 'Mumbai, On-site'", () => {
        assert.equal(isRemoteLocation("Mumbai, On-site"), false);
    });
});

describe("isIndiaLocation", () => {
    it("returns true for 'India'", () => {
        assert.equal(isIndiaLocation("India"), true);
    });

    it("returns true for 'Remote, India'", () => {
        assert.equal(isIndiaLocation("Remote, India"), true);
    });

    it("returns true for 'Bangalore, Karnataka' via canonical hub", () => {
        assert.equal(isIndiaLocation("Bangalore"), true);
    });

    it("returns true for 'Noida' via Delhi NCR canonical", () => {
        assert.equal(isIndiaLocation("Noida"), true);
    });

    it("returns false for 'San Francisco'", () => {
        assert.equal(isIndiaLocation("San Francisco"), false);
    });
});

describe("filterJobs location matching", () => {
    it("location='Bengaluru' keeps 'Bangalore, Karnataka', drops 'Pune'", () => {
        const jobs = [
            makeJob({ externalId: "j1", location: "Bangalore, Karnataka" }),
            makeJob({ externalId: "j2", location: "Pune" }),
        ];
        const result = filterJobs(jobs, { keyword: "", location: "Bengaluru" });
        assert.equal(result.length, 1);
        assert.equal(result[0].externalId, "j1");
    });

    it("location='Delhi NCR' keeps 'Noida, Uttar Pradesh', drops 'Chennai'", () => {
        const jobs = [
            makeJob({ externalId: "j1", location: "Noida, Uttar Pradesh" }),
            makeJob({ externalId: "j2", location: "Chennai" }),
        ];
        const result = filterJobs(jobs, { keyword: "", location: "Delhi NCR" });
        assert.equal(result.length, 1);
        assert.equal(result[0].externalId, "j1");
    });

    it("location='Delhi NCR' keeps 'Gurugram, Haryana'", () => {
        const jobs = [
            makeJob({ externalId: "j1", location: "Gurugram, Haryana" }),
            makeJob({ externalId: "j2", location: "Kolkata" }),
        ];
        const result = filterJobs(jobs, { keyword: "", location: "Delhi NCR" });
        assert.equal(result.length, 1);
        assert.equal(result[0].externalId, "j1");
    });

    it("remote=true keeps 'Remote', drops 'Mumbai, On-site'", () => {
        const jobs = [
            makeJob({ externalId: "j1", location: "Remote" }),
            makeJob({ externalId: "j2", location: "Mumbai, On-site" }),
        ];
        const result = filterJobs(jobs, { keyword: "", remote: true });
        assert.equal(result.length, 1);
        assert.equal(result[0].externalId, "j1");
    });

    it("location='Global Remote' keeps any remote, drops onsite", () => {
        const jobs = [
            makeJob({ externalId: "j1", location: "Remote" }),
            makeJob({ externalId: "j2", location: "WFH" }),
            makeJob({ externalId: "j3", location: "Worldwide" }),
            makeJob({ externalId: "j4", location: "Bengaluru, Hybrid" }),
        ];
        const result = filterJobs(jobs, { keyword: "", location: "Global Remote" });
        assert.equal(result.length, 3);
        assert.ok(result.every((j) => j.externalId !== "j4"));
    });

    it("location='Remote India' keeps remote+india context jobs", () => {
        const jobs = [
            makeJob({ externalId: "j1", location: "Remote, India" }),
            makeJob({ externalId: "j2", location: "Work From Home, Bengaluru" }),
            makeJob({ externalId: "j3", location: "WFH, Noida" }),
            makeJob({ externalId: "j4", location: "Remote" }),
            makeJob({ externalId: "j5", location: "Remote, United States" }),
            makeJob({ externalId: "j6", location: "Bengaluru, On-site" }),
        ];
        const result = filterJobs(jobs, { keyword: "", location: "Remote India" });
        const ids = result.map((j) => j.externalId);
        assert.ok(ids.includes("j1"), "j1 Remote, India should match");
        assert.ok(ids.includes("j2"), "j2 WFH Bengaluru should match");
        assert.ok(ids.includes("j3"), "j3 WFH Noida should match");
        assert.ok(ids.includes("j4"), "j4 generic Remote should match");
        assert.ok(!ids.includes("j5"), "j5 Remote US should not match");
        assert.ok(!ids.includes("j6"), "j6 Bengaluru On-site should not match");
    });

    it("keyword filter combined with location works", () => {
        const jobs = [
            makeJob({ externalId: "j1", title: "Senior Backend Engineer", location: "Bangalore, Karnataka" }),
            makeJob({ externalId: "j2", title: "Frontend Developer", location: "Bangalore, Karnataka" }),
            makeJob({ externalId: "j3", title: "Senior Backend Engineer", location: "Pune" }),
        ];
        const result = filterJobs(jobs, { keyword: "backend senior", location: "Bengaluru" });
        assert.equal(result.length, 1);
        assert.equal(result[0].externalId, "j1");
    });

    it("empty keyword + empty location returns all jobs", () => {
        const jobs = [
            makeJob({ externalId: "j1", location: "Remote" }),
            makeJob({ externalId: "j2", location: "Bengaluru" }),
        ];
        const result = filterJobs(jobs, { keyword: "" });
        assert.equal(result.length, 2);
    });
});
