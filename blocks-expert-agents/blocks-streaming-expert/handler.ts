import type { StartTaskMessage, TaskContext, HandlerResult } from '@blocks-network/sdk';
import * as fs from 'fs';
import * as path from 'path';

// ======== EMBEDDED CSV DATA (fallback if files missing) ========
const EMBEDDED_METHODS = `method_id,method_name,task_kind,duration,use_case,direction,format,affinity,description
1,Request Streaming,request,One-shot,LLM text generation code review progress updates,outbound,bytes,_default,Stream output during a one-shot task then return final artifact. Most common pattern.
2,Pipe Streaming,pipe,1-30 days,"Stock tickers monitoring real-time feeds interactive sessions",outbound,events,dedicated,Long-lived sessions with continuous bidirectional data flow. Agent runs continuously.
3,Bidirectional Pipe,pipe,1-30 days,Real-time translation interactive chat,bidirectional,events,dedicated,Both agent and caller read and write on the same stream for interactive sessions.
4,Event Streaming,pipe,1-30 days,"IoT sensor data telemetry structured monitoring",outbound,events,dedicated,Stream structured objects optimized for monitoring data sensor readings.
5,Byte Streaming,request,One-shot,"Progressive text binary data LLM tokens",outbound,bytes,_default,Raw chunked data optimized for LLM token streaming and progressive output.`;

const EMBEDDED_OPTIONS = `option_name,type,default,applies_to,description,example
format,string,bytes,all,"Stream format: 'bytes' for chunked text/binary or 'events' for structured objects",events
bundleSizeBytes,number,2048,bytes,Maximum size of a single buffer write batch. Reduces message volume.,4096
maxLatencyMs,number,50,all,Maximum time to buffer before flushing. Balances latency vs efficiency.,100
direction,string,outbound,all,"Data flow direction: 'outbound' 'inbound' or 'bidirectional'",bidirectional
declaredStream,string,_default,all,"Key from agent card's streams block. Defaults to '_default' for request tasks.",stream
subscribeGraceMs,number,1000,pipe,Grace period to wait after stream_started before returning giving caller time to subscribe.,2000`;

const EMBEDDED_PATTERNS = `pattern_id,pattern_name,code_snippet,language,description
1,Basic Request Stream,"const stream = await ctx.createStream(); stream.write('chunk'); await stream.end();",TypeScript,Open a stream write chunks and close it for one-shot tasks
2,Event Stream Pipe,"const stream = await ctx.createStream({format:'events',declaredStream:'stream'}); stream.write({type:'quote',symbol:'AAPL',price:187.50});",TypeScript,Stream structured objects for continuous data feeds
3,Caller Consume Stream,"const streamRef = await session.waitForStream(); const stream = streamRef.open(); for await (const inbound of stream.inbound) { process.stdout.write(inbound.data); }",TypeScript,Wait for agent to open stream and consume chunks as they arrive
4,Caller Send Pipe,"const session = await client.sendMessage({agentName:'stock_sim',taskKind:'pipe',duration:5,requestParts:[{partId:'request',text:'AAPL,MSFT'}]});",TypeScript,Open a pipe task with duration and consume real-time events
5,Abort Signal Check,"while (!ctx.cancelSignal.aborted) { stream.write(data); await sleep(1000, ctx.cancelSignal); }",TypeScript,Check cancelSignal in loop for pipe tasks to handle cancellation
6,Agent Card Request,"{\"capabilities\":{\"taskKinds\":[\"request\"]},\"streams\":{\"_default\":{\"direction\":\"outbound\",\"format\":\"bytes\"}}}",JSON,Agent card configuration for request streaming with default stream
7,Agent Card Pipe,"{\"capabilities\":{\"taskKinds\":[\"pipe\"]},\"streams\":{\"stream\":{\"direction\":\"outbound\",\"format\":\"events\",\"affinity\":\"dedicated\"}}}",JSON,Agent card configuration for pipe streaming with named dedicated stream
8,Error Handling,"stream.onError((err) => { console.error('Stream error:',err); cleanup(); });",TypeScript,Register callback for stream-level errors like network failure or PAM revocation
9,Status Reporting,"ctx.reportStatus('Streaming output...');",TypeScript,Send progress updates to caller visible in real time
10,Python Handler,"def handler(task, ctx=None): text=''; return {'artifacts':[{'data':result,'mimeType':'text/plain'}]}",Python,Basic Python handler signature returning artifacts`;

