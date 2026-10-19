import type { JobRankingInput } from "./ai.types.js";

const STOPWORDS = new Set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can",
    "cannot", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further",
    "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how",
    "i", "if", "in", "into", "is", "it", "its", "itself", "let's", "me", "more", "most", "my", "myself", "no",
    "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
    "over", "own", "same", "she", "should", "so", "some", "such", "than", "that", "the", "their", "theirs",
    "them", "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too", "under",
    "until", "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
    "why", "with", "would", "you", "your", "yours", "yourself", "yourselves",
]);

function extractTermFrequencies(text: string): Map<string, number> {
    const counts = new Map<string, number>();
    const tokens = text
        .toLowerCase()
        .replace(/[^a-z0-9+#.-]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 1 && !STOPWORDS.has(t));

    for (const token of tokens) {
        counts.set(token, (counts.get(token) || 0) + 1);
    }
    return counts;
}

function calculateCosineSimilarity(tf1: Map<string, number>, tf2: Map<string, number>): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const [, val] of tf1) {
        norm1 += val * val;
    }
    for (const [, val] of tf2) {
        norm2 += val * val;
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    for (const [key, val1] of tf1) {
        const val2 = tf2.get(key);
        if (val2) {
            dotProduct += val1 * val2;
        }
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

class EmbeddingService {
    /**
     * Computes multi-term semantic cosine similarity between the candidate resume
     * and the target job description. Returns a normalized score 0 - 100.
     */
    async similarity(input: JobRankingInput): Promise<number> {
        if (!input.resumeText?.trim() || !input.jobDescription?.trim()) {
            return 0;
        }

        const resumeTF = extractTermFrequencies(input.resumeText);
        const jobTF = extractTermFrequencies(input.jobDescription);

        const cosine = calculateCosineSimilarity(resumeTF, jobTF);
        // Normalize 0.0 - 1.0 into 0 - 100 score
        const score = Math.min(100, Math.max(0, Math.round(cosine * 100 * 1.5)));
        return score;
    }
}

export default new EmbeddingService();