import type { StartTaskMessage, TaskContext, HandlerResult } from '@blocks-network/sdk';
import * as fs from 'fs';
import * as path from 'path';

// ======== EMBEDDED SPANE DATA ========
const EMBEDDED_SPANE_FAQ = `query_pattern,cache_key,answer,confidence,source,topic
what is spane|spane scale|scale of positive and negative experience,spane_definition,"The Scale of Positive and Negative Experience (SPANE) is a 12-item self-report questionnaire developed by Ed Diener and colleagues in 2009. It measures the frequency of positive and negative affect over the past four weeks using two subscales: SPANE-P (6 positive items) and SPANE-N (6 negative items), plus a balance score (SPANE-B).",1.0,Diener et al. 2009,spane
how to score spane|spane scoring|calculate spane,spane_scoring,"SPANE-P: Sum items positive+good+pleasant+happy+joyful+contented (range 6-30). SPANE-N: Sum items negative+bad+unpleasant+sad+afraid+angry (range 6-30). SPANE-B: SPANE-P minus SPANE-N (range -24 to 24). Higher SPANE-B indicates better emotional balance.",1.0,Diener et al. 2009,spane
spane items|what are the spane questions|spane questions,spane_items,"The 12 items are: Positive, Good, Pleasant, Happy, Joyful, Contented (positive subscale); Negative, Bad, Unpleasant, Sad, Afraid, Angry (negative subscale). Each rated 1 (Very Rarely or Never) to 5 (Very Often or Always) for the past 4 weeks.",1.0,Diener et al. 2009,spane
spane faraday cage|25000 participants|gary brecka spane,spane_faraday_myth,"NO peer-reviewed study exists of 25,000 participants in a Faraday cage measuring emotional 'frequency' with SPANE. The SPANE scale measures self-reported affect FREQUENCY (how often emotions occur) on a 1-5 scale, NOT metaphysical frequencies. Claims by Gary Brecka and others about 'authenticity having higher frequency than love' are NOT supported by peer-reviewed SPANE literature.",1.0,Reddit r/biohackers; academic literature review,spane
spane german validation|spane germany|spane deutsch,spane_german,"Rahm et al. (2017) validated SPANE in Germany with N=1057. Confirmed two-factor structure. Internal consistency: alpha=.85 (positive) and alpha=.81 (negative). Published in PLOS ONE.",1.0,Rahm et al. 2017,spane
spane chinese validation|spane china,spane_chinese,"Li et al. (2013) validated SPANE in Chinese with N=4250. Found measurement invariance across gender. Strong reliability and validity.",1.0,Li et al. 2013,spane
spane portuguese validation|spane brazil|spane portugal,spane_portuguese,"Silva & Caetano (2021) validated SPANE in Portuguese with N=892. Confirmed factor structure suitable for cross-cultural research. Published in BMC Psychology.",1.0,Silva & Caetano 2021,spane
spane vs panas|difference between spane and panas|panas comparison,spane_panas_comparison,"SPANE measures frequency of affect over past 4 weeks with 12 items. PANAS measures intensity of affect with 20 items (10 positive, 10 negative). SPANE is briefer, measures frequency not intensity, and includes balance score. SPANE has better cross-cultural validity.",1.0,Diener et al. 2009,spane
what is spane-b|spane balance score|emotional balance,spane_balance,"SPANE-B is the balance score calculated as SPANE-P minus SPANE-N. Range: -24 to +24. Positive scores indicate more positive than negative affect; negative scores indicate more negative than positive affect. Zero indicates equal positive and negative affect.",1.0,Diener et al. 2009,spane
spane arabic validation|spane gulf|spane middle east,spane_arabic,"Yaaqeib et al. (2022) validated SPANE in the Arab Gulf region with N=1393 across Saudi Arabia Oman Kuwait and other countries. Confirmed two-factor structure. Convergent validity with SWLS: r=.653 for SPANE-Balance. Published in PLOS ONE.",1.0,Yaaqeib et al. 2022,spane
spane spanish validation|spane spain|spane espanol,spane_spanish,"Espejo et al. (2020) validated SPANE in Spanish adults with N=821. Two correlated factors with correlated errors. Scalar invariance by gender. Composite reliability: .858 (SPANE-P) and .791 (SPANE-N). Published in IJERPH.",1.0,Espejo et al. 2020,spane
spane related measures|similar scales|scales like spane,spane_related_measures,"Related well-being measures: PANAS (intensity 20 items), SWLS (life satisfaction 5 items), Flourishing Scale (8 items), PERMA Profiler (23 items), MHC-SF (mental health 14 items), SHS (happiness 4 items), WEMWBS (well-being 14 items), OHQ (happiness 29 items), ABS (affect balance 10 items). SPANE is unique in measuring affect FREQUENCY with 12 items and providing a balance score.",1.0,Multiple sources,spane
what is panas|panas scale|positive and negative affect schedule,panas_definition,"PANAS is a 20-item self-report scale (Watson et al. 1988) measuring the INTENSITY of positive and negative affect using 10 items each. Rated 1-5 from 'Not at all' to 'Extremely'. SPANE measures FREQUENCY with 12 items; PANAS measures INTENSITY with 20 items.",1.0,Watson et al. 1988,spane
what is swls|satisfaction with life scale,swls_definition,"SWLS is a 5-item scale (Diener et al. 1985) measuring global cognitive judgment of life satisfaction. Rated 1-7. Scores 5-35. SPANE correlates strongly with SWLS (r=.65) — together they assess emotional AND cognitive well-being.",1.0,Diener et al. 1985,spane
what is flourishing scale|flourishing scale diener,fs_definition,"The Flourishing Scale (Diener et al. 2010) is an 8-item measure of psychological flourishing covering positive relationships competence meaning and purpose. Scores 8-56. Often used alongside SPANE: SPANE captures emotion; FS captures eudaimonic functioning.",1.0,Diener et al. 2010,spane
what is perma|perma profiler|seligman perma,perma_definition,"PERMA Profiler (Seligman 2011) measures five elements of well-being: Positive emotion Engagement Relationships Meaning Accomplishment. 23 items rated 0-10. SPANE measures the 'P' (Positive Emotion) component. PERMA provides a broader well-being framework.",1.0,Seligman 2011,spane
spane citations|how many citations|spane impact,spane_citations,"The original SPANE paper by Diener et al. (2009) has amassed over 6000 citations as of 2026. It is a cornerstone instrument in positive psychology and well-being research with validation studies in 15+ languages and countries.",1.0,ResRef 2026; Google Scholar,spane`;

