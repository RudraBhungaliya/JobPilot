import providerFactory from "../../core/llm/provider.factory.js";
import { prisma } from "@jobpilot/database";

export interface TailoringInput {
    userId: string;
    jobId: string;
    resumeId?: string;
    jobTitle: string;
    companyName: string;
    jobDescription?: string;
    customQuestions?: Array<{
        question: string;
        label: string;
        type?: string;
        options?: string[];
    }>;
}

export interface TailoringResult {
    tailoredSummary: string;
    relevantSkills: string[];
    tailoredBullets: string[];
    questionAnswers: Record<string, string>;
    confidence: "HIGH" | "MEDIUM" | "LOW";
}

export class TailoringService {
    /**
     * Gemini-powered job-specific tailoring engine.
     * Enforces strict factual honesty: NO fabrication, NO hallucinated experience/skills/employers.
     */
    async tailorForJob(input: TailoringInput): Promise<TailoringResult> {
        // 1. Fetch real user and profile
        const user = await prisma.user.findUnique({
            where: { id: input.userId },
            include: { profile: true },
        });

        if (!user) throw new Error("Candidate account was not found.");

        const profile = user.profile;

        // 2. Fetch real resume
        let resumeText = "";
        if (input.resumeId) {
            const resume = await prisma.resume.findUnique({
                where: { id: input.resumeId },
            });
            if (resume && resume.userId !== input.userId) throw new Error("The selected resume does not belong to this candidate.");
            if (resume?.extractedText) {
                resumeText = resume.extractedText;
            }
        }

        if (!resumeText && !input.resumeId) {
            const defaultResume = await prisma.resume.findFirst({
                where: { userId: input.userId },
                orderBy: { updatedAt: "desc" },
            });
            if (defaultResume?.extractedText) {
                resumeText = defaultResume.extractedText;
            }
        }

        // Build candidate context
        const candidateSkills: string[] = Array.isArray((profile as any)?.skills)
            ? (profile as any).skills.filter((skill: unknown): skill is string => typeof skill === "string" && skill.trim().length > 0)
            : [];
        if (!profile || !resumeText) throw new Error("A saved candidate profile and parsed resume are required for resume tailoring.");
        if (candidateSkills.length === 0) throw new Error("Candidate profile has no verified skills to use for tailoring.");
        const candidateContext = {
            name: `${profile.firstName} ${profile.lastName}`.trim(),
            email: user.email,
            currentTitle: profile.currentTitle,
            yearsOfExperience: profile.yearsOfExperience,
            skills: candidateSkills,
            extractedResume: resumeText.slice(0, 12000),
        };

        const provider = providerFactory.getProvider();
        if (!provider.isConfigured()) throw new Error("Selected AI provider is not configured.");

        const prompt = `
You are the JobPilot AI Career Copilot tailoring assistant.
The configured AI provider.

TARGET JOB OPENING:
- Title: ${input.jobTitle}
- Company: ${input.companyName}
- Description / Context: ${input.jobDescription || "Not provided by the job source."}

REAL VERIFIED CANDIDATE DATA:
- Name: ${candidateContext.name}
- Email: ${candidateContext.email}
- Current Title: ${candidateContext.currentTitle}
- Experience: ${candidateContext.yearsOfExperience} years
- Verified Skills: ${JSON.stringify(candidateContext.skills)}
- Resume Excerpt:
"""
${candidateContext.extractedResume}
"""

CUSTOM APPLICATION QUESTIONS (IF ANY):
${JSON.stringify(input.customQuestions || [])}

STRICT GROUNDING & HONESTY RULES:
1. Do NOT fabricate candidate experience.
2. Do NOT add skills the candidate does not have.
3. Do NOT invent employers.
4. Do NOT invent achievements or statistics.
5. Do NOT lie in application answers.
6. Only tailor resume wording, highlight authentic candidate strengths, and generate concise truthful answers based strictly on the provided candidate data.

OUTPUT FORMAT:
Return a valid JSON object matching this exact structure:
{
  "tailoredSummary": "A concise, professional 2-3 sentence summary aligning the candidate's verified experience with the job role.",
  "relevantSkills": ["Skill1", "Skill2", "Skill3"],
  "tailoredBullets": [
    "Truthful accomplishment highlight 1",
    "Truthful accomplishment highlight 2"
  ],
  "questionAnswers": {
    "question_or_label": "Concise, truthful answer based strictly on candidate data"
  },
  "confidence": "HIGH"
}
`;

        try {
            const result = await provider.generateJSON<TailoringResult>(prompt, {
                temperature: 0.1,
                maxTokens: 2048,
            });

            if (!result || typeof result.tailoredSummary !== "string" || !Array.isArray(result.relevantSkills) || !Array.isArray(result.tailoredBullets) || !result.questionAnswers || typeof result.questionAnswers !== "object" || !["HIGH", "MEDIUM", "LOW"].includes(result.confidence)) {
                throw new Error("AI provider returned an invalid tailoring response.");
            }

            // Filter out any skills not in candidate's original skills
            const allowedSkills = new Set(candidateContext.skills.map((s: string) => s.toLowerCase()));
            const safeSkills = (result.relevantSkills || []).filter((s: string) =>
                allowedSkills.has(s.toLowerCase()) || candidateContext.skills.some((cs: string) => s.toLowerCase().includes(cs.toLowerCase()))
            );

            return {
                tailoredSummary: result.tailoredSummary,
                relevantSkills: safeSkills,
                tailoredBullets: result.tailoredBullets,
                questionAnswers: result.questionAnswers,
                confidence: result.confidence,
            };
        } catch (error) {
            console.warn("AI resume tailoring failed.", error);
            throw error;
        }
    }
}

export const tailoringService = new TailoringService();
export default tailoringService;
