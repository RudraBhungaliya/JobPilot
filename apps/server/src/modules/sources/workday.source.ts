import type {
    JobSource,
} from "./source.interface.js";

import type {
    SearchOptions,
    SourceJob,
} from "./source.types.js";

import liveAtsService from "./live-ats.service.js";

class WorkdaySource implements JobSource {
    readonly name = "workday";

    async search(
        options: SearchOptions,
    ): Promise<SourceJob[]> {
        return liveAtsService.searchGeneral(options, "workday");
    }
}

export default new WorkdaySource();