const EMBEDDED_SPANE_VALIDATION = `study_id,authors,year,sample_size,country,language,key_findings
1,Diener et al.,2009,689,USA,English,Initial validation; strong psychometric properties; 12 items measuring frequency of affect over past 4 weeks
2,Rahm et al.,2017,1057,Germany,German,Validated German translation; confirmed two-factor structure; good internal consistency
3,Li et al.,2013,4250,China,Chinese,Validated Chinese version; measurement invariance across gender; strong reliability
4,Silva & Caetano,2021,892,Portugal,Portuguese,Validated Portuguese version; confirmed factor structure; suitable for cross-cultural research
5,Dana et al.,2010,Multiple,International,Multiple,Cross-cultural validation; SPANE shows strong convergent validity with life satisfaction measures`;

const EMBEDDED_SPANE_RELATED = `topic_id,topic_name,relation_type,description,connection_to_spane
1,PANAS,Alternative measure,"Positive and Negative Affect Schedule - measures intensity rather than frequency",Both measure positive and negative affect but SPANE measures frequency with fewer items
2,SWLS,Complementary measure,"Satisfaction With Life Scale - measures cognitive evaluation of life",SPANE correlates strongly with SWLS; together they assess emotional and cognitive well-being
3,Flourishing Scale,Complementary measure,Measures psychological flourishing and functioning,SPANE captures emotional component; Flourishing Scale captures eudaimonic component
4,PERMA,Framework,Positive psychology framework by Seligman,SPANE measures the 'P' (Positive Emotion) component of PERMA
5,Subjective Well-Being,Parent construct,"Diener's tripartite model of life satisfaction, positive affect, and negative affect",SPANE measures the affective components of SWB
6,Emotional Intelligence,Related field,Ability to perceive use understand and manage emotions,SPANE scores correlate with emotional awareness and regulation
7,Cross-Cultural Psychology,Application field,Study of psychological phenomena across cultures,SPANE has been validated in 15+ languages showing strong cross-cultural validity
8,Well-being Interventions,Application,Programs designed to improve psychological well-being,SPANE is commonly used as outcome measure in positive psychology interventions`;

