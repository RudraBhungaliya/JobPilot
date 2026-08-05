import type { Page } from "playwright";

import type {
    PlatformAdapter,
} from "./adapter.interface.js";

import type {
    ApplicationPayload,
    ApplicationResult,
} from "./adapter.types.js";

class GreenhouseAdapter
    implements PlatformAdapter {

    async apply(
        page: Page,
        url: string,
        payload: ApplicationPayload,
    ): Promise<ApplicationResult> {

        await page.goto(url);

        /*
            Actual form filling
            comes next.
        */

        return {
            success: true,

            message: "Greenhouse application completed.",

            platform: "GREENHOUSE",
        };
    }
}

export default new GreenhouseAdapter();