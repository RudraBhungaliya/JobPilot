import type { ParsedJob } from "./parser.service.js";

class MatcherService {
    async rankJobs(
        jobs: ParsedJob[],
        resumeText: string,
    ) {
        return jobs;
    }
}

export default new MatcherService();