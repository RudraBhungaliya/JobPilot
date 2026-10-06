export const KNOWN_TECH_SKILLS: Array<{ name: string; pattern: RegExp }> = [
    { name: "TypeScript", pattern: /\btypescript\b|\bts\b/i },
    { name: "JavaScript", pattern: /\bjavascript\b|\bjs\b/i },
    { name: "React", pattern: /\breact(?:\.js|js)?\b/i },
    { name: "Next.js", pattern: /\bnext(?:\.js|js)?\b/i },
    { name: "Node.js", pattern: /\bnode(?:\.js|js)?\b/i },
    { name: "Python", pattern: /\bpython\b/i },
    { name: "Java", pattern: /\bjava\b(?!script)/i },
    { name: "C++", pattern: /\bc\+\+\b/i },
    { name: "C#", pattern: /\bc#\b|\bcsharp\b/i },
    { name: "Golang", pattern: /\bgolang\b|\bgo\s+(?:developer|engineer|backend)\b/i },
    { name: "Rust", pattern: /\brust\b/i },
    { name: "PostgreSQL", pattern: /\bpostgres(?:ql)?\b/i },
    { name: "MySQL", pattern: /\bmysql\b/i },
    { name: "MongoDB", pattern: /\bmongodb\b|\bmongo\b/i },
    { name: "Redis", pattern: /\bredis\b/i },
    { name: "GraphQL", pattern: /\bgraphql\b/i },
    { name: "REST", pattern: /\brest(?:ful)?\b/i },
    { name: "Docker", pattern: /\bdocker\b/i },
    { name: "Kubernetes", pattern: /\bkubernetes\b|\bk8s\b/i },
    { name: "AWS", pattern: /\baws\b|amazon\s+web\s+services/i },
    { name: "GCP", pattern: /\bgcp\b|google\s+cloud/i },
    { name: "Azure", pattern: /\bazure\b/i },
    { name: "Tailwind CSS", pattern: /\btailwind(?:\s*css)?\b/i },
    { name: "HTML", pattern: /\bhtml5?\b/i },
    { name: "CSS", pattern: /\bcss3?\b/i },
    { name: "Git", pattern: /\bgit\b(?!lab|hub)/i },
    { name: "Kafka", pattern: /\bkafka\b/i },
    { name: "RabbitMQ", pattern: /\brabbitmq\b/i },
    { name: "Elasticsearch", pattern: /\belasticsearch\b/i },
    { name: "Microservices", pattern: /\bmicroservices?\b/i },
    { name: "System Design", pattern: /\bsystem\s+design\b/i },
    { name: "Distributed Systems", pattern: /\bdistributed\s+systems?\b/i },
    { name: "FastAPI", pattern: /\bfastapi\b/i },
    { name: "Django", pattern: /\bdjango\b/i },
    { name: "Flask", pattern: /\bflask\b/i },
    { name: "Spring Boot", pattern: /\bspring(?:\s+boot)?\b/i },
    { name: "Prisma", pattern: /\bprisma\b/i },
    { name: "Playwright", pattern: /\bplaywright\b/i },
    { name: "Cypress", pattern: /\bcypress\b/i },
    { name: "Jest", pattern: /\bjest\b/i },
    { name: "Linux", pattern: /\blinux\b/i },
    { name: "Vue.js", pattern: /\bvue(?:\.js|js)?\b/i },
    { name: "Angular", pattern: /\bangular\b/i },
    { name: "SQL", pattern: /\bsql\b/i },
    { name: "CI/CD", pattern: /\bci\/?cd\b/i },
    { name: "Terraform", pattern: /\bterraform\b/i },
];

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class MatchingService {
    /**
     * Legacy term-based query matching for backward compatibility.
     */
    match(
        query: string,
        jobTitle: string,
        company: string,
    ): string[] {
        const queryTerms = query
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);

        const title = jobTitle.toLowerCase();
        const companyName = company.toLowerCase();

        return queryTerms.filter(
            (term) =>
                title.includes(term) ||
                companyName.includes(term),
        );
    }

    /**
     * Real skill matching against job description and title.
     * Identifies matched skills and missing skills deterministically without fabrication.
     */
    matchSkills(
        candidateSkills: string[] = [],
        jobText: string = "",
    ): {
        matchedSkills: string[];
        missingSkills: string[];
        score: number;
        reason: string;
    } {
        const text = jobText.toLowerCase();
        const normalizedCandidate = Array.from(
            new Set(candidateSkills.map((s) => s.trim()).filter(Boolean))
        );

        // 1. Identify skills mentioned in the job text from known patterns
        const jobRequiredSkills: string[] = [];
        for (const skill of KNOWN_TECH_SKILLS) {
            if (skill.pattern.test(text)) {
                jobRequiredSkills.push(skill.name);
            }
        }

        // 2. Also check if any candidate skills appear verbatim in the job text
        for (const candSkill of normalizedCandidate) {
            if (candSkill.length < 2) continue;
            const reg = new RegExp(`\\b${escapeRegex(candSkill)}\\b`, "i");
            if (reg.test(text) && !jobRequiredSkills.some((s) => s.toLowerCase() === candSkill.toLowerCase())) {
                jobRequiredSkills.push(candSkill);
            }
        }

        // 3. Find matched skills (intersection between candidate and job)
        const matchedSkills: string[] = [];
        for (const candSkill of normalizedCandidate) {
            const lowerCand = candSkill.toLowerCase();
            const foundInJob = jobRequiredSkills.some((j) => j.toLowerCase() === lowerCand) ||
                new RegExp(`\\b${escapeRegex(candSkill)}\\b`, "i").test(text);

            if (foundInJob && !matchedSkills.some((m) => m.toLowerCase() === lowerCand)) {
                matchedSkills.push(candSkill);
            }
        }

        // 4. Find missing skills (job required skills not present in candidate skills)
        const missingSkills: string[] = [];
        for (const reqSkill of jobRequiredSkills) {
            const lowerReq = reqSkill.toLowerCase();
            const hasSkill = normalizedCandidate.some((c) => c.toLowerCase() === lowerReq);
            if (!hasSkill && !missingSkills.some((m) => m.toLowerCase() === lowerReq)) {
                missingSkills.push(reqSkill);
            }
        }

        // 5. Calculate reliable skill score
        let score = 0;
        let reason = "";

        const totalSkills = matchedSkills.length + missingSkills.length;
        if (totalSkills > 0) {
            score = Math.round((matchedSkills.length / totalSkills) * 100);
            if (matchedSkills.length > 0 && missingSkills.length === 0) {
                reason = `All ${matchedSkills.length} required skills matched (${matchedSkills.slice(0, 5).join(", ")})`;
            } else if (matchedSkills.length > 0) {
                reason = `Matched ${matchedSkills.length} skills (${matchedSkills.slice(0, 4).join(", ")}); missing ${missingSkills.slice(0, 3).join(", ")}`;
            } else {
                reason = `No overlapping skills found; job demands ${missingSkills.slice(0, 4).join(", ")}`;
            }
        } else {
            // Job description has no specific tech keywords: match based on candidate skill presence in text
            if (matchedSkills.length > 0) {
                score = Math.min(90, 50 + matchedSkills.length * 15);
                reason = `Matched general skills: ${matchedSkills.join(", ")}`;
            } else {
                score = 30;
                reason = "No explicitly specified technical skills found in posting";
            }
        }

        return {
            matchedSkills,
            missingSkills,
            score: Math.max(0, Math.min(100, score)),
            reason,
        };
    }

    /**
     * Real experience match comparing candidate's actual years/level against job requirements.
     */
    matchExperience(
        candidateYears: number | null | undefined,
        jobText: string = "",
        candidateRoleTitle?: string | null,
    ): {
        score: number;
        reason: string;
        expectedYears: number | null;
    } {
        const text = jobText.toLowerCase();

        // 1. Detect explicit years of experience in job description (e.g. "3-5 years", "4+ years")
        let expectedMin: number | null = null;
        let expectedMax: number | null = null;

        const expMatch = text.match(/(\d+)\+?\s*(?:-|to)\s*(\d+)\s*(?:years?|yrs?)/i) ||
            text.match(/(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp)/i);

        if (expMatch) {
            expectedMin = parseInt(expMatch[1], 10);
            if (expMatch[2]) {
                expectedMax = parseInt(expMatch[2], 10);
            }
        }

        // 2. Infer seniority from title if no explicit years
        if (expectedMin === null) {
            if (/\b(?:intern|internship)\b/i.test(text)) {
                expectedMin = 0;
                expectedMax = 1;
            } else if (/\b(?:junior|entry[\s-]level|associate|grad)\b/i.test(text)) {
                expectedMin = 1;
                expectedMax = 3;
            } else if (/\b(?:lead|staff|principal|architect|director|head)\b/i.test(text)) {
                expectedMin = 7;
            } else if (/\b(?:senior|sr\.?)\b/i.test(text)) {
                expectedMin = 5;
            } else if (/\b(?:mid[\s-]level|intermediate)\b/i.test(text)) {
                expectedMin = 3;
                expectedMax = 5;
            }
        }

        // 3. Evaluate match
        const actualYears = typeof candidateYears === "number" && !isNaN(candidateYears)
            ? candidateYears
            : null;

        if (expectedMin !== null && actualYears !== null) {
            const max = expectedMax ?? expectedMin + 3;
            if (actualYears >= expectedMin && actualYears <= max + 1) {
                return {
                    score: 100,
                    reason: `Candidate experience (${actualYears} yrs) matches expected ${expectedMin}${expectedMax ? `-${expectedMax}` : "+"} yrs`,
                    expectedYears: expectedMin,
                };
            }
            if (actualYears === expectedMin - 1) {
                return {
                    score: 85,
                    reason: `Candidate experience (${actualYears} yrs) is very close to expected ${expectedMin}+ yrs`,
                    expectedYears: expectedMin,
                };
            }
            if (actualYears < expectedMin) {
                const diff = expectedMin - actualYears;
                const score = Math.max(30, 80 - diff * 20);
                return {
                    score,
                    reason: `Candidate has ${actualYears} yrs; job prefers ${expectedMin}+ yrs`,
                    expectedYears: expectedMin,
                };
            }
            // Overqualified
            return {
                score: 80,
                reason: `Candidate has ${actualYears} yrs; exceeds expected ${expectedMin} yrs`,
                expectedYears: expectedMin,
            };
        }

        // Seniority keyword match against candidate's current title if years not known
        if (candidateRoleTitle && expectedMin !== null) {
            const role = candidateRoleTitle.toLowerCase();
            const isSeniorRole = /senior|lead|principal|staff/i.test(role);
            if (expectedMin >= 5 && isSeniorRole) {
                return { score: 90, reason: "Candidate holds senior role matching job seniority", expectedYears: expectedMin };
            }
        }

        return {
            score: 80,
            reason: expectedMin ? `Job targets ~${expectedMin} yrs experience` : "Flexible experience criteria",
            expectedYears: expectedMin,
        };
    }

    /**
     * Real education match comparing degrees (B.Tech, MS, BS, Bachelor, Master).
     */
    matchEducation(
        candidateEducations: Array<{ degree: string; fieldOfStudy?: string | null }> = [],
        jobText: string = "",
    ): {
        score: number;
        reason: string;
    } {
        const text = jobText.toLowerCase();

        const requiresPhd = /\bph\.?d\b|\bdoctorate\b/i.test(text);
        const requiresMaster = /\bmaster'?s?\b|\bm\.s\b|\bm\.tech\b/i.test(text);
        const requiresBachelor = /\bbachelor'?s?\b|\bb\.tech\b|\bb\.e\b|\bb\.s\b|\bdegree\b/i.test(text);

        const candDegrees = candidateEducations.map((e) => (e.degree || "").toLowerCase());
        const hasPhd = candDegrees.some((d) => d.includes("phd") || d.includes("doctor"));
        const hasMaster = candDegrees.some((d) => d.includes("master") || d.includes("m.tech") || d.includes("ms"));
        const hasBachelor = candDegrees.some((d) => d.includes("bachelor") || d.includes("b.tech") || d.includes("b.e") || d.includes("bs") || d.includes("b.s"));

        if (requiresPhd) {
            if (hasPhd) return { score: 100, reason: "Meets PhD educational requirement" };
            if (hasMaster) return { score: 65, reason: "Job requires PhD; candidate holds Master's degree" };
            return { score: 40, reason: "Job requires PhD" };
        }

        if (requiresMaster) {
            if (hasPhd || hasMaster) return { score: 100, reason: "Meets Master's educational requirement" };
            if (hasBachelor) return { score: 75, reason: "Job prefers Master's; candidate holds Bachelor's" };
            return { score: 50, reason: "Job specifies Master's degree" };
        }

        if (requiresBachelor) {
            if (hasPhd || hasMaster || hasBachelor) {
                return { score: 100, reason: "Meets Bachelor's / Engineering degree requirement" };
            }
            if (candidateEducations.length > 0) {
                return { score: 85, reason: "Candidate holds relevant degree qualification" };
            }
            return { score: 60, reason: "Job specifies Bachelor's degree" };
        }

        // Job has no strict education filter
        if (candidateEducations.length > 0) {
            return { score: 95, reason: `Candidate has verified degree: ${candidateEducations[0].degree}` };
        }

        return { score: 85, reason: "Standard educational eligibility" };
    }

    /**
     * Real location and remote preference matching.
     */
    matchLocation(
        candidateLocation: string | null | undefined,
        preferredLocations: string[] = [],
        remotePreference: string | null | undefined,
        jobLocation: string = "",
        jobWorkMode?: string | null,
    ): {
        score: number;
        reason: string;
    } {
        const jobLoc = (jobLocation || "").toLowerCase();
        const mode = (jobWorkMode || "").toUpperCase();
        const isJobRemote = jobLoc.includes("remote") || jobLoc.includes("wfh") || mode === "REMOTE";

        const pref = (remotePreference || "HYBRID_OR_REMOTE").toUpperCase();

        if (pref === "REMOTE_ONLY") {
            if (isJobRemote) {
                return { score: 100, reason: "Position is fully Remote, matching Remote-only preference" };
            }
            return { score: 20, reason: `Position is on-site/hybrid in ${jobLocation}, mismatch with Remote-only preference` };
        }

        if (isJobRemote) {
            return { score: 95, reason: "Position offers full Remote flexibility" };
        }

        // Check if job matches candidate's specific city or preferred locations
        const allTargetLocs = [
            candidateLocation || "",
            ...preferredLocations,
        ].map((l) => l.toLowerCase().trim()).filter(Boolean);

        for (const target of allTargetLocs) {
            if (target && jobLoc.includes(target)) {
                return { score: 100, reason: `Position location (${jobLocation}) matches target location (${target})` };
            }
        }

        // Check major Indian tech hubs
        const indianHubs = ["bengaluru", "bangalore", "hyderabad", "pune", "mumbai", "delhi", "gurgaon", "noida", "chennai"];
        const jobIsIndiaHub = indianHubs.some((h) => jobLoc.includes(h));
        const candidateIsIndia = allTargetLocs.some((t) => t.includes("india") || indianHubs.some((h) => t.includes(h)));

        if (jobIsIndiaHub && candidateIsIndia) {
            return { score: 85, reason: `Position is located in target Indian tech hub (${jobLocation})` };
        }

        if (jobLoc.includes("india")) {
            return { score: 80, reason: "Position is located in India" };
        }

        return { score: 40, reason: `Location (${jobLocation}) is outside candidate's primary preferences` };
    }

    /**
     * Real role and title matching.
     */
    matchRole(
        targetRoles: string[] = [],
        jobTitle: string = "",
    ): {
        score: number;
        reason: string;
    } {
        if (!jobTitle) return { score: 0, reason: "Missing job title" };
        if (targetRoles.length === 0) return { score: 75, reason: "Flexible target roles" };

        const title = jobTitle.toLowerCase();
        const titleTokens = title.split(/[\s\-_/,\(\)]+/).filter((t) => t.length > 2);

        let bestScore = 0;
        let bestTarget = "";

        for (const role of targetRoles) {
            const roleLower = role.toLowerCase().trim();
            if (title === roleLower || title.includes(roleLower)) {
                return { score: 100, reason: `Exact target title match for "${role}"` };
            }

            const roleTokens = roleLower.split(/[\s\-_/,\(\)]+/).filter((t) => t.length > 2);
            const matches = roleTokens.filter((token) => titleTokens.includes(token));

            const tokenScore = Math.round((matches.length / Math.max(1, roleTokens.length)) * 100);
            if (tokenScore > bestScore) {
                bestScore = tokenScore;
                bestTarget = role;
            }
        }

        if (bestScore >= 75) {
            return { score: 90, reason: `Strong role alignment with target "${bestTarget}"` };
        }
        if (bestScore >= 50) {
            return { score: 75, reason: `Partial role alignment with target "${bestTarget}"` };
        }

        return { score: 35, reason: `Low title alignment with target roles (${targetRoles.join(", ")})` };
    }
}

export default new MatchingService();