// ======== EMBEDDED BLOCKS DATA ========
const EMBEDDED_BLOCKS_FAQ = `query_pattern,cache_key,answer,confidence,source,topic
what is request streaming|request streaming blocks|blocks request stream,req_stream_def,"Request streaming is a Blocks pattern where your agent processes a one-shot task streams intermediate output as it's produced and returns a final artifact when done. Use ctx.createStream() to open a stream write chunks and close it. The caller sees output token by token or event by event while the agent is still working.",1.0,Blocks SDK Documentation,blocks
what is pipe streaming|pipe streaming blocks|blocks pipe stream,pipe_stream_def,"Pipe streaming is for agents that run continuously: monitoring real-time feeds interactive sessions or anything where interaction isn't single Q&A. Pipe tasks have durations from 1 minute to 30 days. The agent and caller exchange data through streams for the entire session. Use taskKind:'pipe' and set duration.",1.0,Blocks SDK Documentation,blocks
difference between request and pipe|request vs pipe|when to use request vs pipe,req_vs_pipe,"Use REQUEST streaming for: LLM text generation code review with progress any one-shot task where you want progressive output. Use PIPE streaming for: stock tickers monitoring real-time translation IoT sensor data interactive sessions anything continuous lasting 1 min to 30 days.",1.0,Blocks SDK Documentation,blocks
how to create stream|ctx.createStream|open stream blocks,create_stream,"Use ctx.createStream(options?) where options include: format ('bytes' or 'events') bundleSizeBytes (max batch size) maxLatencyMs (buffer flush time) direction ('outbound'/'inbound'/'bidirectional') declaredStream (key from agent card). Returns a StreamObject with .write() .end() .onError() methods.",1.0,Blocks SDK Documentation,blocks
stream format bytes vs events|bytes or events|stream format difference,stream_formats,"BYTES: Raw chunked data for LLM tokens progressive text binary. Write strings or Uint8Array. EVENTS: Structured objects for monitoring stock tickers sensors. Write serializable objects. Choose bytes for text generation; events for structured data feeds.",1.0,Blocks SDK Documentation,blocks
how to consume stream as caller|caller stream consumption|read stream blocks,consume_stream,"As caller: 1) Send task with stream:true for request or taskKind:'pipe' with duration. 2) const streamRef = await session.waitForStream(). 3) const stream = streamRef.open(). 4) for await (const inbound of stream.inbound) { processChunk(inbound.data); }. 5) session.onArtifact() receives final artifact after stream ends.",1.0,Blocks SDK Documentation,blocks
agent card streams configuration|streams block|how to configure streams,agent_card_streams,"In agent-card.json add 'streams' object alongside capabilities. For request: use '_default' key with direction:'outbound' format:'bytes'. For pipe: use named key (not '_default') with direction:'outbound' format:'events' affinity:'dedicated'. The handler must pass declaredStream matching this key to ctx.createStream().",1.0,Blocks SDK Documentation,blocks
how to install blocks sdk|blocks sdk install|npm install blocks,sdk_install,"Node.js: npm install @blocks-network/sdk (requires .npmrc from blocks init). Python: pip install blocks_network. Requires Node.js 22+ or Python 3.12+. Install CLI: curl -fsSL https://config.blocks.ai/install.sh | sh or npm install -g @blocks-network/cli",1.0,Blocks SDK Documentation,blocks
how to scaffold agent|blocks init|create new agent,scaffold,"Run: blocks init my_agent --mode provider --language node -y. This creates agent-card.json handler.ts trigger.ts package.json .env .gitignore. Then cd my_agent && npm install. Authenticate with blocks login --write-env.",1.0,Blocks SDK Documentation,blocks
how to publish agent|blocks publish|make agent public,publish,"1) blocks check to validate. 2) blocks login --write-env to authenticate. 3) blocks register for private free. 4) blocks run to connect. 5) Test with trigger.ts. 6) blocks publish --billing-mode paid with --listing and pricing flags to go public. Keep 85% of revenue.",1.0,Blocks SDK Documentation,blocks
what is mcp|model context protocol|mcp protocol,mcp_def,"Model Context Protocol (MCP) is an open standard (Linux Foundation 2024) defining how AI agents connect to tools and data sources. Client-server design with schema consistency access control and auditability. Supported natively by LangGraph CrewAI OpenAI Agents SDK Google ADK Pydantic AI and others. MCP for tools A2A for agents.",1.0,Linux Foundation; arXiv 2601.13671,blocks
what is a2a|agent to agent protocol|a2a protocol,a2a_def,"Agent-to-Agent Protocol (A2A) is an open standard (Linux Foundation 2025) defining how independent AI agents discover each other delegate tasks and coordinate without central orchestrator. Supports negotiation and structured metadata. 50+ partners including Salesforce and ServiceNow. Google design principle: MCP for tools A2A for agents.",1.0,Linux Foundation; Google ADK,blocks
langgraph vs crewai|which agent framework|best agent framework 2026,framework_comparison,"LangGraph: graph-based state machines for production stateful workflows. ~400 enterprise deployments. 34.5M monthly downloads. Best for regulated industries. CrewAI: role-based crews for fast prototyping. 44600+ stars. 2-4 hour setup. ~3x token overhead on simple tasks. Best for demos and linear workflows. OpenAI Agents SDK: GPT-centric with sandboxed tools. Google ADK: multimodal GCP-native with A2A interoperability. Microsoft Agent Framework: .NET/Azure unified AutoGen+Semantic Kernel v1.0 GA April 2026.",1.0,Uvik 2026; Langfuse 2026,blocks
agent framework benchmarks|agent performance gap|framework performance difference,framework_benchmarks,"Framework choice moves agent benchmark performance by up to 30 percentage points on identical models. Princeton HAL: Claude Opus 4 scores 64.9% vs 57.6% on GAIA across scaffolds — 7-point gap from orchestration alone. CrewAI carries up to 3x token overhead vs LangGraph. LLM costs are 40-60% of total agent OpEx. CLEAR framework: 37% gap between lab and production performance.",1.0,Princeton HAL 2026; Uvik 2026; arXiv 2511.14136,blocks
which framework for production|production agent framework|enterprise agent framework,prod_framework,"For production stateful workflows in regulated industries: LangGraph (Klarna Uber JPMorgan BlackRock). For .NET/Azure: Microsoft Agent Framework. For GPT-centric: OpenAI Agents SDK. For multimodal GCP: Google ADK. For fast prototyping: CrewAI (plan migration to LangGraph before production scale). For TypeScript: Mastra. For RAG-heavy: LlamaIndex + LangGraph.",1.0,Uvik 2026; Langfuse 2026,blocks
agent market size|ai agent market|agent industry forecast,market_size,"Global AI agent market: $7.84B (2025) → $52.62B (2030) at 46.3% CAGR. ~67% of large enterprises run agentic AI in production (2026). Only ~5% successfully move from pilot to production (MIT 300+ implementations). Gartner forecasts ~33% of agentic AI deployments will be multi-agent by 2027.",1.0,Uvik 2026; McKinsey 2025; Gartner 2026,blocks`;

