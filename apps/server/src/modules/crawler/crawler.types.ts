export type JobPlatform =
    | "GREENHOUSE"
    | "LEVER"
    | "WORKDAY"
    | "ASHBY"
    | "SMARTRECRUITERS"
    | "ICIMS"
    | "JOBVITE"
    | "BAMBOOHR"
    | "TALEO"
    | "UNKNOWN";

export interface RawJob {
    url: string;

    html: string;

    platform: JobPlatform;
}

export interface ParsedJob {
    title: string;

    company: string;

    location: string;

    description: string;

    url: string;

    platform: JobPlatform;
}