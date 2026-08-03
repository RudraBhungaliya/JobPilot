import type { JobPlatform } from "./crawler.types.js";

class DetectorService {
    detect(url: string): JobPlatform {
        const lower = url.toLowerCase();

        if (lower.includes("greenhouse"))
            return "GREENHOUSE";

        if (lower.includes("lever"))
            return "LEVER";

        if (lower.includes("workday"))
            return "WORKDAY";

        if (lower.includes("ashby"))
            return "ASHBY";

        if (lower.includes("smartrecruiters"))
            return "SMARTRECRUITERS";

        if (lower.includes("icims"))
            return "ICIMS";

        if (lower.includes("jobvite"))
            return "JOBVITE";

        if (lower.includes("bamboohr"))
            return "BAMBOOHR";

        if (lower.includes("taleo"))
            return "TALEO";

        return "UNKNOWN";
    }
}

export default new DetectorService();