# Expert Agent Group for Blocks Platform

A multi-agent system built for [Blocks](https://blocks.ai) with built-in CSV knowledge bases, intelligent query caching, and cross-domain routing. **No LLM calls required** for common questions — agents answer directly from embedded CSV data.

## What's New in v2

### Expanded SPANE Knowledge Base
- **12 validation studies** (up from 5): USA, Germany (N=1,057), China (N=4,250), Portugal, Spain (N=821), Arab Gulf (N=1,393), Mexico, Greece, Chile, Romania, Peru
- **10 related well-being measures**: PANAS, SWLS, Flourishing Scale, PERMA, MHC-SF, SHS, WEMWBS, OHQ, ABS, SGWB — each with full descriptions, scoring ranges, developers, and when-to-use guidance
- **24 cached FAQ entries** (up from 13): Including Arabic/Spanish/Mexican/Greek/Chilean/Romanian validation queries, PANAS/SWLS/Flourishing Scale/PERMA definitions, citation counts

### Expanded Blocks Streaming Knowledge Base
- **10 agent frameworks**: LangGraph, CrewAI, OpenAI Agents SDK, Google ADK, Microsoft Agent Framework, Pydantic AI, LlamaIndex, Mastra, Agno, DSPy — with orchestration styles, languages, model lock-in, MCP support, enterprise deployments, best-for use cases, and tradeoffs
- **5 communication protocols**: MCP (Model Context Protocol), A2A (Agent-to-Agent Protocol), ScaleMCP, AgentMaster, OpenTelemetry — with maintainers, launch dates, descriptions, use cases, and Blocks relation
- **10 benchmarks & metrics**: Princeton HAL GAIA, SWE-bench, token efficiency, latency, cost variation, LLM cost share, stateful pattern savings, prompt caching savings, market size forecasts ($7.84B → $52.62B)
- **25 cached FAQ entries** (up from 18): Including MCP/A2A definitions, framework comparisons, production recommendations, market forecasts

### New Cross-Domain Integration
- **10 cross-domain research papers** bridging well-being psychology and agent systems:
  - Diener et al. (2009) — Original SPANE paper (6,000+ citations)
  - Hendriks et al. (2019) — WEIRD psychology critique
  - Rajkumar (2020) — COVID-19 mental health review
  - Das et al. (2020) — Psychology + public health integration
  - Fredrickson (2006) — Broaden-and-build theory
  - Hart & Sasso (2011) — Contemporary positive psychology
  - Joseph & Wood (2010) — Clinical positive functioning assessment
  - Fu et al. (2024) — Survey on Agentic LLMs
  - Lin et al. (2025) — Multi-Agent Fact Checking
  - Zhao et al. (2024) — KoMA multi-agent framework
- **7 cross-domain cached FAQs**: AI well-being interventions, remote mental health monitoring, cross-cultural agent assessment, WEIRD problem, research data pipelines

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              INTEGRATED KNOWLEDGE AGENT                          │
│         (Router + Unified Cache + Cross-Domain)                 │
│                                                                  │
│   ┌──────────────────────┐    ┌──────────────────────┐         │
│   │   SPANE Expert       │◄──►│  Blocks Streaming    │         │
│   │   (Psychology)       │    │  Expert (Platform)   │         │
│   │                      │    │                      │         │
│   │ • 12 scale items     │    │ • 5 streaming methods│         │
│   │ • Scoring formulas   │    │ • 6 config options   │         │
│   │ • 12 validation      │    │ • 10 code patterns   │       │
│   │ • 24 cached FAQs     │    │ • 10 frameworks      │         │
│   │ • 10 related measures│   │ • 5 protocols      │         │
│   │ • Research papers    │    │ • 10 benchmarks      │         │
│   └──────────────────────┘    └──────────────────────┘         │
│            ▲                          ▲                         │
│            └────────────┬─────────────┘                         │
│                         │                                       │
│     Unified Cache: 59 patterns + 7 cross-domain patterns       │
│     Cross-Domain Papers: 10 research papers                     │
└─────────────────────────────────────────────────────────────────┘
```

## Agents

### 1. `spane_expert` — SPANE Psychology Expert
**Domain:** Positive psychology, well-being measurement, psychometrics, cross-cultural validation

**Built-in Data:**
| CSV File | Rows | Content |
|---|---|---|
| `spane_scale_items.csv` | 12 | Scale items with subscales (SPANE-P/SPANE-N) |
| `spane_scoring_guide.csv` | 3 | Scoring formulas (SPANE-P 6-30, SPANE-N 6-30, SPANE-B -24 to +24) |
| `spane_validation_studies.csv` | 5 | Core validation studies (USA, Germany, China, Portugal, International) |
| `spane_papers.csv` | 12 | Full research papers with citations, DOIs, sample sizes, countries |
| `spane_related_measures.csv` | 10 | Related well-being measures |
| `spane_faq_cache.csv` | 24 | Pre-cached common questions with instant answers |
| `spane_related_topics.csv` | 8 | Related psychology topics and application fields |

**New Cache Coverage:**
| Query Type | Examples | Cache Hit? |
|---|---|---|
| New validations | "SPANE Arabic validation Gulf region" | ✅ Instant |
| Related measures | "What is the Flourishing Scale?" | ✅ Instant |
| Measure comparisons | "SPANE vs PANAS" | ✅ Instant |
| Citation info | "How many citations does SPANE have?" | ✅ Instant |
| Spanish validation | "SPANE Spanish validation Espejo" | ✅ Instant |

### 2. `blocks_streaming_expert` — Blocks Streaming Expert
**Domain:** Blocks platform, SDK, streaming patterns, agent frameworks, protocols, benchmarks

**Built-in Data:**
| CSV File | Rows | Content |
|---|---|---|
| `streaming_methods.csv` | 5 | Streaming method types |
| `stream_config_options.csv` | 6 | Configuration reference |
| `code_patterns.csv` | 10 | Code snippets |
| `agent_frameworks.csv` | 10 | Agent framework comparison |
| `agent_protocols.csv` | 5 | Communication protocols |
| `agent_benchmarks.csv` | 10 | Performance benchmarks |
| `streaming_faq_cache.csv` | 25 | Pre-cached common questions with instant answers |
| `streaming_related_topics.csv` | 8 | Related platform topics |

**New Cache Coverage:**
| Query Type | Examples | Cache Hit? |
|---|---|---|
| Protocols | "What is MCP protocol?" | ✅ Instant |
| Framework comparison | "LangGraph vs CrewAI for production?" | ✅ Instant |
| Benchmarks | "Agent framework benchmarks 2026" | ✅ Instant |
| Market data | "AI agent market size forecast" | ✅ Instant |
| Production advice | "Which framework for production?" | ✅ Instant |

### 3. `integrated_knowledge_expert` — Cross-Domain Router
**Domain:** Both SPANE + Blocks, with intelligent routing and cross-domain synthesis

**Features:**
- **Query Router:** 50+ keyword-based topic detection (SPANE vs Blocks vs Both)
- **Unified Cache:** 59+ query patterns across both domains + 7 cross-domain patterns
- **Cross-Domain Papers:** 10 research papers with venue, topic area, description, and connection
- **Cross-Domain Synthesis:** Answers questions like "Can SPANE be used with Blocks?", "AI well-being interventions", "Remote mental health monitoring"

## How Caching Works

```
Incoming Query
      │
      ▼
┌─────────────────┐
│ Normalize Query │  lowercase → remove punctuation → tokenize
└─────────────────┘
      │
      ▼
┌─────────────────┐
│  Token Match    │  Jaccard similarity + substring boost
│   vs CSV Cache  │  Threshold: 0.50–0.55
└─────────────────┘
      │
   ┌──┴──┐
   │      │
  HIT   MISS
   │      │
   ▼      ▼
Instant   Search CSV
Return    Knowledge Base
          (still no LLM)
```

Every response includes cache stats (hit rate, entries, patterns) in the footer.

## Deployment

### Prerequisites
- Node.js 22+
- Blocks CLI: `npm install -g @blocks-network/cli`

### Per-Agent Deployment

```bash
# SPANE Expert
cd spane-expert
npm install
blocks login --write-env
blocks check && blocks register && blocks run

# Blocks Streaming Expert  
cd blocks-streaming-expert
npm install
blocks login --write-env
blocks check && blocks register && blocks run

# Integrated Agent
cd integrated-knowledge-agent
npm install
blocks login --write-env
blocks check && blocks register && blocks run
```

### Publishing (Public)

```bash
blocks publish --billing-mode paid --listing public --price-per-task 0.01
# or per-minute for streaming-heavy agents:
blocks publish --billing-mode paid --listing public --price-per-minute 0.05
```

## Data Files Summary

### SPANE Expert (7 CSV files)
| File | Rows | Description |
|---|---|---|
| `spane_scale_items.csv` | 12 | Scale items and subscales |
| `spane_scoring_guide.csv` | 3 | Scoring formulas |
| `spane_validation_studies.csv` | 5 | Core validation studies |
| `spane_papers.csv` | 12 | Full research papers with citations |
| `spane_related_measures.csv` | 10 | Related well-being measures |
| `spane_faq_cache.csv` | 24 | Cached Q&A |
| `spane_related_topics.csv` | 8 | Related psychology topics |

### Blocks Streaming Expert (8 CSV files)
| File | Rows | Description |
|---|---|---|
| `streaming_methods.csv` | 5 | Streaming method types |
| `stream_config_options.csv` | 6 | Configuration reference |
| `code_patterns.csv` | 10 | Code snippets |
| `agent_frameworks.csv` | 10 | Agent framework comparison |
| `agent_protocols.csv` | 5 | Communication protocols |
| `agent_benchmarks.csv` | 10 | Performance benchmarks |
| `streaming_faq_cache.csv` | 25 | Cached Q&A |
| `streaming_related_topics.csv` | 8 | Related platform topics |

### Integrated Agent (3 CSV files)
| File | Rows | Description |
|---|---|---|
| `unified_faq_cache.csv` | 7 | Cross-domain Q&A |
| `topic_index.csv` | 3 | Topic routing index |
| `cross_domain_papers.csv` | 10 | Research papers bridging domains |

**Total: 18 CSV files with ~160 rows of structured data**

## Query Routing Logic (Integrated Agent)

```typescript
// 50+ keyword scoring system
const topicKeywords = {
  spane: ['spane', 'diener', 'well-being', 'positive affect', 'flourishing', 
          'perma', 'panas', 'swls', 'mhc-sf', 'weird psychology', ...],
  blocks: ['blocks', 'streaming', 'langgraph', 'crewai', 'mcp', 'a2a',
           'agent framework', 'protocol', 'benchmark', 'market size', ...]
};

// If both topics score > 2 → route to BOTH (cross-domain synthesis)
// Otherwise → route to highest scoring topic
```

## Extending

### Adding New Cache Entries

Edit the `*_faq_cache.csv` files:

```csv
query_pattern,cache_key,answer,confidence,source
what is new topic|new topic question,new_topic_key,"Your instant answer here.",1.0,Your Source
```

Use `|` to separate multiple query patterns that should match the same answer.

### Adding New Research Papers

Edit `spane_papers.csv` or `cross_domain_papers.csv`:

```csv
paper_id,authors,year,title,journal,doi,country,language,sample_size,key_findings,citations_approx
13,New Author,2025,New SPANE Validation Study,Journal Name,10.1000/xyz,Country,Language,500,Key findings here,50
```

### Adding New Agent Frameworks

Edit `agent_frameworks.csv`:

```csv
framework_id,name,orchestration_style,language,model_lockin,mcp_support,github_stars_2026,monthly_downloads,enterprise_deployments,best_for,tradeoffs
11,NewFramework,New style,Python,Low,Native,Growing,Strong,Growing,Use case,Tradeoffs
```

## Compatibility

| Feature | Support |
|---|---|
| Blocks Platform | ✅ Full |
| Request Tasks | ✅ Yes |
| Pipe Tasks | ✅ Supported in code (can be enabled) |
| Streaming Output | ✅ ctx.reportStatus() for progress |
| Node.js SDK | ✅ TypeScript |
| Python SDK | ⚠️ Port handler logic to Python |
| Agent-to-Agent | ✅ ctx.taskClient ready |
| MCP Integration | ✅ Referenced in knowledge base |
| A2A Protocol | ✅ Referenced in knowledge base |

## License

MIT — Built for the Blocks Network.