const EMBEDDED_FRAMEWORKS = `framework_id,name,orchestration_style,language,model_lockin,mcp_support,github_stars_2026,monthly_downloads,enterprise_deployments,best_for,tradeoffs
1,LangGraph,Graph-based state machines,Python TypeScript,Low,Native,High,34.5M,~400 companies,Klarna Uber LinkedIn BlackRock Cisco JPMorgan Replit,"Regulated industries stateful workflows auditability deterministic control human-in-the-loop. 1-2 week ramp. Best for production.",Higher complexity; steeper learning curve
2,CrewAI,Role-based crews,Python,Low,Native (v1.10+),44600+,10M+ agents/month,IBM PwC Gelato ~60% Fortune 500,"Fast multi-agent prototyping stakeholder demos linear workflows","2-4 hour setup. Role-based abstraction. Up to 3x token overhead vs LangGraph on simple workflows. Less fine-grained control.",Limited for complex branching/state management
3,OpenAI Agents SDK,Handoff chains,Python TypeScript,Low (100+ LLMs),Native,19000+,10.3M,Wide adoption,"GPT-centric agents sandboxed tools voice workflows","Lowest friction for OpenAI-centered workflows. Native sandboxing sub-agents Codex-style tools. April 2026 overhaul added MCP support.",Tightest to OpenAI ecosystem
4,Google ADK,Hierarchical agents,Python,Medium (Gemini),Native,17000+,Growing,50+ A2A partners Salesforce ServiceNow,"Multimodal agents GCP-native stacks cross-framework interoperability","Strongest for video voice image text in single workflow. A2A-powered interoperability. Best Gemini integration.",Medium vendor lock-in; GCP-centric
5,Microsoft Agent Framework,Graph workflows,Python .NET,Medium (Azure),Native,Post-merger,Growing,Enterprise Azure,".NET Azure-native enterprises unified AutoGen+Semantic Kernel","v1.0 GA April 2026. Merged AutoGen and Semantic Kernel. Graph orchestration with Cosmos DB persistence. Best for Microsoft stacks.",Azure-centric; AutoGen in maintenance mode
6,Pydantic AI,Type-safe composable,Python,Low,Native,Growing,Strong,Growing,"Type-safe production agents composable design durable execution","Strongest type safety in Python. Low vendor coupling. Good for teams wanting compile-time validation.",Smaller ecosystem than LangGraph
7,LlamaIndex,Retrieval-centric,Python TypeScript,Low,Adapter,Very High,Very High,Wide,"RAG-heavy knowledge bases document search internal KBs","Best-in-class data connectors and indexing strategies. Vector tree keyword hybrid indexing. Often combined with LangGraph for orchestration.",Less natural for non-retrieval multi-agent workflows
8,Mastra,Workflow + agents,TypeScript,Low,Native,19000+,300K+ npm/week,Growing,"TypeScript Next.js stacks frontend-adjacent agents","From Gatsby team. Clean Next.js integration. Human-in-the-loop primitives. De facto TypeScript choice.",TypeScript-only; smaller than Python ecosystem
9,Agno (Phidata),Fast multi-agent runtime,Python,Low,Native,Growing,Strong,Growing,"High-throughput agent swarms bulk content generation","Lightweight runtime. Faster horizontal scaling than LangGraph. Less opinionated than CrewAI.",Newer; smaller community
10,DSPy,Programmatic LM compilation,Python,Low,Adapter,Academic,Academic,Research,"Prompt optimization as compilation systematic LM programming","Optimizes prompts automatically via compilation. Strong for research and systematic prompt engineering.",Research-focused; less production tooling`;

