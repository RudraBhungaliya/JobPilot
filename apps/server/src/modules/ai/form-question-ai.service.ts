import { createHash } from "node:crypto";

import promptService from "./prompt.service.js";
import providerFactory from "../../core/llm/provider.factory.js";
import candidateService from "../agent/candidate/candidate.service.js";

import type { CandidateContext } from "../agent/candidate/candidate.types.js";

interface CacheEntry {
    value: string;
    grounded: boolean;
    timestamp: number;
    sourceFacts: string[];
}

type MockProviderFn = (prompt: string) => string;

const TTL_MS = 86_400_000;
const MAX_CACHE_SIZE = 2000;

class FormQuestionAIService {
    private cache: Map<string, CacheEntry> = new Map();
    private mockProvider: MockProviderFn | null = null;

    setMockProvider(fn: MockProviderFn | null): void {
        this.mockProvider = fn;
    }

    private cacheKey(
        userId: string,
        jobId: string | undefined,
        question: string,
        fieldLabel: string | undefined,
        fieldType: string | undefined,
    ): string {
        const hashInput = `${question.toLowerCase().trim()}|${(fieldLabel ?? "").toLowerCase().trim()}|${(fieldType ?? "").toLowerCase().trim()}`;
        const questionHash = createHash("sha1").update(hashInput).digest("hex");
        return `fq:${userId}:${jobId || "global"}:${questionHash}`;
    }

    private evictIfNeeded(): void {
        while (this.cache.size > MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
    }

    private buildFacts(profileContext: CandidateContext): string[] {
        const facts: string[] = [];

        const scalarFields: Array<keyof CandidateContext> = [
            "firstName",
            "middleName",
            "lastName",
            "email",
            "phone",
            "address",
            "city",
            "state",
            "country",
            "zipCode",
            "currentTitle",
            "currentCompany",
            "yearsOfExperience",
            "expectedSalary",
            "currentSalary",
            "noticePeriod",
            "github",
            "linkedin",
            "portfolio",
            "website",
            "leetcode",
            "codeforces",
            "workMode",
            "employmentType",
            "willingToRelocate",
            "willingToTravel",
            "remoteOnly",
            "sponsorshipRequired",
            "visaStatus",
            "governmentEmployee",
            "militaryService",
            "veteran",
            "criminalRecord",
            "securityClearance",
            "disability",
            "summary",
            "resumeText",
        ];

        for (const field of scalarFields) {
            const value = profileContext[field];
            if (value !== null && value !== undefined && value !== "") {
                facts.push(`${String(field)}: ${String(value)}`);
            }
        }

        const educations = profileContext.education || (profileContext.educations as any[]) || [];
        if (educations.length) {
            educations.forEach((edu: any, i: number) => {
                facts.push(`Education ${i + 1}: ${typeof edu === "string" ? edu : edu?.degree ? `${edu.degree} - ${edu.institution}` : JSON.stringify(edu)}`);
            });
        }

        if (profileContext.experiences?.length) {
            profileContext.experiences.forEach((exp: any, i: number) => {
                facts.push(`Experience ${i + 1}: ${typeof exp === "string" ? exp : exp?.title ? `${exp.title} at ${exp.company}` : JSON.stringify(exp)}`);
            });
        }

        if (profileContext.skills?.length) {
            const skillStrings = profileContext.skills.map((s: any) => typeof s === "string" ? s : s?.name || "").filter(Boolean);
            facts.push(`Skills: ${skillStrings.join(", ")}`);
        }

        if (profileContext.languages?.length) {
            const langStrings = profileContext.languages.map((l: any) => typeof l === "string" ? l : l?.name || "").filter(Boolean);
            facts.push(`Languages: ${langStrings.join(", ")}`);
        }

        if (profileContext.certifications?.length) {
            const certStrings = profileContext.certifications.map((c: any) => typeof c === "string" ? c : c?.name || "").filter(Boolean);
            facts.push(`Certifications: ${certStrings.join(", ")}`);
        }

        const projects = profileContext.projects || (profileContext.profileProjects as any[]) || [];
        if (projects.length) {
            projects.forEach((proj: any, i: number) => {
                facts.push(`Project ${i + 1}: ${typeof proj === "string" ? proj : proj?.title ? `${proj.title}: ${proj.description || ""}` : JSON.stringify(proj)}`);
            });
        }

        const links: string[] = [];
        if (profileContext.github) links.push(`github: ${profileContext.github}`);
        if (profileContext.linkedin) links.push(`linkedin: ${profileContext.linkedin}`);
        if (profileContext.portfolio) links.push(`portfolio: ${profileContext.portfolio}`);
        if (profileContext.website) links.push(`website: ${profileContext.website}`);
        if (profileContext.leetcode) links.push(`leetcode: ${profileContext.leetcode}`);
        if (profileContext.codeforces) links.push(`codeforces: ${profileContext.codeforces}`);
        if (links.length) {
            facts.push(`Links: ${links.join("; ")}`);
        }

        return facts;
    }

    async answer(params: {
        userId: string;
        jobId?: string;
        jobDescription?: string;
        profileContext: CandidateContext;
        resumeText?: string;
        question: string;
        fieldLabel?: string;
        fieldType?: string;
    }): Promise<{
        value: string;
        grounded: boolean;
        sourceFacts: string[];
        cached: boolean;
    }> {
        const {
            userId,
            jobId,
            jobDescription,
            profileContext,
            resumeText,
            question,
            fieldLabel,
            fieldType,
        } = params;

        const key = this.cacheKey(userId, jobId, question, fieldLabel, fieldType);
        const now = Date.now();

        const cached = this.cache.get(key);
        if (
            cached &&
            now - cached.timestamp < TTL_MS
        ) {
            return {
                value: cached.value,
                grounded: cached.grounded,
                sourceFacts: cached.sourceFacts,
                cached: true,
            };
        }

        const facts = this.buildFacts(profileContext);
        const prompt = promptService.buildFormQuestionPrompt({
            question,
            fieldLabel,
            fieldType,
            facts,
            jobDescription,
            resumeText: resumeText || profileContext.resumeText || undefined,
        });

        let rawOutput: string;
        if (this.mockProvider) {
            rawOutput = this.mockProvider(prompt);
        } else {
            const provider = providerFactory.getProvider();
            rawOutput = await provider.generate(prompt);
        }

        let value = rawOutput.trim();
        let grounded = true;

        const lower = value.toLowerCase();
        if (
            value === "" ||
            lower === "n/a" ||
            lower === "not available"
        ) {
            value = "";
            grounded = false;
        } else {
            const lines = value.split("\n").filter((l) => l.trim() !== "");
            if (lines.length > 2) {
                value = lines.slice(0, 2).join(" ").trim();
            }
            if (value.length > 400) {
                value = value.slice(0, 400);
            }
        }

        const entry: CacheEntry = {
            value,
            grounded,
            timestamp: now,
            sourceFacts: facts,
        };
        this.cache.set(key, entry);
        this.evictIfNeeded();

        return {
            value,
            grounded,
            sourceFacts: facts,
            cached: false,
        };
    }

    invalidateCache(userId?: string): void {
        if (!userId) {
            this.cache.clear();
            return;
        }
        const prefix = `fq:${userId}:`;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }
}

export default new FormQuestionAIService();
