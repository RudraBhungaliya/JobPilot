const COMMON_KEYWORDS = [
    "react",
    "node",
    "typescript",
    "javascript",
    "express",
    "mongodb",
    "postgresql",
    "docker",
    "aws",
    "redis",
    "git",
    "rest",
    "graphql",
    "prisma",
    "next.js",
    "tailwind",
];

export function extractKeywords(text: string): string[] {
    const lower = text.toLowerCase();

    return COMMON_KEYWORDS.filter(keyword =>
        lower.includes(keyword)
    );
}

export function findMissingKeywords(
    resumeText: string,
    requiredKeywords: string[],
) {
    const lower = resumeText.toLowerCase();

    return requiredKeywords.filter(
        keyword => !lower.includes(keyword.toLowerCase()),
    );
}