const EMBEDDED_PROTOCOLS = `protocol_id,name,full_name,maintainer,launched,description,use_case,blocks_relation
1,MCP,Model Context Protocol,Linux Foundation (Anthropic OpenAI Google Microsoft AWS),2024,Standardized communication interface for agents to access external tools data services and contextual repositories. Client-server design with schema consistency access control and auditability.,Agent-to-tool communication: filesystems databases APIs internal tools. Stateless and stateful session support.,Blocks agents can use MCP to connect to external tools and data sources. ctx.taskClient enables agent-to-tool calls.
2,A2A,Agent-to-Agent Protocol,Linux Foundation (Google-led),2025,Standardized peer communication protocol for independent AI agents to discover each other delegate tasks and coordinate without central orchestrator. Supports negotiation and structured metadata.,Agent-to-agent communication: subtask delegation result sharing diagnostic information telemetry broadcast across distributed ecosystems.,Blocks platform supports agent-to-agent communication via ctx.taskClient. A2A is the emerging standard for cross-agent interoperability.
3,ScaleMCP,ScaleMCP,Open source community,2025,Dynamic and auto-synchronizing MCP tool inventory across agents. Extends MCP with automatic tool discovery and synchronization.,Large-scale deployments where tool catalogs change frequently and agents need up-to-date tool access without manual configuration.,Relevant for Blocks agents managing large tool ecosystems or calling multiple external services.
4,AgentMaster,AgentMaster,Open source community,2025,Multi-agent conversational framework combining A2A and MCP protocols for multimodal information retrieval and analysis.,Complex multi-modal workflows requiring both tool access (MCP) and peer coordination (A2A) in a single framework.,Pattern that Blocks streaming agents could adopt for advanced multi-modal multi-agent orchestration.
5,OpenTelemetry,OpenTelemetry,CNCF,2019,Distributed tracing and observability standard. Most agent frameworks emit OpenTelemetry-based traces for debugging and monitoring.,Production observability: tracking agent decisions tool calls latency errors across distributed agent systems.,Blocks agents can integrate OpenTelemetry for production monitoring and debugging of streaming and request tasks.`;

const EMBEDDED_BENCHMARKS = `benchmark_id,name,metric,langgraph_score,crewai_score,openai_score,google_score,notes,year
1,Princeton HAL GAIA,Accuracy (%),64.9,Varies,57.6 (Open Deep Research),Varies,Same Claude Opus 4 model scores 64.9% vs 57.6% across scaffolds — 7-point gap from orchestration alone,2026
2,SWE-bench Verified,Accuracy (%),N/A,N/A,87.6 (Claude Opus 4.7),N/A,Claude Opus 4.7 performance on software engineering tasks,2026
3,Token Efficiency (simple tasks),Relative tokens,1.0x baseline,~3.0x higher,Varies,Varies,CrewAI carries up to 3x token overhead of LangGraph on single-tool-call workflows,2026
4,Latency (5 tasks avg),Speed,Fastest,Moderate,Moderate,Moderate,LangGraph fastest across 5-task benchmark; AutoGen matched on latency with different token profile,2026
5,Lab vs Production Gap,Performance drop,~37%,~37%,~37%,~37%,CLEAR framework: 37% average gap between lab benchmark scores and production deployment performance,2025
6,Cost Variation (similar accuracy),Cost multiplier,1x-50x,1x-50x,1x-50x,1x-50x,Up to 50x cost variation across agents achieving similar accuracy levels,2025
7,LLM Cost Share,Percentage of OpEx,40-60%,40-60%,40-60%,40-60%,LLM API calls run 40-60% of total agent operating cost in most production deployments,2026
8,Stateful Pattern Savings,Cost reduction,40-50%,N/A,N/A,N/A,LangGraph LLM call savings with stateful patterns on repeat workflows,2026
9,Prompt Caching Savings,Cost reduction,80-90%,80-90%,80-90%,80-90%,Anthropic and Google prompt caching cost reduction on stable-context workloads,2026
10,Market Size,USD billions,7.84B (2025) → 52.62B (2030),Same,Same,Same,46.3% CAGR; global AI agent market forecast,2025-2030`;

