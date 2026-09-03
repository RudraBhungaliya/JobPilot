import fs from "node:fs/promises";
import path from "node:path";

class ResumeTextExtractor {
    async extract(filePath: string): Promise<string> {
        const extension = path.extname(filePath).toLowerCase();
        const buffer = await fs.readFile(filePath);

        if (extension === ".pdf") {
            const pdfParseModule: any = await import("pdf-parse");
            const pdfParse = pdfParseModule.default || pdfParseModule;
            const result = await pdfParse(buffer);
            return (result.text || "").trim();
        }

        if (extension === ".docx" || extension === ".doc") {
            const mammoth = await import("mammoth");
            const result = await mammoth.extractRawText({
                buffer,
            });
            return result.value.trim();
        }

        if (extension === ".txt" || extension === ".md" || extension === "") {
            return buffer.toString("utf-8").trim();
        }

        throw new Error(`Unsupported resume format: ${extension}`);
    }
}

export default new ResumeTextExtractor();