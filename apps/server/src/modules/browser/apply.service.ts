import type { ParsedJob } from "./parser.service.js";

class ApplyService {
    async apply(
        job: ParsedJob,
    ) {
        return {
            success: true,
        };
    }
}

export default new ApplyService();