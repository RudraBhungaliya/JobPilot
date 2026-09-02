import type {
    JobSource,
} from "./source.interface.js";

import type {
    SearchOptions,
    SourceJob,
} from "./source.types.js";

import liveAtsService from "./live-ats.service.js";

class RemoteSource implements JobSource {
    readonly name = "remote";

    async search(
        options: SearchOptions,
    ): Promise<SourceJob[]> {
        return liveAtsService.searchRemote(options);
    }
}

export default new RemoteSource();
