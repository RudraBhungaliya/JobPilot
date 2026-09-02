import type {
    JobSource,
} from "./source.interface.js";

import type {
    SearchOptions,
    SourceJob,
} from "./source.types.js";

import liveAtsService from "./live-ats.service.js";

class GreenhouseSource implements JobSource {
    readonly name = "greenhouse";

    async search(
        options: SearchOptions,
    ): Promise<SourceJob[]> {
        return liveAtsService.searchGreenhouse(options);
    }
}

export default new GreenhouseSource();