class MatchingService {
    match(
        query: string,
        jobTitle: string,
        company: string,
    ): string[] {
        const queryTerms = query
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);

        const title =
            jobTitle.toLowerCase();

        const companyName =
            company.toLowerCase();

        return queryTerms.filter(
            (term) =>
                title.includes(term) ||
                companyName.includes(term),
        );
    }
}

export default new MatchingService();