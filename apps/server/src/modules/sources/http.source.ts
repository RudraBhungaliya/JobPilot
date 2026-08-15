import type {
    JobSource,
    SourceJob,
    SourceSearchInput,
} from "./source.types.js";

interface HttpSourceConfig {
    name: string;
    endpoint: string;
}

class HttpSource implements JobSource {
    readonly name: string;

    private readonly endpoint: string;

    constructor(
        config: HttpSourceConfig,
    ) {
        this.name = config.name;
        this.endpoint = config.endpoint;
    }

    async search(
        input: SourceSearchInput,
    ): Promise<SourceJob[]> {
        const url =
            new URL(this.endpoint);

        url.searchParams.set(
            "keyword",
            input.keyword,
        );

        if (input.location) {
            url.searchParams.set(
                "location",
                input.location,
            );
        }

        if (
            input.remote !== undefined
        ) {
            url.searchParams.set(
                "remote",
                String(input.remote),
            );
        }

        const response =
            await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Source ${this.name} returned HTTP ${response.status}.`,
            );
        }

        const data: unknown =
            await response.json();

        if (!Array.isArray(data)) {
            throw new Error(
                `Source ${this.name} returned an invalid response.`,
            );
        }

        return data.filter(
            (
                job,
            ): job is SourceJob =>
                this.isSourceJob(job),
        );
    }

    private isSourceJob(
        value: unknown,
    ): value is SourceJob {
        if (
            typeof value !==
                "object" ||
            value === null
        ) {
            return false;
        }

        const job =
            value as Record<
                string,
                unknown
            >;

        return (
            typeof job.externalId ===
                "string" &&
            typeof job.title ===
                "string" &&
            typeof job.company ===
                "string" &&
            typeof job.url ===
                "string" &&
            typeof job.source ===
                "string"
        );
    }
}

export default HttpSource;