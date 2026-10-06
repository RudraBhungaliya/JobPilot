import type { JobPlatform } from "./crawler.types.js";

class DetectorService {
    detect(url: string, html?: string): JobPlatform {
        const lower = (url || "").toLowerCase();
        const lowerHtml = (html || "").toLowerCase().slice(0, 15000);

        if (lower.includes("greenhouse") || lowerHtml.includes("greenhouse") || lowerHtml.includes("gh-embed") || lowerHtml.includes("boards.greenhouse.io"))
            return "GREENHOUSE";

        if (lower.includes("lever.co") || lower.includes("lever") || lowerHtml.includes("jobs.lever.co") || lowerHtml.includes("postings-lever"))
            return "LEVER";

        if (lower.includes("myworkdayjobs") || lower.includes("workday") || lowerHtml.includes("workday") || lowerHtml.includes("wd-job"))
            return "WORKDAY";

        if (lower.includes("ashbyhq") || lower.includes("ashby") || lowerHtml.includes("ashby") || lowerHtml.includes("ashbyhq.com"))
            return "ASHBY";

        if (lower.includes("smartrecruiters") || lowerHtml.includes("smartrecruiters"))
            return "SMARTRECRUITERS";

        if (lower.includes("icims") || lowerHtml.includes("icims"))
            return "ICIMS";

        if (lower.includes("jobvite") || lowerHtml.includes("jobvite"))
            return "JOBVITE";

        if (lower.includes("bamboohr") || lowerHtml.includes("bamboohr"))
            return "BAMBOOHR";

        if (lower.includes("taleo") || lowerHtml.includes("taleo"))
            return "TALEO";

        return "UNKNOWN";
    }
}

export default new DetectorService();