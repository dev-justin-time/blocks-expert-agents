// query-router.ts - Routes queries to appropriate topic/expert
export interface RouterResult {
  topic: string;
  confidence: number;
  reason: string;
}

export class QueryRouter {
  private topicKeywords: Map<string, string[]> = new Map();

  constructor() {
    this.topicKeywords.set('spane', [
      'spane', 'positive negative experience', 'scale of positive', 'emotional balance',
      'spane-p', 'spane-n', 'spane-b', 'diener', 'well-being scale', 'affect frequency',
      'positive affect', 'negative affect', 'psychology scale', 'spane scoring',
      'spane validation', 'spane items', 'spane questions', 'panas comparison',
      'spane german', 'spane chinese', 'spane portuguese', 'faraday cage',
      'gary brecka', 'emotional frequency', 'authenticity emotion', 'flourishing'
    ]);

    this.topicKeywords.set('blocks', [
      'blocks', 'streaming', 'pipe', 'request stream', 'ctx.createStream', 'agent card',
      'blocks sdk', 'blocks network', 'taskKind', 'cancelSignal', 'bundleSizeBytes',
      'maxLatencyMs', 'stream format', 'bytes vs events', 'handler.ts', 'blocks init',
      'blocks publish', 'blocks run', 'blocks register', 'taskClient', 'artifact',
      'bidirectional', 'subscribeGrace', 'blocks cli', 'blocks ai', 'mcp server',
      'openclaw', 'hermes', 'crewai blocks', 'langchain blocks', 'llamaindex blocks'
    ]);
  }

  route(query: string): RouterResult {
    const normalized = query.toLowerCase();
    const scores: Map<string, number> = new Map();

    for (const [topic, keywords] of this.topicKeywords) {
      let score = 0;
      for (const kw of keywords) {
        if (normalized.includes(kw.toLowerCase())) {
          score += kw.split(' ').length; // Weight multi-word matches higher
        }
      }
      scores.set(topic, score);
    }

    let bestTopic = 'general';
    let bestScore = 0;
    let totalScore = 0;

    for (const [topic, score] of scores) {
      totalScore += score;
      if (score > bestScore) {
        bestScore = score;
        bestTopic = topic;
      }
    }

    const confidence = totalScore > 0 ? bestScore / totalScore : 0;

    return {
      topic: bestTopic,
      confidence,
      reason: bestScore > 0 ? `Matched ${bestScore} keyword points for topic '${bestTopic}'` : 'No strong topic match; defaulting to general'
    };
  }
}