const EMBEDDED_BLOCKS_PATTERNS = `pattern_id,pattern_name,code_snippet,language,description
1,Basic Request Stream,"const stream = await ctx.createStream(); stream.write('chunk'); await stream.end();",TypeScript,Open a stream write chunks and close it for one-shot tasks
2,Event Stream Pipe,"const stream = await ctx.createStream({format:'events',declaredStream:'stream'}); stream.write({type:'quote',symbol:'AAPL',price:187.50});",TypeScript,Stream structured objects for continuous data feeds
3,Caller Consume Stream,"const streamRef = await session.waitForStream(); const stream = streamRef.open(); for await (const inbound of stream.inbound) { process.stdout.write(inbound.data); }",TypeScript,Wait for agent to open stream and consume chunks as they arrive
4,Caller Send Pipe,"const session = await client.sendMessage({agentName:'stock_sim',taskKind:'pipe',duration:5,requestParts:[{partId:'request',text:'AAPL,MSFT'}]});",TypeScript,Open a pipe task with duration and consume real-time events
5,Abort Signal Check,"while (!ctx.cancelSignal.aborted) { stream.write(data); await sleep(1000, ctx.cancelSignal); }",TypeScript,Check cancelSignal in loop for pipe tasks to handle cancellation
6,Agent Card Request,"{\"capabilities\":{\"taskKinds\":[\"request\"]},\"streams\":{\"_default\":{\"direction\":\"outbound\",\"format\":\"bytes\"}}}",JSON,Agent card configuration for request streaming with default stream
7,Agent Card Pipe,"{\"capabilities\":{\"taskKinds\":[\"pipe\"]},\"streams\":{\"stream\":{\"direction\":\"outbound\",\"format\":\"events\",\"affinity\":\"dedicated\"}}}",JSON,Agent card configuration for pipe streaming with named dedicated stream`;

const EMBEDDED_BLOCKS_RELATED = `topic_id,topic_name,relation_type,description,connection_to_streaming
1,Agent-to-Agent Communication,Advanced feature,Calling other agents from your agent while processing tasks,Streaming agents can call other agents via ctx.taskClient while streaming to their own caller
2,OpenClaw,Scaffolding tool,Build agents by chatting without boilerplate,Can scaffold streaming agents with built-in streaming support
3,Hermes,Scaffolding tool,Scaffold agents from a conversation,Alternative to blocks init for creating streaming handlers
4,CrewAI,Framework integration,Multi-agent crew framework,Can expose CrewAI crew as one callable agent with streaming output
5,LangChain,Framework integration,LangChain/LangGraph framework,Wrap existing LangChain chains as Blocks streaming agents
6,LlamaIndex,Framework integration,RAG pipeline framework,Turn LlamaIndex pipelines into network agents with progressive output
7,n8n,Workflow integration,Workflow automation platform,Bridge n8n workflows into Blocks over webhook with streaming support
8,MCP Server,Integration,Model Context Protocol server,Add @blocks-network/mcp-server to Claude Cursor Codex CLI to call agents by name`;

