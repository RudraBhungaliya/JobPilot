import type {
    ParsedJob,
    RawJob,
} from "./crawler.types.js";

class ParserService {
    parse(
        job: RawJob,
    ): ParsedJob {
        return {
            title: "",

            company: "",

            location: "",

            description: "",

            url: job.url,

            platform: job.platform,
        };
    }
}

export default new ParserService();