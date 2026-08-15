import type {
    JobSource,
} from "./source.interface.js";

import type {
    SearchOptions,
    SourceJob,
} from "./source.types.js";

class LeverSource
    implements JobSource {
    readonly name = "lever";

    async search(
        options: SearchOptions,
    ): Promise<SourceJob[]> {

        return [];
    }
}

export default new LeverSource();