const EMBEDDED_FAQ = `query_pattern,cache_key,answer,confidence,source
what is request streaming|request streaming blocks|blocks request stream,req_stream_def,"Request streaming is a Blocks pattern where your agent processes a one-shot task streams intermediate output as it's produced and returns a final artifact when done. Use ctx.createStream() to open a stream write chunks and close it. The caller sees output token by token or event by event while the agent is still working.",1.0,Blocks SDK Documentation
what is pipe streaming|pipe streaming blocks|blocks pipe stream,pipe_stream_def,"Pipe streaming is for agents that run continuously: monitoring real-time feeds interactive sessions or anything where interaction isn't single Q&A. Pipe tasks have durations from 1 minute to 30 days. The agent and caller exchange data through streams for the entire session. Use taskKind:'pipe' and set duration.",1.0,Blocks SDK Documentation
difference between request and pipe|request vs pipe|when to use request vs pipe,req_vs_pipe,"Use REQUEST streaming for: LLM text generation code review with progress any one-shot task where you want progressive output. Use PIPE streaming for: stock tickers monitoring real-time translation IoT sensor data interactive sessions anything continuous lasting 1 min to 30 days.",1.0,Blocks SDK Documentation
how to create stream|ctx.createStream|open stream blocks,create_stream,"Use ctx.createStream(options?) where options include: format ('bytes' or 'events') bundleSizeBytes (max batch size) maxLatencyMs (buffer flush time) direction ('outbound'/'inbound'/'bidirectional') declaredStream (key from agent card). Returns a StreamObject with .write() .end() .onError() methods.",1.0,Blocks SDK Documentation
stream format bytes vs events|bytes or events|stream format difference,stream_formats,"BYTES: Raw chunked data for LLM tokens progressive text binary. Write strings or Uint8Array. EVENTS: Structured objects for monitoring stock tickers sensors. Write serializable objects. Choose bytes for text generation; events for structured data feeds.",1.0,Blocks SDK Documentation
how to consume stream as caller|caller stream consumption|read stream blocks,consume_stream,"As caller: 1) Send task with stream:true for request or taskKind:'pipe' with duration. 2) const streamRef = await session.waitForStream(). 3) const stream = streamRef.open(). 4) for await (const inbound of stream.inbound) { processChunk(inbound.data); }. 5) session.onArtifact() receives final artifact after stream ends.",1.0,Blocks SDK Documentation
agent card streams configuration|streams block|how to configure streams,agent_card_streams,"In agent-card.json add 'streams' object alongside capabilities. For request: use '_default' key with direction:'outbound' format:'bytes'. For pipe: use named key (not '_default') with direction:'outbound' format:'events' affinity:'dedicated'. The handler must pass declaredStream matching this key to ctx.createStream().",1.0,Blocks SDK Documentation
what is bundleSizeBytes|bundle size|stream batching,bundle_size,"bundleSizeBytes sets the maximum size of a single buffer write batch. Default is 2048. Larger values reduce message volume but may increase latency. Use with maxLatencyMs to balance throughput vs responsiveness.",1.0,Blocks SDK Documentation
what is maxLatencyMs|max latency|stream latency,max_latency,"maxLatencyMs sets the maximum time to buffer before flushing data to caller. Default is 50ms. Lower values = lower latency but more messages. Higher values = better batching but caller waits longer. Tune based on your use case.",1.0,Blocks SDK Documentation
how to handle stream errors|stream.onError|error handling streams,stream_errors,"Use stream.onError(callback) to register a callback for stream-level errors: network failures PAM revocation etc. In pipe handlers use try/catch around your streaming loop and check ctx.cancelSignal.aborted to handle task cancellation or expiration gracefully.",1.0,Blocks SDK Documentation
how to install blocks sdk|blocks sdk install|npm install blocks,sdk_install,"Node.js: npm install @blocks-network/sdk (requires .npmrc from blocks init). Python: pip install blocks_network. Requires Node.js 22+ or Python 3.12+. Install CLI: curl -fsSL https://config.blocks.ai/install.sh | sh or npm install -g @blocks-network/cli",1.0,Blocks SDK Documentation
how to scaffold agent|blocks init|create new agent,scaffold,"Run: blocks init my_agent --mode provider --language node -y. This creates agent-card.json handler.ts trigger.ts package.json .env .gitignore. Then cd my_agent && npm install. Authenticate with blocks login --write-env.",1.0,Blocks SDK Documentation
blocks handler signature|handler.ts|blocks handler pattern,handler_sig,"TypeScript: export default async function handler(task: StartTaskMessage ctx?: TaskContext): Promise<HandlerResult>. Python: def handler(task: StartTaskMessage ctx: Optional[TaskContext]=None) -> dict. Return {artifacts:[{data:result mimeType:'text/plain'}]}.",1.0,Blocks SDK Documentation
how to publish agent|blocks publish|make agent public,publish,"1) blocks check to validate. 2) blocks login --write-env to authenticate. 3) blocks register for private free. 4) blocks run to connect. 5) Test with trigger.ts. 6) blocks publish --billing-mode paid with --listing and pricing flags to go public. Keep 85% of revenue.",1.0,Blocks SDK Documentation
what is cancelSignal|ctx.cancelSignal|abort signal blocks,cancel_signal,"ctx.cancelSignal is an AbortSignal that fires when the task is canceled by caller or duration expires. Always check it in pipe handler loops: while (!ctx.cancelSignal.aborted) { ... }. Use with a sleep helper that respects the signal for clean shutdown.",1.0,Blocks SDK Documentation
subscribeGraceMs|grace period|stream subscription,subscribe_grace,"subscribeGraceMs is the grace period (default 1000ms) to wait after stream_started before returning from handler giving caller time to subscribe. Set to 0 to skip. Only relevant for pipe tasks where caller needs time to set up stream consumption.",1.0,Blocks SDK Documentation
how to call other agents|agent to agent|blocks agent communication,a2a,"Use ctx.taskClient to discover and call other agents on the network while streaming output to your own callers. Your agent can act as an orchestrator calling specialized agents for sub-tasks.",1.0,Blocks SDK Documentation
blocks pricing|how much does blocks cost|blocks revenue,pricing,"Agents can be free or paid. Paid agents set price per task or per minute (per-minute suits streaming). Run blocks publish with --billing-mode paid and appropriate --listing and pricing flags. Platform keeps 15%; you keep 85%.",1.0,Blocks SDK Documentation
what is mcp|model context protocol|mcp protocol,mcp_def,"Model Context Protocol (MCP) is an open standard (Linux Foundation 2024) defining how AI agents connect to tools and data sources. Client-server design with schema consistency access control and auditability. Supported natively by LangGraph CrewAI OpenAI Agents SDK Google ADK Pydantic AI and others. MCP for tools A2A for agents.",1.0,Linux Foundation; arXiv 2601.13671
what is a2a|agent to agent protocol|a2a protocol,a2a_def,"Agent-to-Agent Protocol (A2A) is an open standard (Linux Foundation 2025) defining how independent AI agents discover each other delegate tasks and coordinate without central orchestrator. Supports negotiation and structured metadata. 50+ partners including Salesforce and ServiceNow. Google design principle: MCP for tools A2A for agents.",1.0,Linux Foundation; Google ADK
langgraph vs crewai|which agent framework|best agent framework 2026,framework_comparison,"LangGraph: graph-based state machines for production stateful workflows. ~400 enterprise deployments. 34.5M monthly downloads. Best for regulated industries.\nCrewAI: role-based crews for fast prototyping. 44,600+ stars. 2-4 hour setup. ~3x token overhead on simple tasks. Best for demos and linear workflows.\nOpenAI Agents SDK: GPT-centric with sandboxed tools. Lowest friction for OpenAI workflows.\nGoogle ADK: multimodal GCP-native with A2A interoperability.\nMicrosoft Agent Framework: .NET/Azure unified AutoGen+Semantic Kernel v1.0 GA April 2026.",1.0,Uvik 2026; Langfuse 2026
agent framework benchmarks|agent performance gap|framework performance difference,framework_benchmarks,"Framework choice moves agent benchmark performance by up to 30 percentage points on identical models. Princeton HAL: Claude Opus 4 scores 64.9% vs 57.6% on GAIA across scaffolds — 7-point gap from orchestration alone. CrewAI carries up to 3x token overhead vs LangGraph. LLM costs are 40-60% of total agent OpEx. CLEAR framework: 37% gap between lab and production performance.",1.0,Princeton HAL 2026; Uvik 2026; arXiv 2511.14136
which framework for production|production agent framework|enterprise agent framework,prod_framework,"For production stateful workflows in regulated industries: LangGraph (Klarna Uber JPMorgan BlackRock). For .NET/Azure: Microsoft Agent Framework. For GPT-centric: OpenAI Agents SDK. For multimodal GCP: Google ADK. For fast prototyping: CrewAI (plan migration to LangGraph before production scale). For TypeScript: Mastra. For RAG-heavy: LlamaIndex + LangGraph.",1.0,Uvik 2026; Langfuse 2026
agent market size|ai agent market|agent industry forecast,market_size,"Global AI agent market: $7.84B (2025) → $52.62B (2030) at 46.3% CAGR. ~67% of large enterprises run agentic AI in production (2026). Only ~5% successfully move from pilot to production (MIT 300+ implementations). Gartner forecasts ~33% of agentic AI deployments will be multi-agent by 2027.",1.0,Uvik 2026; McKinsey 2025; Gartner 2026`;

