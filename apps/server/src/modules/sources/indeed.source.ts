import type {
    JobSource,
} from "./source.interface.js";

import type {
    SearchOptions,
    SourceJob,
} from "./source.types.js";

import liveAtsService from "./live-ats.service.js";

class IndeedSource
    implements JobSource {
    readonly name = "indeed";

    async search(
        options: SearchOptions,
    ): Promise<SourceJob[]> {
        return liveAtsService.searchGeneral(options, "indeed");
    }
}

export default new IndeedSource();