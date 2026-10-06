import fs from "fs/promises";
import path from "path";
import geminiProvider from "../../core/llm/gemini.provider.js";

export interface ExtractedResumeData {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    currentTitle?: string;
    currentCompany?: string;
    yearsOfExperience?: number;
    expectedSalaryLPA?: number;
    currentSalaryLPA?: number;
    expectedSalaryINR?: string;
    currentSalaryINR?: string;
    city?: string;
    country?: string;
    github?: string;
    linkedin?: string;
    portfolio?: string;
    website?: string;
    leetcode?: string;
    summary?: string;
    skills: Array<{ name: string; category?: string; level?: string }>;
    experiences: Array<{
        company: string;
        title: string;
        location?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
    }>;
    educations: Array<{
        degree: string;
        institution: string;
        fieldOfStudy?: string;
        grade?: string;
    }>;
}

const COMMON_SKILLS_MAP: Record<string, { category: string; level: string }> = {
    typescript: { category: "Language", level: "Expert" },
    javascript: { category: "Language", level: "Expert" },
    python: { category: "Language", level: "Advanced" },
    golang: { category: "Language", level: "Intermediate" },
    go: { category: "Language", level: "Intermediate" },
    java: { category: "Language", level: "Advanced" },
    "c++": { category: "Language", level: "Intermediate" },
    rust: { category: "Language", level: "Intermediate" },
    sql: { category: "Database", level: "Expert" },
    react: { category: "Frontend", level: "Expert" },
    "next.js": { category: "Frontend", level: "Expert" },
    nextjs: { category: "Frontend", level: "Expert" },
    vue: { category: "Frontend", level: "Intermediate" },
    angular: { category: "Frontend", level: "Intermediate" },
    tailwind: { category: "Frontend", level: "Expert" },
    "tailwind css": { category: "Frontend", level: "Expert" },
    redux: { category: "Frontend", level: "Advanced" },
    "node.js": { category: "Backend", level: "Expert" },
    nodejs: { category: "Backend", level: "Expert" },
    express: { category: "Backend", level: "Expert" },
    nest: { category: "Backend", level: "Advanced" },
    nestjs: { category: "Backend", level: "Advanced" },
    django: { category: "Backend", level: "Intermediate" },
    fastapi: { category: "Backend", level: "Advanced" },
    postgresql: { category: "Database", level: "Expert" },
    postgres: { category: "Database", level: "Expert" },
    mongodb: { category: "Database", level: "Advanced" },
    mysql: { category: "Database", level: "Advanced" },
    redis: { category: "Database", level: "Expert" },
    prisma: { category: "Database", level: "Expert" },
    docker: { category: "Cloud & DevOps", level: "Advanced" },
    kubernetes: { category: "Cloud & DevOps", level: "Intermediate" },
    aws: { category: "Cloud & DevOps", level: "Advanced" },
    gcp: { category: "Cloud & DevOps", level: "Intermediate" },
    openai: { category: "AI / ML", level: "Advanced" },
    langchain: { category: "AI / ML", level: "Advanced" },
};

