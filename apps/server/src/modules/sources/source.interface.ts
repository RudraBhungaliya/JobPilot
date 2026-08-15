import type {
    SearchOptions,
    SourceJob,
} from "./source.types.js";

export interface JobSource {
    name: string;
    search(
        options: SearchOptions,
    ): Promise<SourceJob[]>;
}