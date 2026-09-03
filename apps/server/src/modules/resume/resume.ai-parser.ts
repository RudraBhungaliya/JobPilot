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

class ResumeAiParser {
    private client: OpenAI;

    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    async parse(
        resumeText: string,
    ): Promise<ParsedResumeData> {
        if (!resumeText.trim()) {
            throw new Error(
                "Resume text is empty.",
            );
        }

        const response =
            await this.client.responses.create({
                model:
                    process.env.OPENAI_RESUME_MODEL ??
                    "gpt-5-mini",

                input: [
                    {
                        role: "system",
                        content:
                            "Extract structured candidate information from the resume. Never invent information. If a field is not present, return an empty value or omit it. Return only valid JSON matching the requested schema.",
                    },
                    {
                        role: "user",
                        content: `
Parse this resume into structured data.

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
`,
                    },
                ],
            });

        const output =
            response.output_text?.trim();

        if (!output) {
            throw new Error(
                "Resume parser returned empty output.",
            );
        }

        let parsed: unknown;

        try {
            parsed = JSON.parse(output);
        } catch {
            throw new Error(
                "Resume parser returned invalid JSON.",
            );
        }

        return ParsedResumeSchema.parse(
            parsed,
        );
    }
}

export default new ResumeAiParser();