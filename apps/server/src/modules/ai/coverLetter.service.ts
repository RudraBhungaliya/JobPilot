import promptService from "./prompt.service.js";
import type { CoverLetterInput } from "./ai.types.js";

class CoverLetterService {
    async generate(input: CoverLetterInput): Promise<{ prompt: string; coverLetter: string }> {
        const prompt = promptService.buildCoverLetterPrompt(input);

        const company = input.companyName || "the team";
        const role = input.jobTitle || "Software Engineer";
        const candidate = input.candidateName || "Candidate";

        const coverLetter = `Dear Hiring Team at ${company},

I am writing to express my strong interest in the ${role} position. With my extensive hands-on experience architecting and delivering high-performance, scalable distributed systems, I am confident in my ability to make an immediate, meaningful impact on your engineering initiatives.

Throughout my career, I have specialized in building resilient services, optimizing high-throughput data pipelines, and driving operational excellence across cloud infrastructure. The mission and engineering challenges at ${company} align directly with my technical background and passion for building robust software solutions.

I look forward to discussing how my experience and problem-solving skills will contribute to the continued success of your team. Thank you for your time and consideration.

Sincerely,
${candidate}`;

        return {
            prompt,
            coverLetter,
        };
    }
}

const coverLetterService = new CoverLetterService();
export default coverLetterService;
export { coverLetterService };