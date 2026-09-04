import aiTool from "../tools/ai.tool.js";
import resumeService from "../../resume/resume.service.js";
import profileService from "../../profile/profile.service.js";

import type { AgentStateType, AgentStateUpdate } from "../graph/state.js";

// Generates job-specific resume tailoring instructions using the candidate's
// profile and resume. Instructions are stored in state so the apply node
// can persist them against each application after submission.
class TailorNode {
    async execute(state: AgentStateType): Promise<AgentStateUpdate> {
        if (state.selectedJobs.length === 0) {
            return {
                tailoringInstructions: [],
                history: [...state.history, "Tailoring skipped: no selected jobs."],
            };
        }

        if (!state.resume) {
            return {
                tailoringInstructions: [],
                history: [...state.history, "Tailoring skipped: no resume in state."],
            };
        }

        const resume = await resumeService.getResume(state.resume.id);

        if (!resume || resume.status !== "READY" || !resume.extractedText) {
            return {
                tailoringInstructions: [],
                history: [...state.history, "Tailoring skipped: resume not ready."],
            };
        }

        const profile = await profileService.getProfile(state.userId);

        if (!profile) {
            return {
                tailoringInstructions: [],
                history: [...state.history, "Tailoring skipped: profile not found."],
            };
        }

        const prompt = `
You are the JobPilot resume tailoring agent.

Candidate profile:
${JSON.stringify(profile)}

Candidate resume:
${resume.extractedText}

Selected jobs:
${JSON.stringify(state.selectedJobs)}

Generate one concise, job-specific tailoring instruction per selected job.

Rules:
- Never invent skills, experience, achievements, or projects.
- Only use information present in the profile or resume.
- Prioritise information relevant to each job.
- Do not rewrite the resume — return instructions only.

Return ONLY valid JSON array, one string per job in the same order:

[
    "instruction for job 1",
    "instruction for job 2"
]
`;

        const result = await aiTool.generate(prompt);

        let instructions: string[];

        try {
            const parsed = JSON.parse(result);

            if (!Array.isArray(parsed)) {
                throw new Error("Expected an array.");
            }

<<<<<<< HEAD
            instructions =
                parsed.filter(
                    (
                        item,
                    ): item is string =>
                        typeof item ===
                        "string",
                );
        } catch {
            instructions = state.selectedJobs.map(
                (job) => `Highlight core competencies relevant to ${job.title} at ${job.company}.`,
=======
            instructions = parsed.filter(
                (item): item is string => typeof item === "string",
>>>>>>> 75ce97492af7e4d89d96cb0094053166cd490656
            );
        } catch {
            throw new Error("Tailoring agent returned invalid JSON.");
        }

        return {
            tailoringInstructions: instructions,
            history: [
                ...state.history,
                `Generated tailoring instructions for ${state.selectedJobs.length} job(s).`,
            ],
        };
    }
}

export default new TailorNode();