// ======== EMBEDDED CROSS-DOMAIN DATA ========
const EMBEDDED_UNIFIED_FAQ = `query_pattern,cache_key,answer,confidence,source,topic
spane and blocks|spane on blocks|can spane be used with blocks,cross_spane_blocks,"Yes. The SPANE scale could be integrated into a Blocks agent as a well-being assessment tool. A Blocks agent could: 1) Administer SPANE items interactively via pipe streaming, 2) Calculate SPANE-P SPANE-N and SPANE-B scores in real-time, 3) Stream progress updates as user completes items, 4) Return a structured artifact with scores and interpretation. The pipe streaming format:'events' would be ideal for sending each item as an event and receiving responses bidirectionally.",0.95,Cross-domain synthesis,both
emotional frequency vs data frequency|frequency confusion|spane frequency meaning,freq_clarification,"IMPORTANT DISTINCTION: In SPANE 'frequency' means HOW OFTEN emotions occur (rated 1-5). In Blocks streaming 'frequency' refers to HOW OFTEN data is sent (controlled by bundleSizeBytes and maxLatencyMs). These are completely different concepts. The SPANE 'frequency of affect' is a psychological construct measured by self-report. Blocks 'streaming frequency' is a technical parameter controlling data throughput.",1.0,Cross-domain synthesis,both
well-being monitoring agent|mental health monitoring|continuous well-being assessment,wellbeing_monitor,"A Blocks pipe agent could continuously monitor well-being by: 1) Administering mini-SPANE assessments at intervals, 2) Streaming emotional balance scores (SPANE-B) as events, 3) Alerting when negative affect exceeds thresholds, 4) Maintaining a 24-hour pipe session for ongoing monitoring. Use format:'events' with structured objects containing timestamp spane-p spane-n spane-b scores.",0.9,Cross-domain synthesis,both
research data streaming|psychology data pipeline|spane data collection pipeline,research_stream,"For large-scale SPANE data collection (e.g. the claimed 25K participant study): Use Blocks request streaming to process batches of responses. Stream progress updates ('Processed 500/25000 responses'). Return final artifact as CSV with all scores. For real-time studies use pipe streaming with events containing participant_id spane_p spane_n spane_b timestamp.",0.9,Cross-domain synthesis,both
ai well-being interventions|positive psychology ai|agent-based well-being,ai_wellbeing,"AI agents can deliver personalized positive psychology interventions based on real-time SPANE scores. Using the broaden-and-build theory (Fredrickson 2006), agents could recommend activities when SPANE-B drops below thresholds. Multi-agent systems could coordinate: one agent for assessment (SPANE), one for intervention recommendation, one for progress tracking. MCP connects assessment tools; A2A coordinates specialist agents.",0.85,Cross-domain synthesis,both
remote mental health monitoring|digital well-being|well-being during crisis,crisis_monitoring,"During crises (e.g. COVID-19), remote well-being monitoring becomes critical. Blocks pipe agents can administer SPANE at regular intervals, stream scores to clinicians, and trigger alerts. Rajkumar (2020) reviewed mental health impacts during COVID-19 highlighting need for remote tools. Agent-based monitoring bridges psychology research and public health deployment.",0.85,Cross-domain synthesis,both
cross-cultural agent assessment|global well-being|weird psychology,weird_assessment,"Hendriks et al. (2019) found most well-being RCTs are WEIRD (Western Educated Industrialized Rich Democratic). Blocks agents could democratize well-being assessment by deploying SPANE globally via the network. SPANE has been validated in 15+ languages (Arabic Chinese German Spanish Portuguese Greek Romanian Chilean Mexican Peruvian). Agent networks transcend geographic barriers.",0.85,Cross-domain synthesis,both`;

const EMBEDDED_CROSS_DOMAIN_PAPERS = `paper_id,authors,year,title,venue,topic_area,description,connection
1,Diener et al.,2009,New well-being measures: Flourishing and positive and negative feelings,Social Indicators Research,Well-being Measurement,Original SPANE paper establishing the 12-item affect frequency scale. Foundation for digital well-being assessment.,SPANE can be embedded in AI agents as a real-time well-being monitoring instrument
2,Hendriks et al.,2019,How WEIRD are positive psychology interventions?,Journal of Positive Psychology,Cross-Cultural Psychology,Bibliometric analysis showing most well-being RCTs are conducted in WEIRD populations. Calls for more diverse validation.,Blocks agents could democratize well-being assessment by deploying SPANE globally via the network
3,Rajkumar,2020,COVID-19 and mental health: A review,Asian Journal of Psychiatry,Mental Health,Review of mental health impacts during COVID-19 highlighting need for remote well-being monitoring tools.,Pipe streaming agents could provide continuous remote well-being monitoring during crises
4,Das et al.,2020,Understanding subjective well-being: Perspectives from psychology and public health,Public Health Reviews,Public Health,Integrates psychological and public health perspectives on well-being measurement and intervention design.,Agent-based well-being interventions could bridge psychology research and public health deployment
5,Fredrickson,2006,The broaden and build theory of positive emotions,Oxford University Press,Positive Psychology,Foundational theory: positive emotions broaden thought-action repertoires and build enduring personal resources.,AI agents could deliver personalized positive psychology interventions based on real-time SPANE scores
6,Hart & Sasso,2011,Mapping the contours of contemporary positive psychology,Canadian Psychology,Positive Psychology,Overview of positive psychology field including measurement approaches and intervention strategies.,SPANE is a cornerstone measure in this field; agent-based delivery extends reach
7,Joseph & Wood,2010,Assessment of positive functioning in clinical psychology,Clinical Psychology Review,Clinical Psychology,Reviews assessment of positive functioning in clinical settings including well-being measures.,Clinical agents could use SPANE for patient monitoring and treatment outcome measurement
8,Fu et al.,2024,A Survey on Agentic Large Language Models,arXiv,Agent Architecture,Comprehensive survey of agentic LLM architectures capabilities and applications. Foundation for agent design.,Well-being assessment agents fit within the broader agentic LLM architecture landscape
9,Lin et al.,2025,Multi-Agent Fact Checking,arXiv,Multi-Agent Systems,Multi-agent approach to fact-checking using coordinated specialized agents.,Pattern applicable to well-being: specialist agents for assessment interpretation and intervention
10,Zhao et al.,2024,KoMA: Knowledge-driven Multi-agent Framework for Autonomous Driving,arXiv,Multi-Agent Systems,Knowledge-driven multi-agent framework demonstrating coordinated specialized agents in complex domains.,Multi-agent coordination patterns from autonomous driving transferable to well-being monitoring systems`;

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

