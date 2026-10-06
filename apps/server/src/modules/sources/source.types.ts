export interface SourceSearchInput {
    keyword: string;
    location?: string;
    remote?: boolean;
    tier?: 'MNC' | 'SEMI_MNC' | 'STARTUP' | 'ALL' | string;
    companyTier?: 'MNC' | 'SEMI_MNC' | 'STARTUP' | 'ALL';
}

export interface SourceJob {
    externalId : string;
    title: string;
    company: string;
    url : string;
    location?: string;
    description: string;
    source : string;
}

export interface JobSource {
    name : string;
    search(
        input : SourceSearchInput,
    ) : Promise<SourceJob[]>;
}

export type SearchOptions = SourceSearchInput;