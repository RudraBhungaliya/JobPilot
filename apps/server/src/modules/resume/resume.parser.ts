export interface ParsedResume {
    skills: string[];
    experience: string[];
    education: string[];
    projects: string[];
    certifications: string[];
    languages: string[];
}

const COMMON_TECH_KEYWORDS = [
    "react", "react.js", "reactjs", "typescript", "javascript", "node", "node.js", "nodejs",
    "python", "go", "golang", "rust", "java", "c++", "c#", ".net", "docker", "kubernetes",
    "aws", "gcp", "azure", "graphql", "sql", "postgresql", "postgres", "mongodb", "next.js",
    "nextjs", "tailwind", "tailwindcss", "express", "fastapi", "django", "flask", "redis",
    "kafka", "elasticsearch", "git", "ci/cd", "rest", "restful", "microservices", "vue",
    "angular", "svelte", "html", "css", "linux", "devops", "prisma", "terraform"
];

class ResumeParser {
    parse(text: string): ParsedResume {
        const rawSkills = this.extractSection(text, [
            "skills",
            "technical skills",
            "technical skills & tools",
            "technologies",
            "core competencies",
        ]);

        const parsedSkills = this.flattenAndExtractSkills(rawSkills, text);

        return {
            skills: parsedSkills,
            experience: this.extractSection(text, [
                "experience",
                "work experience",
                "professional experience",
                "employment history",
            ]),
            education: this.extractSection(text, [
                "education",
                "academic background",
            ]),
            projects: this.extractSection(text, [
                "projects",
                "personal projects",
                "academic projects",
            ]),
            certifications: this.extractSection(text, [
                "certifications",
                "certificates",
            ]),
            languages: this.extractSection(text, [
                "languages",
            ]),
        };
    }

    extractKeywords(text: string): string[] {
        if (!text) return [];
        const lower = text.toLowerCase();
        const found = new Set<string>();
        for (const kw of COMMON_TECH_KEYWORDS) {
            // Regex boundary check
            const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(`(?:^|[^a-zA-Z0-9_#+])${escaped}(?:$|[^a-zA-Z0-9_#+])`, "i");
            if (regex.test(lower)) {
                found.add(kw);
            }
        }
        return Array.from(found);
    }

    private flattenAndExtractSkills(rawSkills: string[], fullText: string): string[] {
        const skillsSet = new Set<string>();

        for (const line of rawSkills) {
            // Split by commas, pipes, bullets, slashes
            const parts = line.split(/[,|•·/;\n\t]/).map((s) => s.trim().replace(/^[-*•]\s*/, ""));
            for (const part of parts) {
                if (part.length >= 2 && part.length <= 40 && !this.isSectionHeading(this.normalize(part))) {
                    skillsSet.add(part);
                }
            }
        }

        // Also add tech keywords found in full text
        const keywords = this.extractKeywords(fullText);
        for (const kw of keywords) {
            skillsSet.add(kw);
        }

        return Array.from(skillsSet);
    }

    private extractSection(
        text: string,
        headings: string[],
    ): string[] {
        const lines = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        const normalizedHeadings =
            headings.map((heading) =>
                this.normalize(heading),
            );

        const result: string[] = [];

        let collecting = false;

        for (const line of lines) {
            const normalized =
                this.normalize(line);

            if (
                normalizedHeadings.includes(
                    normalized,
                )
            ) {
                collecting = true;
                continue;
            }

            if (
                collecting &&
                this.isSectionHeading(
                    normalized,
                )
            ) {
                break;
            }

            if (collecting) {
                result.push(line);
            }
        }

        return result;
    }

    private isSectionHeading(
        line: string,
    ): boolean {
        const headings = [
            "summary",
            "profile",
            "skills",
            "technical skills",
            "technical skills tools",
            "technologies",
            "experience",
            "work experience",
            "professional experience",
            "education",
            "academic background",
            "projects",
            "personal projects",
            "academic projects",
            "certifications",
            "certificates",
            "languages",
            "achievements",
            "awards",
            "publications",
            "interests",
            "references",
        ];

        return headings.includes(line);
    }

    private normalize(value: string): string {
        return value
            .toLowerCase()
            .replace(/[:|&]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }
}

export default new ResumeParser();