import type {
    SearchOptions,
    SourceJob,
} from "./source.types.js";

export interface JobSource {
    search(
        options: SearchOptions,
    ): Promise<SourceJob[]>;
}