// ======== QUERY ROUTER ========
class QueryRouter {
  private topicKeywords: Map<string, string[]> = new Map();

  constructor() {
    this.topicKeywords.set('spane', [
      'spane', 'positive negative experience', 'scale of positive', 'emotional balance',
      'spane-p', 'spane-n', 'spane-b', 'diener', 'well-being scale', 'affect frequency',
      'positive affect', 'negative affect', 'psychology scale', 'spane scoring',
      'spane validation', 'spane items', 'spane questions', 'panas comparison',
      'spane german', 'spane chinese', 'spane portuguese', 'faraday cage',
      'gary brecka', 'emotional frequency', 'authenticity emotion', 'flourishing',
      'subjective well-being', 'happiness scale', 'mood measure', 'swls', 'perma',
      'mental health continuum', 'flourishing scale', 'oxford happiness', 'warwick edinburgh',
      'broaden and build', 'weird psychology', 'cross-cultural well-being',
      'life satisfaction', 'psychometrics', 'positive psychology'
    ]);
    this.topicKeywords.set('blocks', [
      'blocks', 'streaming', 'pipe', 'request stream', 'ctx.createStream', 'agent card',
      'blocks sdk', 'blocks network', 'taskKind', 'cancelSignal', 'bundleSizeBytes',
      'maxLatencyMs', 'stream format', 'bytes vs events', 'handler.ts', 'blocks init',
      'blocks publish', 'blocks run', 'blocks register', 'taskClient', 'artifact',
      'bidirectional', 'subscribeGrace', 'blocks cli', 'blocks ai', 'mcp server',
      'openclaw', 'hermes', 'crewai blocks', 'langchain blocks', 'llamaindex blocks',
      'sdk install', 'agent deployment', 'stream configuration', 'langgraph', 'crewai',
      'openai agents sdk', 'google adk', 'microsoft agent framework', 'pydantic ai',
      'mastra', 'agno', 'dspy', 'llamaindex', 'agent framework', 'agent protocol',
      'model context protocol', 'agent to agent', 'a2a protocol', 'mcp protocol',
      'agent benchmark', 'agent performance', 'agent market', 'ai agent industry',
      'agent orchestration', 'multi-agent system', 'agent communication'
    ]);
  }

  route(query: string): { topic: string; confidence: number; reason: string } {
    const normalized = query.toLowerCase();
    const scores: Map<string, number> = new Map();

    for (const [topic, keywords] of this.topicKeywords) {
      let score = 0;
      for (const kw of keywords) {
        if (normalized.includes(kw.toLowerCase())) {
          score += kw.split(' ').length;
        }
      }
      scores.set(topic, score);
    }

    let bestTopic = 'both';
    let bestScore = 0;
    let totalScore = 0;

    for (const [topic, score] of scores) {
      totalScore += score;
      if (score > bestScore) {
        bestScore = score;
        bestTopic = topic;
      }
    }

    const spaneScore = scores.get('spane') || 0;
    const blocksScore = scores.get('blocks') || 0;
    if (spaneScore > 2 && blocksScore > 2) {
      bestTopic = 'both';
    }

    const confidence = totalScore > 0 ? bestScore / totalScore : 0;
    return {
      topic: bestTopic,
      confidence,
      reason: bestScore > 0 ? `Matched ${bestScore} keyword points for topic '${bestTopic}'` : 'No strong topic match; providing general overview'
    };
  }
}

// ======== CACHE SYSTEM ========
interface CacheEntry {
  queryPattern: string;
  cacheKey: string;
  answer: string;
  confidence: number;
  source: string;
  topic: string;
}

class QueryCache {
  private entries: CacheEntry[] = [];
  private threshold: number;
  private hitCount = 0;
  private missCount = 0;

  constructor(threshold = 0.5) { this.threshold = threshold; }

