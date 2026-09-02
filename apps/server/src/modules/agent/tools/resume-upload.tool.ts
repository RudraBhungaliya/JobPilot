import type { Page } from "playwright";

interface ResumeUploadInput {
    fileUrl: string;
    originalName: string;
}

class ResumeUploadTool {
    async upload(
        page: Page,
        resume: ResumeUploadInput,
    ): Promise<void> {
        const inputs = page.locator(
            'input[type="file"]',
        );

        if ((await inputs.count()) === 0) {
            throw new Error(
                "Resume upload field not found.",
            );
        }

        if (!resume.fileUrl) {
            throw new Error(
                "Resume file URL is missing.",
            );
        }

        const input = inputs.first();

        await input.setInputFiles(
            resume.fileUrl,
        );
    }
}

export default new ResumeUploadTool();