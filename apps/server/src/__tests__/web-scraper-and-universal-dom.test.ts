import { describe, it } from "node:test";
import assert from "node:assert/strict";
import webScraperSource from "../modules/sources/web-scraper.source.js";
import crawlerService from "../modules/browser/crawler.service.js";
import sourceFactory from "../modules/sources/source.factory.js";
import universalDomAdapter from "../modules/browser/adapters/universal.dom-adapter.js";
import domAtsDetector from "../modules/browser/dom-adapter.detector.js";
import domAdapterBootstrap from "../modules/browser/dom-adapter.bootstrap.js";

describe("Web Scraper Source & Multi-Source Expansion", () => {
    it("SourceFactory registers all 9 sources including web_scraper and remote", () => {
        const sources = sourceFactory.all();
        const names = sources.map((s) => s.name);
        assert.ok(names.includes("greenhouse"), "should have greenhouse");
        assert.ok(names.includes("lever"), "should have lever");
        assert.ok(names.includes("ashby"), "should have ashby");
        assert.ok(names.includes("workday"), "should have workday");
        assert.ok(names.includes("remote"), "should have remote");
        assert.ok(names.includes("indeed"), "should have indeed");
        assert.ok(names.includes("google"), "should have google");
        assert.ok(names.includes("jsearch"), "should have jsearch");
        assert.ok(names.includes("web_scraper"), "should have web_scraper");
        assert.equal(sources.length, 9);
    });

    it("WebScraperSource returns real opening requisitions matching tech keywords", async () => {
        const results = await webScraperSource.search({ keyword: "Software Engineer" });
        assert.ok(results.length > 0, "Should return web scraped openings");
        assert.ok(results.some((j) => j.company === "Uber" || j.company === "Stripe" || j.company === "Atlassian"));
        for (const job of results) {
            assert.ok(job.title, "job must have title");
            assert.ok(job.url.startsWith("http"), "job must have valid HTTP url");
            assert.ok(job.company, "job must have company name");
        }
    });

    it("WebScraperSource filters by location and remote accurately", async () => {
        const blrJobs = await webScraperSource.search({ keyword: "Engineer", location: "Bengaluru" });
        assert.ok(blrJobs.length > 0, "Should match Bengaluru openings");
        assert.ok(blrJobs.every((j) => j.location.toLowerCase().includes("bengaluru") || j.location.toLowerCase().includes("bangalore")));

        const remoteJobs = await webScraperSource.search({ keyword: "Engineer", remote: true });
        assert.ok(remoteJobs.length > 0, "Should return remote openings");
        assert.ok(remoteJobs.some((j) => j.location.toLowerCase().includes("remote") || j.title.toLowerCase().includes("remote")));
    });

    it("CrawlerService crawls live web openings matching search filter queries", async () => {
        const crawled = await crawlerService.crawl({
            keywords: ["Backend", "Engineer"],
            location: "Bengaluru",
        });
        assert.ok(Array.isArray(crawled));
        assert.ok(crawled.length > 0);
        assert.ok(crawled[0].url.startsWith("http"));
        assert.ok(crawled[0].tags.length > 0);
    });
});

describe("Universal DOM Adapter for Arbitrary Real Openings", () => {
    it("UniversalDomAdapter has name 'universal'", () => {
        assert.equal(universalDomAdapter.name, "universal");
    });

    it("UniversalDomAdapter registers cleanly in dom-adapter bootstrap and detector", () => {
        domAdapterBootstrap.initialize();
        const adapters = domAtsDetector.list();
        const names = adapters.map((a) => a.name);
        assert.ok(names.includes("universal"), "universal adapter should be registered in domAtsDetector");
        assert.ok(names.includes("greenhouse-dom"));
        assert.ok(names.includes("lever-dom"));
        assert.ok(names.includes("ashby-dom"));
        assert.ok(names.includes("workday-dom"));
    });
});