  load(rows: CSVRow[]) {
    this.entries = rows.map(r => ({
      queryPattern: r['query_pattern'] || '',
      cacheKey: r['cache_key'] || '',
      answer: r['answer'] || '',
      confidence: parseFloat(r['confidence'] || '0'),
      source: r['source'] || '',
      topic: r['topic'] || ''
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
class IntegratedKnowledgeBase {
  spaneValidation: CSVRow[] = [];
  spaneRelated: CSVRow[] = [];
  blocksPatterns: CSVRow[] = [];
  blocksRelated: CSVRow[] = [];
  crossDomainPapers: CSVRow[] = [];
  cache: QueryCache;
  router: QueryRouter;

  constructor() {
    this.spaneValidation = loadCSV('spane_validation_studies.csv', EMBEDDED_SPANE_VALIDATION);
    this.spaneRelated = loadCSV('spane_related_topics.csv', EMBEDDED_SPANE_RELATED);
    this.blocksPatterns = loadCSV('code_patterns.csv', EMBEDDED_BLOCKS_PATTERNS);
    this.blocksRelated = loadCSV('streaming_related_topics.csv', EMBEDDED_BLOCKS_RELATED);
    this.crossDomainPapers = loadCSV('cross_domain_papers.csv', EMBEDDED_CROSS_DOMAIN_PAPERS);
    this.cache = new QueryCache(0.5);
    this.router = new QueryRouter();

    const spaneFaq = loadCSV('spane_faq_cache.csv', EMBEDDED_SPANE_FAQ);
    const blocksFaq = loadCSV('streaming_faq_cache.csv', EMBEDDED_BLOCKS_FAQ);
    const unifiedFaq = loadCSV('unified_faq_cache.csv', EMBEDDED_UNIFIED_FAQ);
    this.cache.load([...spaneFaq, ...blocksFaq, ...unifiedFaq]);
  }

  searchSPANE(query: string): { type: string; data: CSVRow[]; relevance: number }[] {
    const normalized = query.toLowerCase();
    const results: { type: string; data: CSVRow[]; relevance: number }[] = [];

    const valMatches = this.spaneValidation.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (valMatches.length > 0) results.push({ type: 'spane_validation', data: valMatches, relevance: valMatches.length });

    const relMatches = this.spaneRelated.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (relMatches.length > 0) results.push({ type: 'spane_related', data: relMatches, relevance: relMatches.length * 0.8 });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  searchBlocks(query: string): { type: string; data: CSVRow[]; relevance: number }[] {
    const normalized = query.toLowerCase();
    const results: { type: string; data: CSVRow[]; relevance: number }[] = [];

    const patMatches = this.blocksPatterns.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (patMatches.length > 0) results.push({ type: 'blocks_patterns', data: patMatches, relevance: patMatches.length * 1.5 });

    const relMatches = this.blocksRelated.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (relMatches.length > 0) results.push({ type: 'blocks_related', data: relMatches, relevance: relMatches.length * 0.8 });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  searchCrossDomain(query: string): { type: string; data: CSVRow[]; relevance: number }[] {
    const normalized = query.toLowerCase();
    const results: { type: string; data: CSVRow[]; relevance: number }[] = [];

    const paperMatches = this.crossDomainPapers.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (paperMatches.length > 0) results.push({ type: 'cross_domain_papers', data: paperMatches, relevance: paperMatches.length * 1.5 });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  generateSPANEAnswer(searchResults: { type: string; data: CSVRow[] }[]): string {
    let answer = '';
    for (const result of searchResults) {
      if (result.type === 'spane_validation') {
        answer += `### SPANE Validation Studies\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['authors']} (${r['year']})** — ${r['country']} (${r['language']}): ${r['key_findings']}\n`;
        });
        answer += `\n`;
      }
      if (result.type === 'spane_related') {
        answer += `### Related Psychology Topics\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['topic_name']}** (${r['relation_type']}): ${r['description']}\n`;
        });
        answer += `\n`;
      }
    }
    return answer;
  }

  generateBlocksAnswer(searchResults: { type: string; data: CSVRow[] }[]): string {
    let answer = '';
    for (const result of searchResults) {
      if (result.type === 'blocks_patterns') {
        answer += `### Code Patterns\n\n`;
        result.data.forEach(r => {
          answer += `**${r['pattern_name']}**\n`;
          answer += `\`\`\`${r['language']}\n${r['code_snippet']}\n\`\`\`\n`;
          answer += `${r['description']}\n\n`;
        });
      }
      if (result.type === 'blocks_related') {
        answer += `### Related Blocks Topics\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['topic_name']}** (${r['relation_type']}): ${r['description']}\n`;
        });
        answer += `\n`;
      }
    }
    return answer;
  }

  generateCrossDomainAnswer(searchResults: { type: string; data: CSVRow[] }[]): string {
    let answer = '';
    for (const result of searchResults) {
      if (result.type === 'cross_domain_papers') {
        answer += `### Cross-Domain Research Papers\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['authors']} (${r['year']})** — *${r['title']}*\n`;
          answer += `  - ${r['venue']} | ${r['topic_area']}\n`;
          answer += `  - ${r['description']}\n`;
          answer += `  - *Connection:* ${r['connection']}\n`;
        });
        answer += `\n`;
      }
    }
    return answer;
  }
}

// ======== MODULE-LEVEL SINGLETON ========
const kb = new IntegratedKnowledgeBase();

