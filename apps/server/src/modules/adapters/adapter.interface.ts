import type { Page } from "playwright";

import type {
    ApplicationPayload,
    ApplicationResult,
} from "./adapter.types.js";

export interface PlatformAdapter {
    apply(
        page: Page,
        url: string,
        payload: ApplicationPayload,
    ): Promise<ApplicationResult>;
}