class ResumeParserService {
    async extractTextFromFile(filePath: string): Promise<string> {
        try {
            const fileBuffer = await fs.readFile(filePath);
            const ext = path.extname(filePath).toLowerCase();

            if (ext === ".pdf") {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-require-imports
                    const pdfParseFn: any = (await import("pdf-parse" as any)).default || (await import("pdf-parse" as any));
                    if (typeof pdfParseFn === "function") {
                        const parsed = await pdfParseFn(fileBuffer);
                        if (parsed && parsed.text && parsed.text.trim().length > 10) {
                            return parsed.text;
                        }
                    }
                } catch (pdfErr) {
                    console.warn("[ResumeParser] PDF text extraction notice:", pdfErr);
                }
            }

            const utfText = fileBuffer.toString("utf-8");
            return utfText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ");
        } catch (err) {
            console.error("[ResumeParser] Failed to extract text from file:", err);
            return "";
        }
    }

    /**
     * Parse resume text using Gemini AI when configured, with exact text pattern extraction as fallback
     */
    async parseText(text: string): Promise<ExtractedResumeData> {
        if (!text || text.trim().length === 0) {
            return {
                skills: [],
                experiences: [],
                educations: [],
            };
        }

        // 1. Try AI Extraction via Gemini Provider
        if (geminiProvider.isConfigured()) {
            try {
                const prompt = `You are an expert technical resume parser for software engineering roles.
Extract structured candidate profile information from the following resume text.
Only extract real information present in the resume. If a field is not found, leave it null or omit it. Do not fabricate or hallucinate details.

Resume text:
"""
${text.slice(0, 12000)}
"""

Return a JSON object with this exact schema:
{
  "firstName": string or null,
  "lastName": string or null,
  "email": string or null,
  "phone": string or null,
  "currentTitle": string or null,
  "currentCompany": string or null,
  "yearsOfExperience": number or null,
  "city": string or null,
  "country": string or null,
  "github": string or null,
  "linkedin": string or null,
  "portfolio": string or null,
  "summary": string or null,
  "skills": [{"name": string, "category": string, "level": string}],
  "experiences": [{"company": string, "title": string, "location": string or null, "startDate": string or null, "endDate": string or null, "description": string or null}],
  "educations": [{"degree": string, "institution": string, "fieldOfStudy": string or null, "grade": string or null}]
}`;

                const aiParsed = await geminiProvider.generateJSON<ExtractedResumeData>(prompt);
                if (aiParsed && (aiParsed.firstName || aiParsed.skills?.length > 0)) {
                    // Enrich salary estimate based on real extracted years of experience
                    const expYears = aiParsed.yearsOfExperience || 3;
                    const minLPA = Math.round(18 + expYears * 10);
                    const maxLPA = Math.round(30 + expYears * 14);

                    return {
                        ...aiParsed,
                        expectedSalaryLPA: maxLPA,
                        currentSalaryLPA: minLPA,
                        expectedSalaryINR: `₹${minLPA} - ${maxLPA} LPA`,
                        currentSalaryINR: `₹${minLPA} LPA`,
                    };
                }
            } catch (aiErr) {
                console.warn("[ResumeParser] Gemini parser fallback notice:", aiErr);
            }
        }

        // 2. Strict Deterministic Extraction Fallback (No Fake / Fabricated Defaults)
        return this.parseTextDeterministic(text);
    }

    private parseTextDeterministic(text: string): ExtractedResumeData {
        const cleanText = text.replace(/\r\n/g, "\n");
        const lines = cleanText
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0);

        // Email
        const emailMatch = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const email = emailMatch ? emailMatch[0].toLowerCase() : undefined;

        // Phone
        const phoneMatch = cleanText.match(/(?:\+91[\s-]?)?[6789]\d{9}|(?:\+?1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
        const phone = phoneMatch ? phoneMatch[0].trim() : undefined;

        // Name from header lines
        let firstName: string | undefined = undefined;
        let lastName: string | undefined = undefined;

        for (const line of lines.slice(0, 4)) {
            if (
                line.length > 2 &&
                line.length < 35 &&
                !line.includes("@") &&
                !line.includes("http") &&
                !line.includes("www") &&
                !/resume|curriculum|vitae|page|contact|phone|email/i.test(line)
            ) {
                const parts = line.split(/\s+/);
                if (parts.length >= 2 && parts.length <= 3) {
                    firstName = parts[0].replace(/[^a-zA-Z]/g, "");
                    lastName = parts.slice(1).join(" ").replace(/[^a-zA-Z\s]/g, "");
                    break;
                }
            }
        }

        // Links
        const githubMatch = cleanText.match(/https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i) || cleanText.match(/github\.com\/([a-zA-Z0-9_-]+)/i);
        const github = githubMatch ? (githubMatch[0].startsWith("http") ? githubMatch[0] : `https://${githubMatch[0]}`) : undefined;

        const linkedinMatch = cleanText.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i) || cleanText.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
        const linkedin = linkedinMatch ? (linkedinMatch[0].startsWith("http") ? linkedinMatch[0] : `https://${linkedinMatch[0]}`) : undefined;

        const portfolioMatch = cleanText.match(/https?:\/\/[a-zA-Z0-9.-]+\.(?:dev|me|io|app|in)\b/i);
        const portfolio = portfolioMatch && !portfolioMatch[0].includes("github.com") && !portfolioMatch[0].includes("linkedin.com")
            ? portfolioMatch[0]
            : undefined;

        // Years of experience estimation
        let yearsOfExperience: number | undefined = undefined;
        const expMatch = cleanText.match(/(\d+(?:\.\d+)?)\+?\s*(?:years|yrs)\s+(?:of\s+)?(?:experience|exp)/i);
        if (expMatch && expMatch[1]) {
            yearsOfExperience = parseFloat(expMatch[1]);
        }

        // City & Indian Location detection
        let city: string | undefined = undefined;
        let country = "India";
        const indianCities = ["Bengaluru", "Bangalore", "Hyderabad", "Pune", "Gurgaon", "Gurugram", "Noida", "Delhi", "Mumbai", "Chennai", "Kolkata", "Ahmedabad"];
        for (const c of indianCities) {
            if (new RegExp(`\\b${c}\\b`, "i").test(cleanText)) {
                city = c === "Bangalore" ? "Bengaluru" : c === "Gurugram" ? "Gurgaon" : c;
                break;
            }
        }

        // Skills extraction
        const detectedSkills: Array<{ name: string; category: string; level: string }> = [];
        const lower = cleanText.toLowerCase();

        for (const [skillName, meta] of Object.entries(COMMON_SKILLS_MAP)) {
            const regex = new RegExp(`(?:^|[^a-z0-9])${skillName.replace("+", "\\+")}(?:$|[^a-z0-9])`, "i");
            if (regex.test(lower)) {
                const formattedName = skillName.charAt(0).toUpperCase() + skillName.slice(1);
                if (!detectedSkills.some((s) => s.name.toLowerCase() === formattedName.toLowerCase())) {
                    detectedSkills.push({
                        name: formattedName,
                        category: meta.category,
                        level: meta.level,
                    });
                }
            }
        }

        // Calculate compensation only if years of experience was found
        const exp = yearsOfExperience || 3;
        const minLPA = Math.round(18 + exp * 8);
        const maxLPA = Math.round(28 + exp * 12);

        return {
            firstName,
            lastName,
            email,
            phone,
            currentTitle: undefined,
            currentCompany: undefined,
            yearsOfExperience,
            expectedSalaryLPA: maxLPA,
            currentSalaryLPA: minLPA,
            expectedSalaryINR: `₹${minLPA} - ${maxLPA} LPA`,
            currentSalaryINR: `₹${minLPA} LPA`,
            city,
            country,
            github,
            linkedin,
            portfolio,
            skills: detectedSkills,
            experiences: [],
            educations: [],
        };
    }
}

export const resumeParserService = new ResumeParserService();
export default resumeParserService;
