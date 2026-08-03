import type {
    JobSource,
} from "./source.interface.js";

import type {
    SearchOptions,
    SourceJob,
} from "./source.types.js";

class WorkdaySource
    implements JobSource {

    async search(
        options: SearchOptions,
    ): Promise<SourceJob[]> {

        return [];
    }
}

export default new WorkdaySource();