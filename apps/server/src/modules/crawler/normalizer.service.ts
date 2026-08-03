import type { ParsedJob } from "./crawler.types.js";

class NormalizerService {
    normalize(
        jobs: ParsedJob[],
    ): ParsedJob[] {
        return jobs.map(job => ({
            title: job.title.trim(),

            company: job.company.trim(),

            location: job.location.trim(),

            description: job.description.trim(),

            url: job.url.trim(),

            platform: job.platform,
        }));
    }
}

export default new NormalizerService();