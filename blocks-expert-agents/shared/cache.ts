// cache.ts - Query cache with fuzzy keyword matching for common questions
export interface CacheEntry {
  queryPattern: string;
  cacheKey: string;
  answer: string;
  confidence: number;
  source: string;
  topic?: string;
}

export class QueryCache {
  private entries: CacheEntry[] = [];
  private threshold: number;

  constructor(threshold = 0.6) {
    this.threshold = threshold;
  }

  loadFromCSV(rows: { query_pattern: string; cache_key: string; answer: string; confidence: string; source: string; topic?: string }[]) {
    this.entries = rows.map(r => ({
      queryPattern: r.query_pattern || '',
      cacheKey: r.cache_key || '',
      answer: r.answer || '',
      confidence: parseFloat(r.confidence || '0'),
      source: r.source || '',
      topic: r.topic || ''
    }));
  }

  normalize(text: string): string {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  tokenize(text: string): Set<string> {
    const normalized = this.normalize(text);
    const tokens = normalized.split(' ').filter(t => t.length > 2);
    return new Set(tokens);
  }

  match(query: string): CacheEntry | null {
    const queryTokens = this.tokenize(query);
    if (queryTokens.size === 0) return null;

    let bestMatch: CacheEntry | null = null;
    let bestScore = 0;

    for (const entry of this.entries) {
      const patterns = entry.queryPattern.split('|');
      for (const pattern of patterns) {
        const patternTokens = this.tokenize(pattern);
        if (patternTokens.size === 0) continue;

        // Calculate Jaccard similarity
        const intersection = new Set([...queryTokens].filter(t => patternTokens.has(t)));
        const union = new Set([...queryTokens, ...patternTokens]);
        const score = intersection.size / union.size;

        // Boost exact substring matches
        const normQuery = this.normalize(query);
        const normPattern = this.normalize(pattern);
        if (normQuery.includes(normPattern) || normPattern.includes(normQuery)) {
          const boost = Math.min(normQuery.length, normPattern.length) / Math.max(normQuery.length, normPattern.length);
          const boostedScore = score * 0.5 + boost * 0.5;
          if (boostedScore > bestScore) {
            bestScore = boostedScore;
            bestMatch = entry;
          }
        } else if (score > bestScore) {
          bestScore = score;
          bestMatch = entry;
        }
      }
    }

    if (bestScore >= this.threshold && bestMatch) {
      return { ...bestMatch, confidence: bestScore };
    }
    return null;
  }

  getStats(): { totalEntries: number; totalPatterns: number } {
    let totalPatterns = 0;
    for (const entry of this.entries) {
      totalPatterns += entry.queryPattern.split('|').length;
    }
    return { totalEntries: this.entries.length, totalPatterns };
  }
}
