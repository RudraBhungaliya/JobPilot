import type { BaseATSAdapter } from "./base.adapter.js";
import { greenhouseAdapter } from "./greenhouse.adapter.js";
import { ashbyAdapter } from "./ashby.adapter.js";
import { leverAdapter } from "./lever.adapter.js";
import { workdayAdapter } from "./workday.adapter.js";
import { genericATSAdapter } from "./generic.adapter.js";

export class ATSAdapterFactory {
    private adapters: BaseATSAdapter[] = [
        greenhouseAdapter,
        ashbyAdapter,
        leverAdapter,
        workdayAdapter,
        genericATSAdapter, // fallback
    ];

    /**
     * Resolve the most appropriate ATS adapter for the target job URL
     */
    getAdapterForUrl(url: string): BaseATSAdapter {
        for (const adapter of this.adapters) {
            if (adapter.canHandle(url)) {
                return adapter;
            }
        }
        return genericATSAdapter;
    }
}

export const atsAdapterFactory = new ATSAdapterFactory();
export default atsAdapterFactory;
