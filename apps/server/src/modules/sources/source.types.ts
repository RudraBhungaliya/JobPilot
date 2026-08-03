export interface SearchOptions {
    keyword: string;

    location?: string;

    remote?: boolean;
}

export interface SourceJob {
    title: string;

    company: string;

    location: string;

    description: string;

    url: string;
}