const EMBEDDED_RELATED = `topic_id,topic_name,relation_type,description,connection_to_streaming
1,Agent-to-Agent Communication,Advanced feature,Calling other agents from your agent while processing tasks,Streaming agents can call other agents via ctx.taskClient while streaming to their own caller
2,OpenClaw,Scaffolding tool,Build agents by chatting without boilerplate,Can scaffold streaming agents with built-in streaming support
3,Hermes,Scaffolding tool,Scaffold agents from a conversation,Alternative to blocks init for creating streaming handlers
4,CrewAI,Framework integration,Multi-agent crew framework,Can expose CrewAI crew as one callable agent with streaming output
5,LangChain,Framework integration,LangChain/LangGraph framework,Wrap existing LangChain chains as Blocks streaming agents
6,LlamaIndex,Framework integration,RAG pipeline framework,Turn LlamaIndex pipelines into network agents with progressive output
7,n8n,Workflow integration,Workflow automation platform,Bridge n8n workflows into Blocks over webhook with streaming support
8,MCP Server,Integration,Model Context Protocol server,Add @blocks-network/mcp-server to Claude Cursor Codex CLI to call agents by name
9,Error Handling,Operations,Fatal vs non-fatal stream errors and recovery,Essential for production streaming agents; use stream.onError() and try/catch
10,Progressive Artifacts,Output pattern,Publish artifacts mid-execution without waiting for HandlerResult,Use ctx.publishArtifact() for progressive output alongside streaming`;

