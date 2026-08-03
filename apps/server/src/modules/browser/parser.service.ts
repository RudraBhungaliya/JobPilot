export interface ParsedJob {
    title: string;

    company: string;

    location: string;

    description: string;

    url: string;

    platform: string;
}

class ParserService {
    parse(
        raw: unknown,
    ): ParsedJob[] {
        return [];
    }
}

export default new ParserService();