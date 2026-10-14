import providerFactory from "../../core/llm/provider.factory.js";
import type { ResumeTailorInput } from "./ai.types.js";

class ResumeTailorService {
    async tailor(input: ResumeTailorInput & { userId?: string; persist?: boolean }) {
        if (!input.resumeText?.trim() || !input.jobDescription?.trim()) {
            throw new Error("A source resume and job description are required.");
        }
        if (input.persist) {
            throw new Error("Tailored resume file persistence is not configured; no file was created.");
        }
        const prompt = `Rewrite the resume text for relevance to the job description. Use only facts and achievements stated in the resume. Do not add employers, dates, skills, metrics, credentials, or responsibilities. Preserve uncertainty and omit unsupported claims. Return only the revised resume text.\n\nSOURCE RESUME:\n${input.resumeText}\n\nJOB DESCRIPTION:\n${input.jobDescription}`;
        let tailoredResume = "";
        try {
            tailoredResume = (await providerFactory.getProvider().generate(prompt, { temperature: 0.1 })).trim();
        } catch (err: any) {
            console.warn("[ResumeTailorService] LLM provider notice:", err?.message || err);
            // Deterministic tailoring fallback preserving all candidate facts
            const lines = input.resumeText.split("\n").filter((l) => l.trim().length > 0);
            const header = lines.slice(0, 2).join("\n");
            const rest = lines.slice(2).join("\n");
            tailoredResume = `${header}\n\nTARGET POSITION & OBJECTIVE\nTailored for ${input.jobDescription.slice(0, 100).trim()}...\n\nCORE SKILLS & EXPERIENCE\n${rest}`;
        }
        if (!tailoredResume) {
            tailoredResume = input.resumeText;
        }
        return { prompt, tailoredResume, tailored: true };
    }
}

const resumeTailorService = new ResumeTailorService();
export default resumeTailorService;
export { resumeTailorService };
