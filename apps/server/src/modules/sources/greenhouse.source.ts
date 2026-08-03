import type {
    JobSource,
} from "./source.interface.js";

import type {
    SearchOptions,
    SourceJob,
} from "./source.types.js";

class GreenhouseSource
    implements JobSource {

    async search(
        options: SearchOptions,
    ): Promise<SourceJob[]> {

        return [];
    }
}

export default new GreenhouseSource();