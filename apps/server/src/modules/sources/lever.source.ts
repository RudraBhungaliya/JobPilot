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

    private readonly fallbackLeverJobs: SourceJob[] = [
        {
            externalId: "lever-netflix-stream",
            title: "Senior Software Engineer, Streaming Video Pipeline",
            company: "Netflix",
            url: "https://jobs.lever.co/netflix/3001-senior-software-engineer",
            location: "Los Gatos, CA / Remote",
            description: "Scale high-throughput encoding, global content delivery networks, and client-side playback intelligence.",
            source: "lever",
        },
        {
            externalId: "lever-spotify-web",
            title: "Software Engineer, Web Playback Architecture",
            company: "Spotify",
            url: "https://jobs.lever.co/spotify/3002-web-engineer",
            location: "New York, NY / Remote",
            description: "Build audio streaming web clients, TypeScript SDKs, and modular microfrontend architectures.",
            source: "lever",
        },
        {
            externalId: "lever-canva-fullstack",
            title: "Full Stack Engineer, Collaboration Tools",
            company: "Canva",
            url: "https://jobs.lever.co/canva/3003-fullstack-engineer",
            location: "Remote, USA",
            description: "Deliver delightful web graphics tools, real-time cooperative canvas features, and TypeScript services.",
            source: "lever",
        },
    ];

    async search(
        options: SearchOptions,
    ): Promise<SourceJob[]> {
        const liveJobs = await liveAtsService.searchLever(options);
        if (liveJobs.length > 0) {
            return liveJobs;
        }

        const keyword = (options.keyword || "").toLowerCase().trim();
        const terms = keyword.split(/\s+/).filter(Boolean);
        const remoteOnly = options.remote === true;

        return this.fallbackLeverJobs.filter((job) => {
            if (remoteOnly && !job.location?.toLowerCase().includes("remote")) {
                return false;
            }

            if (!keyword || keyword.includes("engineer") || keyword.includes("developer")) {
                return true;
            }

            const searchString = `${job.title} ${job.company} ${job.description} ${job.location}`.toLowerCase();
            return terms.some((term) => searchString.includes(term));
        });
    }
}

export default new LeverSource();