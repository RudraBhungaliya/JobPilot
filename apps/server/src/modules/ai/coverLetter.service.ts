import providerFactory from "../../core/llm/provider.factory.js";
import type { CoverLetterInput } from "./ai.types.js";

class CoverLetterService {
    async generate(input: CoverLetterInput): Promise<{ prompt: string; coverLetter: string }> {
        const company = input.companyName || input.company;
        const role = input.jobTitle || input.role;
        if (!input.resumeText?.trim() || !input.jobDescription?.trim() || !company?.trim() || !role?.trim()) {
            throw new Error("Resume text, job description, company, and role are required.");
        }
        const prompt = `Write a concise cover letter for ${role} at ${company}. Ground every candidate claim in the supplied resume. Do not invent experience, skills, accomplishments, or interest in a company mission that is not evidenced. If evidence is insufficient, leave that claim out. Return only the letter.\n\nRESUME:\n${input.resumeText}\n\nJOB DESCRIPTION:\n${input.jobDescription}`;
        const coverLetter = (await providerFactory.getProvider().generate(prompt, { temperature: 0.2 })).trim();
        if (!coverLetter) throw new Error("The configured AI provider returned no cover letter.");
        return { prompt, coverLetter };
    }
}

const coverLetterService = new CoverLetterService();
export default coverLetterService;
export { coverLetterService };