// ======== CSV PARSER ========
interface CSVRow { [key: string]: string; }

function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: CSVRow = {};
      headers.forEach((h, idx) => row[h] = values[idx] || '');
      rows.push(row);
    }
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += char; }
  }
  result.push(current.trim());
  return result;
}

function loadCSV(fileName: string, embedded: string): CSVRow[] {
  try {
    const filePath = path.join(__dirname, 'data', fileName);
    if (fs.existsSync(filePath)) {
      return parseCSV(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) { /* fall through */ }
  return parseCSV(embedded);
}

// ======== CACHE SYSTEM ========
interface CacheEntry {
  queryPattern: string;
  cacheKey: string;
  answer: string;
  confidence: number;
  source: string;
}

class QueryCache {
  private entries: CacheEntry[] = [];
  private threshold: number;
  private hitCount = 0;
  private missCount = 0;

  constructor(threshold = 0.55) { this.threshold = threshold; }

  load(rows: CSVRow[]) {
    this.entries = rows.map(r => ({
      queryPattern: r['query_pattern'] || '',
      cacheKey: r['cache_key'] || '',
      answer: r['answer'] || '',
      confidence: parseFloat(r['confidence'] || '0'),
      source: r['source'] || ''
    }));
  }

  normalize(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  tokenize(text: string): Set<string> {
    return new Set(this.normalize(text).split(' ').filter(t => t.length > 2));
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

        const intersection = new Set([...queryTokens].filter(t => patternTokens.has(t)));
        const union = new Set([...queryTokens, ...patternTokens]);
        let score = intersection.size / union.size;

        const normQuery = this.normalize(query);
        const normPattern = this.normalize(pattern);
        if (normQuery.includes(normPattern) || normPattern.includes(normQuery)) {
          const boost = Math.min(normQuery.length, normPattern.length) / Math.max(normQuery.length, normPattern.length);
          score = score * 0.3 + boost * 0.7;
        }

        if (score > bestScore) { bestScore = score; bestMatch = entry; }
      }
    }

    if (bestScore >= this.threshold && bestMatch) {
      this.hitCount++;
      return { ...bestMatch, confidence: bestScore };
    }
    this.missCount++;
    return null;
  }

  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      entries: this.entries.length,
      patterns: this.entries.reduce((sum, e) => sum + e.queryPattern.split('|').length, 0),
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: total > 0 ? (this.hitCount / total * 100).toFixed(1) + '%' : 'N/A'
    };
  }
}

