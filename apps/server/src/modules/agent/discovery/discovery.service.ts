import crypto from "crypto";

import searchTool from "../tools/search.tool.js";

import type {
    AgentJob,
} from "../agent.types.js";

class DiscoveryService {
    async discover(
        query: string,
    ): Promise<AgentJob[]> {
        const results =
            await searchTool.search({
                keyword : query,
            });

        return this.normalize(
            results,
        );
    }

    private normalize(
        results: unknown,
    ): AgentJob[] {
        if (!Array.isArray(results)) {
            return [];
        }

        return results
            .map(
                (
                    item,
                ): AgentJob | null => {
                    if (
                        typeof item !==
                            "object" ||
                        item === null
                    ) {
                        return null;
                    }

                    const value =
                        item as Record<
                            string,
                            unknown
                        >;

                    if (
                        typeof value.title !==
                            "string" ||
                        typeof value.company !==
                            "string" ||
                        typeof value.url !==
                            "string"
                    ) {
                        return null;
                    }

                    const id = crypto
                        .createHash("sha256")
                        .update(value.url)
                        .digest("hex")
                        .slice(0, 12);

                    return {
                        id,
                        title: value.title,
                        company: value.company,
                        url: value.url,
                    };
                },
            )
            .filter(
                (
                    job,
                ): job is AgentJob =>
                    job !== null,
            );
    }
}

export default new DiscoveryService();