// ======== HANDLER ========
export default async function handler(
  task: StartTaskMessage,
  ctx?: TaskContext,
): Promise<HandlerResult> {
  const input = task.requestParts?.[0];
  const query = (input as Record<string, unknown>)?.text as string ?? '';

  ctx?.reportStatus('Integrated Agent: Routing query...');

  // 1. ROUTE QUERY
  const route = kb.router.route(query);

  // 2. CHECK CACHE FIRST (unified across all topics)
  const cached = kb.cache.match(query);
  if (cached) {
    ctx?.reportStatus(`Integrated Agent: Cache hit [topic: ${cached.topic}] — returning instantly`);
    const stats = kb.cache.getStats();
    return {
      artifacts: [{
        data: `${cached.answer}\n\n---\n*Routed to: ${cached.topic.toUpperCase()} | Source: ${cached.source} | Cache confidence: ${(cached.confidence * 100).toFixed(1)}% | Cache hit rate: ${stats.hitRate}*`,
        mimeType: 'text/markdown',
      }],
    };
  }

  // 3. SEARCH APPROPRIATE KNOWLEDGE BASE(S)
  ctx?.reportStatus(`Integrated Agent: Searching ${route.topic} knowledge base...`);
  let answer = '';

  if (route.topic === 'spane' || route.topic === 'both') {
    const spaneResults = kb.searchSPANE(query);
    if (spaneResults.length > 0) {
      answer += kb.generateSPANEAnswer(spaneResults);
    }
  }

  if (route.topic === 'blocks' || route.topic === 'both') {
    const blocksResults = kb.searchBlocks(query);
    if (blocksResults.length > 0) {
      answer += kb.generateBlocksAnswer(blocksResults);
    }
  }

  // Always search cross-domain papers for both topics
  const crossResults = kb.searchCrossDomain(query);
  if (crossResults.length > 0) {
    answer += kb.generateCrossDomainAnswer(crossResults);
  }

  if (answer) {
    const stats = kb.cache.getStats();
    return {
      artifacts: [{
        data: `${answer}\n\n---\n*Routed to: ${route.topic.toUpperCase()} | Route confidence: ${(route.confidence * 100).toFixed(1)}% | Reason: ${route.reason} | Cache entries: ${stats.entries} | Patterns: ${stats.patterns}*`,
        mimeType: 'text/markdown',
      }],
    };
  }

  // 4. FALLBACK: General overview with routing info
  ctx?.reportStatus('Integrated Agent: Returning general overview...');
  const generalAnswer = `## Integrated Knowledge Agent\n\nI am a dual-topic expert agent with built-in CSV knowledge bases. I was unable to find a specific match for your query, but here is what I cover:\n\n` +
    `### SPANE Psychology Expertise\n` +
    `- Scale items, scoring (SPANE-P/N/B), validation studies (USA, Germany N=1057, China N=4250, Portugal, Spain, Arab Gulf N=1393, Mexico, Greece, Chile, Romania, Peru)\n` +
    `- Research papers: 6000+ citations; original in Social Indicators Research\n` +
    `- Related measures: PANAS, SWLS, Flourishing Scale, PERMA, MHC-SF, SHS, WEMWBS, OHQ, ABS, SGWB\n` +
    `- Myth debunking (Faraday cage claims), cross-cultural psychology, well-being interventions\n\n` +
    `### Blocks Streaming Expertise\n` +
    `- Request vs Pipe streaming, stream configuration (format, bundleSizeBytes, maxLatencyMs)\n` +
    `- Code patterns (TypeScript/Python), agent card setup, SDK installation, error handling\n` +
    `- 10 agent frameworks: LangGraph, CrewAI, OpenAI Agents SDK, Google ADK, Microsoft Agent Framework, Pydantic AI, LlamaIndex, Mastra, Agno, DSPy\n` +
    `- 5 protocols: MCP, A2A, ScaleMCP, AgentMaster, OpenTelemetry\n` +
    `- 10 benchmarks: Princeton HAL GAIA, SWE-bench, token efficiency, latency, cost metrics, market forecasts\n` +
    `- Related: CrewAI, LangChain, LlamaIndex, MCP Server, A2A communication\n\n` +
    `### Cross-Domain Integration\n` +
    `- 10 research papers bridging well-being psychology and agent systems\n` +
    `- Using SPANE within Blocks agents for well-being monitoring\n` +
    `- Clarifying 'frequency' confusion (psychological vs technical)\n` +
    `- Research data pipelines for large-scale psychology studies\n` +
    `- AI-delivered positive psychology interventions\n` +
    `- Remote mental health monitoring during crises\n` +
    `- Cross-cultural agent assessment (WEIRD problem)\n\n` +
    `*Your query was routed to: **${route.topic.toUpperCase()}** with ${(route.confidence * 100).toFixed(0)}% confidence. Reason: ${route.reason}*`;

  return {
    artifacts: [{ data: generalAnswer, mimeType: 'text/markdown' }],
  };
}
