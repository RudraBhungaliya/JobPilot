import fs from "node:fs/promises";
import path from "node:path";

class ResumeExtractor {
  async extract(filePath: string, originalName: string): Promise<string> {
    const extension = path.extname(originalName).toLowerCase();

    if (extension === ".pdf") {
      const pdfParseModule: any = await import("pdf-parse");
      const buffer = await fs.readFile(filePath);

      let text = "";
      if (typeof pdfParseModule === "function") {
        const res = await pdfParseModule(buffer);
        text = res.text || "";
      } else if (typeof pdfParseModule.default === "function") {
        const res = await pdfParseModule.default(buffer);
        text = res.text || "";
      } else if (pdfParseModule.PDFParse) {
        const parser = new pdfParseModule.PDFParse({ data: buffer });
        const res = await parser.getText();
        text = (typeof res === "string" ? res : res?.text) || "";
      } else if (pdfParseModule.default?.PDFParse) {
        const parser = new pdfParseModule.default.PDFParse({ data: buffer });
        const res = await parser.getText();
        text = (typeof res === "string" ? res : res?.text) || "";
      }
      return text.trim();
    }

    if (extension === ".docx" || extension === ".doc") {
      const mammoth = await import("mammoth");
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({
        buffer,
      });
      return result.value.trim();
    }

    if (extension === ".txt" || extension === ".md" || extension === "") {
      const content = await fs.readFile(filePath, "utf8");
      return content.trim();
    }

    throw new Error(`Unsupported resume format: ${extension}`);
  }
}

export default new ResumeExtractor();
