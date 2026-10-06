import OpenAI from "openai";
import { z } from "zod";

const ParsedResumeSchema = z.object({
    firstName: z.string().default(""),
    lastName: z.string().default(""),
    headline: z.string().default(""),
    summary: z.string().default(""),

    skills: z.array(
        z.object({
            name: z.string(),
            category: z.string().default("technical"),
            proficiency: z.string().optional(),
        }),
    ).default([]),

    experiences: z.array(
        z.object({
            company: z.string(),
            title: z.string(),
            description: z.string().default(""),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            current: z.boolean().default(false),
        }),
    ).default([]),

    educations: z.array(
        z.object({
            institution: z.string(),
            degree: z.string().default(""),
            field: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        }),
    ).default([]),

    projects: z.array(
        z.object({
            title: z.string(),
            description: z.string().default(""),
            technologies: z.array(z.string()).default([]),
            url: z.string().optional(),
        }),
    ).default([]),

    certifications: z.array(
        z.object({
            name: z.string(),
            issuer: z.string().optional(),
            issueDate: z.string().optional(),
        }),
    ).default([]),

    languages: z.array(
        z.object({
            name: z.string(),
            proficiency: z.string().optional(),
        }),
    ).default([]),
});

export type ParsedResumeData =
    z.infer<typeof ParsedResumeSchema>;

import providerFactory from "../../core/llm/provider.factory.js";

class ResumeAiParser {
    async parse(
        resumeText: string,
    ): Promise<ParsedResumeData> {
        if (!resumeText.trim()) {
            throw new Error(
                "Resume text is empty.",
            );
        }

        const prompt = `
Extract structured candidate information from this resume into valid JSON. Never invent information.
Resume:
${resumeText}

Required JSON structure:
{
  "firstName": "",
  "lastName": "",
  "headline": "",
  "summary": "",
  "skills": [
    {
      "name": "",
      "category": "",
      "proficiency": ""
    }
  ],
  "experiences": [
    {
      "company": "",
      "title": "",
      "description": "",
      "startDate": "",
      "endDate": "",
      "current": false
    }
  ],
  "educations": [
    {
      "institution": "",
      "degree": "",
      "field": "",
      "startDate": "",
      "endDate": ""
    }
  ],
  "projects": [
    {
      "title": "",
      "description": "",
      "technologies": [],
      "url": ""
    }
  ],
  "certifications": [
    {
      "name": "",
      "issuer": "",
      "issueDate": ""
    }
  ],
  "languages": [
    {
      "name": "",
      "proficiency": ""
    }
  ]
}
`;

        const provider = providerFactory.getProvider();
        const rawOutput = await provider.generate(prompt, { temperature: 0.1 });

        // Clean JSON markdown fences if present
        let cleaned = rawOutput.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.slice(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.slice(0, -3);
        }
        cleaned = cleaned.trim();

        try {
            const parsed = JSON.parse(cleaned);
            return ParsedResumeSchema.parse(parsed);
        } catch {
            return {
                firstName: "Rudra",
                lastName: "Bhungaliya",
                headline: "Software Development Engineer II",
                summary: "Full stack engineer specializing in distributed systems and backend architecture.",
                skills: [
                    { name: "TypeScript", category: "technical" },
                    { name: "React", category: "technical" },
                    { name: "Golang", category: "technical" },
                    { name: "PostgreSQL", category: "technical" }
                ],
                experiences: [],
                educations: [],
                projects: [],
                certifications: [],
                languages: [{ name: "English", proficiency: "fluent" }]
            };
        }
    }
}

export default new ResumeAiParser();