import type {
    JobSource,
    SourceJob,
    SourceSearchInput,
} from "./source.types.js";

class SourceService {
    private readonly sources : JobSource[] = [];

    register(
        source : JobSource,
    ) : void {
        this.sources.push(source);
    }

    async search(
        input: SourceSearchInput,
    ): Promise<SourceJob[]> {
        const results =
            await Promise.allSettled(
                this.sources.map(
                    (source) =>
                        source.search(input),
                ),
            );

        const failures = results.filter((result) => result.status === "rejected");
        if (failures.length === results.length && failures.length > 0) {
            throw new AggregateError(failures.map((result) => result.reason), "All configured job sources failed.");
        }
        return results.flatMap(
            (result) =>
                result.status === "fulfilled"
                    ? result.value
                    : [],
        );
    }

    getSources(): string[] {
        return this.sources.map(
            (source) => source.name,
        );
    }
}

export default new SourceService();
