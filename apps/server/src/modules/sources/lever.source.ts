import type {
    JobSource,
} from "./source.interface.js";

import type {
    SearchOptions,
    SourceJob,
} from "./source.types.js";

import liveAtsService from "./live-ats.service.js";

class LeverSource implements JobSource {
    readonly name = "lever";

    async search(
        options: SearchOptions,
    ): Promise<SourceJob[]> {
        return liveAtsService.searchLever(options);
    }
}

export default new LeverSource();