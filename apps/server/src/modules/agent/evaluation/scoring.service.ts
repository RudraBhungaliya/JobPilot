class ScoringService {
    score(
        matchCount: number,
        totalQueryTerms: number,
    ): number {
        if (totalQueryTerms === 0) {
            return 0;
        }

        return Math.min(
            100,
            Math.round(
                (matchCount /
                    totalQueryTerms) *
                    100,
            ),
        );
    }
}

export default new ScoringService();