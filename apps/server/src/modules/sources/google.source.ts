import type {
    JobSource,
} from "./source.interface.js";

import type {
    SearchOptions,
    SourceJob,
} from "./source.types.js";

import liveAtsService from "./live-ats.service.js";

class GoogleSource implements JobSource {
    readonly name = "google";

    async search(
        options: SearchOptions,
    ): Promise<SourceJob[]> {
        const queryWithGoogle: SearchOptions = {
            ...options,
            keyword: options.keyword ? `google ${options.keyword}` : "google",
        };

        const liveJobs = await liveAtsService.searchGeneral(queryWithGoogle, "google");
        if (liveJobs.length > 0) {
            return liveJobs;
        }

        // Fallback search directly across live feeds with general keyword
        return liveAtsService.searchGeneral(options, "google");
    }
}

export default new GoogleSource();
