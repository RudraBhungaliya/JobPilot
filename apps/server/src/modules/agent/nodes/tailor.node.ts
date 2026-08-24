import aiTool from "../tools/ai.tool.js";

import resumeService from "../../resume/resume.service.js";
import profileService from "../../profile/profile.service.js";

import type {
    AgentStateType,
    AgentStateUpdate,
} from "../graph/state.js";

class TailorNode {
    async execute(
        state: AgentStateType,
    ): Promise<AgentStateUpdate> {
        if (state.selectedJobs.length === 0) {
            return {
                tailoringInstructions: [],
                history: [
                    ...state.history,
                    "No selected jobs available for tailoring.",
                ],
            };
        }

        if (!state.resume) {
            return {
                tailoringInstructions: [],
                history: [
                    ...state.history,
                    "No resume available for tailoring.",
                ],
            };
        }

        const resume =
            await resumeService.getResume(
                state.resume.id,
            );

        if (
            !resume ||
            resume.status !== "READY" ||
            !resume.extractedText
        ) {
            return {
                tailoringInstructions: [],
                history: [
                    ...state.history,
                    "Resume is not ready for tailoring.",
                ],
            };
        }

        const profile =
            await profileService.getProfile(
                state.userId,
            );

        if (!profile) {
            return {
                tailoringInstructions: [],
                history: [
                    ...state.history,
                    "Candidate profile could not be found.",
                ],
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

Generate concise, job-specific resume tailoring instructions.

Rules:
- Never invent skills.
- Never invent experience.
- Never invent achievements.
- Never invent projects.
- Never change factual claims.
- Use only information supported by the candidate profile or resume.
- Prioritize information relevant to each selected job.
- Do not rewrite the resume yet.
- Return instructions only.

Return ONLY valid JSON:

[
    "instruction for job 1",
    "instruction for job 2"
]
`;

        const result =
            await aiTool.generate(
                prompt,
            );

        let instructions: string[];

        try {
            const parsed =
                JSON.parse(result);

            if (!Array.isArray(parsed)) {
                throw new Error(
                    "Invalid tailoring response.",
                );
            }

            instructions =
                parsed.filter(
                    (
                        item,
                    ): item is string =>
                        typeof item ===
                        "string",
                );
        } catch {
            throw new Error(
                "Tailoring agent returned invalid JSON.",
            );
        }

        return {
            tailoringInstructions:
                instructions,
            history: [
                ...state.history,
                `Generated tailoring instructions for ${state.selectedJobs.length} jobs.`,
            ],
        };
    }
}

export default new TailorNode();