// ======== KNOWLEDGE BASE ========
class StreamingKnowledgeBase {
  methods: CSVRow[] = [];
  options: CSVRow[] = [];
  patterns: CSVRow[] = [];
  frameworks: CSVRow[] = [];
  protocols: CSVRow[] = [];
  benchmarks: CSVRow[] = [];
  related: CSVRow[] = [];
  cache: QueryCache;

  constructor() {
    this.methods = loadCSV('streaming_methods.csv', EMBEDDED_METHODS);
    this.options = loadCSV('stream_config_options.csv', EMBEDDED_OPTIONS);
    this.patterns = loadCSV('code_patterns.csv', EMBEDDED_PATTERNS);
    this.frameworks = loadCSV('agent_frameworks.csv', EMBEDDED_FRAMEWORKS);
    this.protocols = loadCSV('agent_protocols.csv', EMBEDDED_PROTOCOLS);
    this.benchmarks = loadCSV('agent_benchmarks.csv', EMBEDDED_BENCHMARKS);
    this.related = loadCSV('streaming_related_topics.csv', EMBEDDED_RELATED);
    this.cache = new QueryCache(0.55);
    this.cache.load(loadCSV('streaming_faq_cache.csv', EMBEDDED_FAQ));
  }

  search(query: string): { type: string; data: CSVRow[]; relevance: number }[] {
    const normalized = query.toLowerCase();
    const results: { type: string; data: CSVRow[]; relevance: number }[] = [];

    const methodMatches = this.methods.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (methodMatches.length > 0) results.push({ type: 'methods', data: methodMatches, relevance: methodMatches.length * 1.2 });

    const optionMatches = this.options.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (optionMatches.length > 0) results.push({ type: 'options', data: optionMatches, relevance: optionMatches.length });

    const patternMatches = this.patterns.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (patternMatches.length > 0) results.push({ type: 'patterns', data: patternMatches, relevance: patternMatches.length * 1.5 });

    const fwMatches = this.frameworks.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (fwMatches.length > 0) results.push({ type: 'frameworks', data: fwMatches, relevance: fwMatches.length * 1.4 });

    const protoMatches = this.protocols.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (protoMatches.length > 0) results.push({ type: 'protocols', data: protoMatches, relevance: protoMatches.length * 1.3 });

    const benchMatches = this.benchmarks.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (benchMatches.length > 0) results.push({ type: 'benchmarks', data: benchMatches, relevance: benchMatches.length * 1.2 });

    const relMatches = this.related.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (relMatches.length > 0) results.push({ type: 'related', data: relMatches, relevance: relMatches.length * 0.8 });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  generateAnswer(query: string, searchResults: { type: string; data: CSVRow[] }[]): string {
    let answer = '';

    for (const result of searchResults.slice(0, 4)) {
      if (result.type === 'methods') {
        answer += `## Streaming Methods\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['method_name']}** (${r['task_kind']}): ${r['description']}\n`;
          answer += `  - Duration: ${r['duration']} | Direction: ${r['direction']} | Format: ${r['format']}\n`;
        });
        answer += `\n`;
      }
      if (result.type === 'options') {
        answer += `## Stream Configuration Options\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['option_name']}** (${r['type']}, default: ${r['default']}): ${r['description']}\n`;
          answer += `  - Applies to: ${r['applies_to']} | Example: ${r['example']}\n`;
        });
        answer += `\n`;
      }
      if (result.type === 'patterns') {
        answer += `## Code Patterns\n\n`;
        result.data.forEach(r => {
          answer += `### ${r['pattern_name']}\n`;
          answer += `\`\`\`${r['language']}\n${r['code_snippet']}\n\`\`\`\n`;
          answer += `${r['description']}\n\n`;
        });
      }
      if (result.type === 'frameworks') {
        answer += `## Agent Frameworks\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['name']}** (${r['orchestration_style']}, ${r['language']})\n`;
          answer += `  - Best for: ${r['best_for']}\n`;
          answer += `  - MCP: ${r['mcp_support']} | Model lock-in: ${r['model_lockin']}\n`;
          answer += `  - Tradeoffs: ${r['tradeoffs']}\n`;
        });
        answer += `\n`;
      }
      if (result.type === 'protocols') {
        answer += `## Communication Protocols\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['name']}** (${r['full_name']}) — ${r['maintainer']}\n`;
          answer += `  - ${r['description']}\n`;
          answer += `  - Use case: ${r['use_case']}\n`;
          answer += `  - Blocks relation: ${r['blocks_relation']}\n`;
        });
        answer += `\n`;
      }
      if (result.type === 'benchmarks') {
        answer += `## Benchmarks & Metrics\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['name']}** (${r['metric']})\n`;
          answer += `  - LangGraph: ${r['langgraph_score']} | CrewAI: ${r['crewai_score']} | OpenAI: ${r['openai_score']} | Google: ${r['google_score']}\n`;
          answer += `  - ${r['notes']} (${r['year']})\n`;
        });
        answer += `\n`;
      }
      if (result.type === 'related') {
        answer += `## Related Topics\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['topic_name']}** (${r['relation_type']}): ${r['description']}\n`;
        });
        answer += `\n`;
      }
    }

    if (!answer) {
      answer = `## Blocks Streaming Expert Agent\n\nI am the Blocks Streaming Expert. I have built-in CSV knowledge covering:\n\n` +
        `- **5 streaming methods**: Request streaming, Pipe streaming, Bidirectional pipe, Event streaming, Byte streaming\n` +
        `- **6 configuration options**: format, bundleSizeBytes, maxLatencyMs, direction, declaredStream, subscribeGraceMs\n` +
        `- **10 code patterns**: TypeScript and Python examples for handlers, callers, agent cards, error handling\n` +
        `- **10 agent frameworks**: LangGraph, CrewAI, OpenAI Agents SDK, Google ADK, Microsoft Agent Framework, Pydantic AI, LlamaIndex, Mastra, Agno, DSPy\n` +
        `- **5 protocols**: MCP, A2A, ScaleMCP, AgentMaster, OpenTelemetry\n` +
        `- **10 benchmarks**: Princeton HAL GAIA, SWE-bench, token efficiency, latency, cost metrics, market forecasts\n` +
        `- **25 cached FAQ entries**: Common questions with instant answers\n` +
        `- **10 related topics**: CrewAI, LangChain, LlamaIndex, MCP Server, A2A communication\n\n` +
        `Please ask about: streaming setup | pipe vs request | agent card configuration | SDK installation | error handling | frameworks | protocols | benchmarks | pricing`;
    }

    return answer.trim();
  }
}

// ======== MODULE-LEVEL SINGLETON ========
const kb = new StreamingKnowledgeBase();

// ======== HANDLER ========
export default async function handler(
  task: StartTaskMessage,
  ctx?: TaskContext,
): Promise<HandlerResult> {
  const input = task.requestParts?.[0];
  const query = (input as Record<string, unknown>)?.text as string ?? '';

  ctx?.reportStatus('Blocks Streaming Expert: Analyzing query...');

  // 1. CHECK CACHE FIRST
  const cached = kb.cache.match(query);
  if (cached) {
    ctx?.reportStatus('Blocks Streaming Expert: Cache hit — returning instantly');
    const stats = kb.cache.getStats();
    return {
      artifacts: [{
        data: `${cached.answer}\n\n---\n*Source: ${cached.source} | Cache confidence: ${(cached.confidence * 100).toFixed(1)}% | Cache hit rate: ${stats.hitRate}*`,
        mimeType: 'text/markdown',
      }],
    };
  }

  // 2. SEARCH BUILT-IN KNOWLEDGE BASE
  ctx?.reportStatus('Blocks Streaming Expert: Searching built-in knowledge base...');
  const searchResults = kb.search(query);

  if (searchResults.length > 0 && searchResults[0].relevance > 0) {
    const answer = kb.generateAnswer(query, searchResults);
    const stats = kb.cache.getStats();
    return {
      artifacts: [{
        data: `${answer}\n\n---\n*Answered from built-in CSV knowledge base | Cache entries: ${stats.entries} | Patterns: ${stats.patterns} | This query was cache-missed but answered from data*`,
        mimeType: 'text/markdown',
      }],
    };
  }

  // 3. FALLBACK: General overview
  ctx?.reportStatus('Blocks Streaming Expert: Returning general overview...');
  const generalAnswer = kb.generateAnswer(query, []);

  return {
    artifacts: [{ data: generalAnswer, mimeType: 'text/markdown' }],
  };
}
