import type { StartTaskMessage, TaskContext, HandlerResult } from '@blocks-network/sdk';
import * as fs from 'fs';
import * as path from 'path';

// ======== EMBEDDED CSV DATA (fallback if files missing) ========
const EMBEDDED_SPANE_ITEMS = `item_id,item_text,subscale,reverse_scored,description
positive,Positive,SPANE-P,No,Feeling positive in general
good,Good,SPANE-P,No,Feeling that things are good
pleasant,Pleasant,SPANE-P,No,Experiencing pleasant feelings
happy,Happy,SPANE-P,No,Feeling happy
joyful,Joyful,SPANE-P,No,Feeling joyful
contented,Contented,SPANE-P,No,Feeling satisfied and content
negative,Negative,SPANE-N,No,Feeling negative in general
bad,Bad,SPANE-N,No,Feeling that things are bad
unpleasant,Unpleasant,SPANE-N,No,Experiencing unpleasant feelings
sad,Sad,SPANE-N,No,Feeling sad
afraid,Afraid,SPANE-N,No,Feeling scared or afraid
angry,Angry,SPANE-N,No,Feeling angry`;

const EMBEDDED_SPANE_SCORING = `score_type,items,range,interpretation,formula
SPANE-P,"positive,good,pleasant,happy,joyful,contented",6-30,Higher scores indicate more frequent positive affect,Sum of 6 positive items (each 1-5)
SPANE-N,"negative,bad,unpleasant,sad,afraid,angry",6-30,Higher scores indicate more frequent negative affect,Sum of 6 negative items (each 1-5)
SPANE-B,SPANE-P minus SPANE-N,-24 to 24,Positive scores indicate positive emotional balance; negative scores indicate negative emotional balance,SPANE-P score minus SPANE-N score`;

const EMBEDDED_SPANE_VALIDATION = `study_id,authors,year,sample_size,country,language,key_findings
1,Diener et al.,2009,689,USA,English,Initial validation; strong psychometric properties; 12 items measuring frequency of affect over past 4 weeks
2,Rahm et al.,2017,1057,Germany,German,Validated German translation; confirmed two-factor structure; good internal consistency
3,Li et al.,2013,4250,China,Chinese,Validated Chinese version; measurement invariance across gender; strong reliability
4,Silva & Caetano,2021,892,Portugal,Portuguese,Validated Portuguese version; confirmed factor structure; suitable for cross-cultural research
5,Dana et al.,2010,Multiple,International,Multiple,Cross-cultural validation; SPANE shows strong convergent validity with life satisfaction measures`;

const EMBEDDED_SPANE_PAPERS = `paper_id,authors,year,title,journal,country,language,sample_size,key_findings,citations_approx
1,Diener et al.,2009,New measures of well-being: Flourishing and positive and negative feelings,Social Indicators Research,USA,English,689,Initial SPANE validation; 12-item scale measuring frequency of affect over past 4 weeks; strong psychometric properties,6000+
2,Rahm et al.,2017,Measuring the frequency of emotions—validation of SPANE in Germany,PLOS ONE,Germany,German,1057,Confirmed two-factor structure; internal consistency alpha=.85/.81; good convergent validity,200+
3,Li et al.,2013,SPANE: Psychometric Properties and Normative Data in a Large Chinese Sample,Journal of Personality Assessment,China,Chinese,4250,Measurement invariance across gender; strong reliability; normative data for large sample,400+
4,Silva & Caetano,2021,Validation of SPANE in Portuguese adults,BMC Psychology,Portugal,Portuguese,892,Confirmed factor structure; suitable for cross-cultural research; good internal consistency,150+
5,Espejo et al.,2020,Validation and Measurement Invariance of SPANE in a Spanish General Sample,Int J Environ Res Public Health,Spain,Spanish,821,Two correlated factors with correlated errors; scalar invariance by gender; composite reliability .858/.791,300+
6,Yaaqeib et al.,2022,Validation study of SPANE in the Arab Gulf region: A multicountry study,PLoS ONE,Arab Gulf,Arabic,1393,Confirmed two-factor structure; adequate psychometric properties; convergent validity with SWLS (r=.653),100+
7,Daniel-Gonzalez et al.,2020,Validation of Mexican Spanish SPANE in Medical and Psychology Students,Psychological Reports,Mexico,Spanish,312,Valid Mexican Spanish version; confirmed factor structure; suitable for Latin American research,80+
8,Kyriazos et al.,2018,3-Faced Construct Validation and Bifactor SWB Model Using SPANE Greek Version,Psychology,Greece,Greek,619,Bifactor subjective well-being model; Greek validation with strong psychometric properties,90+
9,Carmona-Halty & Villegas-Robertson,2018,SPANE: Adaptation and validation in Chilean school context,Interciencia,Chile,Spanish,450,School context validation; confirmed factor structure; good reliability in adolescent population,70+
10,Balgiu,2019,Validation of SPANE on a Romanian student sample,Revista de Psihologie,Romania,Romanian,380,Student sample validation; confirmed two-factor structure; adequate internal consistency,50+
11,Cassaretto-Bardales & Martinez-Uribe,2017,Validation of well-being flourishing and affectivity scales,Pensamiento Psicologico,Peru,Spanish,520,Latin American validation; confirmed psychometric properties; normative data,60+
12,Dana et al.,2010,Cross-cultural validation of SPANE,Multiple journals,International,Multiple,Multiple,Cross-cultural convergent validity with life satisfaction measures; strong cross-cultural applicability,500+`;

const EMBEDDED_SPANE_RELATED_MEASURES = `measure_id,measure_name,abbreviation,items,scoring_range,developer,year,description,relation_to_spane,when_to_use
1,Positive and Negative Affect Schedule,PANAS,20,10-50,Watson et al.,1988,Measures intensity of positive and negative affect using 10 items each. Higher arousal focus.,SPANE measures frequency (not intensity) with fewer items; both assess positive/negative affect. SPANE has better cross-cultural validity.,When you need to measure affect INTENSITY rather than frequency
2,Satisfaction With Life Scale,SWLS,5,5-35,Diener et al.,1985,Measures global cognitive judgment of life satisfaction. Single-factor scale.,SPANE correlates strongly with SWLS (r=.65); together they assess emotional AND cognitive well-being. SPANE measures affect; SWLS measures cognition.,When you need cognitive evaluation of life satisfaction
3,Flourishing Scale,FS,8,8-56,Diener et al.,2010,Measures psychological flourishing: positive relationships competence meaning purpose.,SPANE captures the emotional component; FS captures eudaimonic functioning. Often used together in well-being batteries.,When you need to assess psychological functioning beyond emotions
4,PERMA Profiler,PERMA,23,0-10,Seligman,2011,Measures five elements of well-being: Positive emotion Engagement Relationships Meaning Accomplishment.,SPANE measures the 'P' (Positive Emotion) component of PERMA. Can be used alongside PERMA for comprehensive assessment.,When you need a broad well-being framework
5,Mental Health Continuum-Short Form,MHC-SF,14,0-5,Keyes,2009,Measures emotional psychological and social well-being. Categorical diagnosis of flourishing languishing.,SPANE focuses on emotional well-being (affect frequency); MHC-SF covers all three domains of Keyes' model.,When you need comprehensive mental health assessment
6,Subjective Happiness Scale,SHS,4,1-7,Lyubomirsky & Lepper,1999,Measures global subjective happiness via self-report. Brief 4-item scale.,SPANE is more comprehensive (12 items vs 4) and separates positive/negative affect. SHS is a single global happiness score.,When you need a very brief global happiness measure
7,Oxford Happiness Questionnaire,OHQ,29,1-6,Hills & Argyle,2002,Measures personal happiness via cognitive and affective items. Longer instrument.,SPANE is briefer and focuses specifically on affect frequency. OHQ includes broader life evaluation items.,When you need a comprehensive happiness inventory
8,Warwick-Edinburgh Mental Well-being Scale,WEMWBS,14,14-70,Tennant et al.,2007,Measures mental well-being: positive affect relationships functioning.,SPANE is shorter (12 vs 14 items) and explicitly separates positive/negative affect. WEMWBS is a single well-being score.,When you need a validated population well-being measure
9,Scale of General Well-Being,SGWB,20,0-4,Gongora,2010,Measures general well-being across multiple dimensions in Spanish-speaking populations.,SPANE has been validated alongside SGWB in Latin American studies. SPANE is more focused on affect frequency.,When working with Spanish-speaking populations
10,Affect Balance Scale,ABS,10,0-3,Bradburn,1969,Classic measure of psychological well-being via positive/negative affect balance.,SPANE is the modern successor: more items better psychometrics broader emotion coverage validated across cultures.,When you need a modern replacement for Bradburn's classic scale`;

const EMBEDDED_SPANE_FAQ = `query_pattern,cache_key,answer,confidence,source
what is spane|spane scale|scale of positive and negative experience,spane_definition,"The Scale of Positive and Negative Experience (SPANE) is a 12-item self-report questionnaire developed by Ed Diener and colleagues in 2009. It measures the frequency of positive and negative affect over the past four weeks using two subscales: SPANE-P (6 positive items) and SPANE-N (6 negative items), plus a balance score (SPANE-B).",1.0,Diener et al. 2009
how to score spane|spane scoring|calculate spane,spane_scoring,"SPANE-P: Sum items positive+good+pleasant+happy+joyful+contented (range 6-30). SPANE-N: Sum items negative+bad+unpleasant+sad+afraid+angry (range 6-30). SPANE-B: SPANE-P minus SPANE-N (range -24 to 24). Higher SPANE-B indicates better emotional balance.",1.0,Diener et al. 2009
spane items|what are the spane questions|spane questions,spane_items,"The 12 items are: Positive, Good, Pleasant, Happy, Joyful, Contented (positive subscale); Negative, Bad, Unpleasant, Sad, Afraid, Angry (negative subscale). Each rated 1 (Very Rarely or Never) to 5 (Very Often or Always) for the past 4 weeks.",1.0,Diener et al. 2009
spane reliability|spane validity|psychometric properties,spane_psychometrics,"SPANE shows strong psychometric properties: internal consistency alpha=.85-.90 for SPANE-P and alpha=.81-.85 for SPANE-N. Test-retest reliability is good. Convergent validity with life satisfaction and happiness measures is strong. Factor structure confirmed across cultures.",1.0,Multiple validation studies
spane faraday cage|25000 participants|gary brecka spane,spane_faraday_myth,"NO peer-reviewed study exists of 25,000 participants in a Faraday cage measuring emotional 'frequency' with SPANE. The SPANE scale measures self-reported affect FREQUENCY (how often emotions occur) on a 1-5 scale, NOT metaphysical frequencies. Claims by Gary Brecka and others about 'authenticity having higher frequency than love' are NOT supported by peer-reviewed SPANE literature.",1.0,Reddit r/biohackers; academic literature review
spane german validation|spane germany|spane deutsch,spane_german,"Rahm et al. (2017) validated SPANE in Germany with N=1057. Confirmed two-factor structure. Internal consistency: alpha=.85 (positive) and alpha=.81 (negative). Published in PLOS ONE.",1.0,Rahm et al. 2017
spane chinese validation|spane china,spane_chinese,"Li et al. (2013) validated SPANE in Chinese with N=4250. Found measurement invariance across gender. Strong reliability and validity.",1.0,Li et al. 2013
spane portuguese validation|spane brazil|spane portugal,spane_portuguese,"Silva & Caetano (2021) validated SPANE in Portuguese with N=892. Confirmed factor structure suitable for cross-cultural research. Published in BMC Psychology.",1.0,Silva & Caetano 2021
spane vs panas|difference between spane and panas|panas comparison,spane_panas_comparison,"SPANE measures frequency of affect over past 4 weeks with 12 items. PANAS measures intensity of affect with 20 items (10 positive, 10 negative). SPANE is briefer, measures frequency not intensity, and includes balance score. SPANE has better cross-cultural validity.",1.0,Diener et al. 2009
what is spane-b|spane balance score|emotional balance,spane_balance,"SPANE-B is the balance score calculated as SPANE-P minus SPANE-N. Range: -24 to +24. Positive scores indicate more positive than negative affect; negative scores indicate more negative than positive affect. Zero indicates equal positive and negative affect.",1.0,Diener et al. 2009
spane time frame|how far back does spane ask,spane_timeframe,"SPANE asks respondents to consider the past FOUR WEEKS when rating how often they experienced each feeling. This is a relatively stable timeframe suitable for assessing typical emotional patterns.",1.0,Diener et al. 2009
spane response scale|spane likert scale|spane rating,spane_response,"Each SPANE item uses a 5-point frequency scale: 1=Very Rarely or Never, 2=Rarely, 3=Sometimes, 4=Often, 5=Very Often or Always. This measures how often the feeling was experienced in the past 4 weeks.",1.0,Diener et al. 2009
spane arabic validation|spane gulf|spane middle east,spane_arabic,"Yaaqeib et al. (2022) validated SPANE in the Arab Gulf region with N=1,393 across Saudi Arabia Oman Kuwait and other countries. Confirmed two-factor structure. Convergent validity with SWLS: r=.653 for SPANE-Balance. Published in PLOS ONE.",1.0,Yaaqeib et al. 2022
spane spanish validation|spane spain|spane espanol,spane_spanish,"Espejo et al. (2020) validated SPANE in Spanish adults with N=821. Two correlated factors with correlated errors. Scalar invariance by gender. Composite reliability: .858 (SPANE-P) and .791 (SPANE-N). Published in IJERPH.",1.0,Espejo et al. 2020
spane mexican validation|spane mexico|spane latam,spane_mexican,"Daniel-Gonzalez et al. (2020) validated Mexican Spanish SPANE in medical and psychology students (N=312). Confirmed factor structure suitable for Latin American research. Published in Psychological Reports.",1.0,Daniel-Gonzalez et al. 2020
spane chilean validation|spane chile|spane school,spane_chilean,"Carmona-Halty & Villegas-Robertson (2018) validated SPANE in Chilean school context with N=450. Confirmed factor structure with good reliability in adolescent population. Published in Interciencia.",1.0,Carmona-Halty & Villegas-Robertson 2018
spane greek validation|spane greece,spane_greek,"Kyriazos et al. (2018) validated SPANE in Greek with N=619 using bifactor subjective well-being model. Strong psychometric properties confirmed. Published in Psychology journal.",1.0,Kyriazos et al. 2018
spane romanian validation|spane romania,spane_romanian,"Balgiu (2019) validated SPANE on Romanian student sample with N=380. Confirmed two-factor structure with adequate internal consistency. Published in Revista de Psihologie.",1.0,Balgiu 2019
spane citations|how many citations|spane impact,spane_citations,"The original SPANE paper by Diener et al. (2009) has amassed over 6,000 citations as of 2026. It is a cornerstone instrument in positive psychology and well-being research with validation studies in 15+ languages and countries.",1.0,ResRef 2026; Google Scholar
spane related measures|similar scales|scales like spane,spane_related_measures,"Related well-being measures: PANAS (intensity 20 items), SWLS (life satisfaction 5 items), Flourishing Scale (8 items), PERMA Profiler (23 items), MHC-SF (mental health 14 items), SHS (happiness 4 items), WEMWBS (well-being 14 items), OHQ (happiness 29 items). SPANE is unique in measuring affect FREQUENCY with 12 items and providing a balance score.",1.0,Multiple sources
what is panas|panas scale|positive and negative affect schedule,panas_definition,"PANAS is a 20-item self-report scale (Watson et al. 1988) measuring the INTENSITY of positive and negative affect using 10 items each. Rated 1-5 from 'Not at all' to 'Extremely'. SPANE measures FREQUENCY with 12 items; PANAS measures INTENSITY with 20 items.",1.0,Watson et al. 1988
what is swls|satisfaction with life scale,swls_definition,"SWLS is a 5-item scale (Diener et al. 1985) measuring global cognitive judgment of life satisfaction. Rated 1-7. Scores 5-35. SPANE correlates strongly with SWLS (r=.65) — together they assess emotional AND cognitive well-being.",1.0,Diener et al. 1985
what is flourishing scale|flourishing scale diener,fs_definition,"The Flourishing Scale (Diener et al. 2010) is an 8-item measure of psychological flourishing covering positive relationships competence meaning and purpose. Scores 8-56. Often used alongside SPANE: SPANE captures emotion; FS captures eudaimonic functioning.",1.0,Diener et al. 2010
what is perma|perma profiler|seligman perma,perma_definition,"PERMA Profiler (Seligman 2011) measures five elements of well-being: Positive emotion Engagement Relationships Meaning Accomplishment. 23 items rated 0-10. SPANE measures the 'P' (Positive Emotion) component. PERMA provides a broader well-being framework.",1.0,Seligman 2011
what is mhc-sf|mental health continuum,mhc_sf_definition,"MHC-SF (Keyes 2009) is a 14-item scale measuring emotional psychological and social well-being. Diagnoses flourishing vs languishing. SPANE focuses on emotional well-being (affect frequency); MHC-SF covers all three Keyes domains.",1.0,Keyes 2009`;

const EMBEDDED_SPANE_RELATED = `topic_id,topic_name,relation_type,description,connection_to_spane
1,PANAS,Alternative measure,"Positive and Negative Affect Schedule - measures intensity rather than frequency",Both measure positive and negative affect but SPANE measures frequency with fewer items
2,SWLS,Complementary measure,"Satisfaction With Life Scale - measures cognitive evaluation of life",SPANE correlates strongly with SWLS; together they assess emotional and cognitive well-being
3,Flourishing Scale,Complementary measure,Measures psychological flourishing and functioning,SPANE captures emotional component; Flourishing Scale captures eudaimonic component
4,PERMA,Framework,Positive psychology framework by Seligman,SPANE measures the 'P' (Positive Emotion) component of PERMA
5,Subjective Well-Being,Parent construct,"Diener's tripartite model of life satisfaction, positive affect, and negative affect",SPANE measures the affective components of SWB
6,Emotional Intelligence,Related field,Ability to perceive use understand and manage emotions,SPANE scores correlate with emotional awareness and regulation
7,Cross-Cultural Psychology,Application field,Study of psychological phenomena across cultures,SPANE has been validated in 15+ languages showing strong cross-cultural validity
8,Well-being Interventions,Application,Programs designed to improve psychological well-being,SPANE is commonly used as outcome measure in positive psychology interventions`;

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
class SPANEKnowledgeBase {
  items: CSVRow[] = [];
  scoring: CSVRow[] = [];
  validation: CSVRow[] = [];
  papers: CSVRow[] = [];
  relatedMeasures: CSVRow[] = [];
  related: CSVRow[] = [];
  cache: QueryCache;

  constructor() {
    this.items = loadCSV('spane_scale_items.csv', EMBEDDED_SPANE_ITEMS);
    this.scoring = loadCSV('spane_scoring_guide.csv', EMBEDDED_SPANE_SCORING);
    this.validation = loadCSV('spane_validation_studies.csv', EMBEDDED_SPANE_VALIDATION);
    this.papers = loadCSV('spane_papers.csv', EMBEDDED_SPANE_PAPERS);
    this.relatedMeasures = loadCSV('spane_related_measures.csv', EMBEDDED_SPANE_RELATED_MEASURES);
    this.related = loadCSV('spane_related_topics.csv', EMBEDDED_SPANE_RELATED);
    this.cache = new QueryCache(0.55);
    this.cache.load(loadCSV('spane_faq_cache.csv', EMBEDDED_SPANE_FAQ));
  }

  search(query: string): { type: string; data: CSVRow[]; relevance: number }[] {
    const normalized = query.toLowerCase();
    const results: { type: string; data: CSVRow[]; relevance: number }[] = [];

    const itemMatches = this.items.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (itemMatches.length > 0) results.push({ type: 'scale_items', data: itemMatches, relevance: itemMatches.length });

    const scoringMatches = this.scoring.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (scoringMatches.length > 0) results.push({ type: 'scoring', data: scoringMatches, relevance: scoringMatches.length * 1.2 });

    const valMatches = this.validation.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (valMatches.length > 0) results.push({ type: 'validation', data: valMatches, relevance: valMatches.length });

    const paperMatches = this.papers.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (paperMatches.length > 0) results.push({ type: 'papers', data: paperMatches, relevance: paperMatches.length * 1.3 });

    const measureMatches = this.relatedMeasures.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (measureMatches.length > 0) results.push({ type: 'related_measures', data: measureMatches, relevance: measureMatches.length * 1.1 });

    const relMatches = this.related.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(normalized))
    );
    if (relMatches.length > 0) results.push({ type: 'related', data: relMatches, relevance: relMatches.length * 0.8 });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  generateAnswer(query: string, searchResults: { type: string; data: CSVRow[] }[]): string {
    let answer = '';

    for (const result of searchResults.slice(0, 4)) {
      if (result.type === 'scale_items') {
        answer += `## SPANE Scale Items\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['item_text']}** (${r['subscale']}): ${r['description']}\n`;
        });
        answer += `\n`;
      }
      if (result.type === 'scoring') {
        answer += `## Scoring Guide\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['score_type']}**: ${r['interpretation']}\n`;
          answer += `  - Range: ${r['range']}\n`;
          answer += `  - Formula: ${r['formula']}\n`;
        });
        answer += `\n`;
      }
      if (result.type === 'validation') {
        answer += `## Validation Studies\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['authors']} (${r['year']})** — ${r['country']} (${r['language']}): ${r['key_findings']}\n`;
        });
        answer += `\n`;
      }
      if (result.type === 'papers') {
        answer += `## Research Papers\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['authors']} (${r['year']})** — *${r['title']}*\n`;
          answer += `  - ${r['journal']} | ${r['country']} (${r['language']}) | N=${r['sample_size']} | ~${r['citations_approx']} citations\n`;
          answer += `  - ${r['key_findings']}\n`;
        });
        answer += `\n`;
      }
      if (result.type === 'related_measures') {
        answer += `## Related Well-Being Measures\n\n`;
        result.data.forEach(r => {
          answer += `- **${r['measure_name']}** (${r['abbreviation']}, ${r['items']} items, ${r['scoring_range']}): ${r['description']}\n`;
          answer += `  - *Relation to SPANE:* ${r['relation_to_spane']}\n`;
          answer += `  - *When to use:* ${r['when_to_use']}\n`;
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
      answer = `I have extensive built-in knowledge about the SPANE scale including its 12 items, scoring methodology (SPANE-P, SPANE-N, SPANE-B), 12 validation studies across 15+ languages, related measures (PANAS, SWLS, Flourishing Scale, PERMA, MHC-SF), and research papers with 6,000+ citations.\n\n`;
      answer += `**Available topics:** Scale items and subscales | Scoring and interpretation | Validation studies (USA, Germany, China, Portugal, Spain, Arab Gulf, Mexico, Greece, Chile, Romania, Peru) | Related measures | Research papers | Myth-busting (Faraday cage claims)\n`;
    }

    return answer.trim();
  }
}

// ======== MODULE-LEVEL SINGLETON ========
const kb = new SPANEKnowledgeBase();

// ======== HANDLER ========
export default async function handler(
  task: StartTaskMessage,
  ctx?: TaskContext,
): Promise<HandlerResult> {
  const input = task.requestParts?.[0];
  const query = (input as Record<string, unknown>)?.text as string ?? '';

  ctx?.reportStatus('SPANE Expert: Analyzing query...');

  // 1. CHECK CACHE FIRST (no LLM call needed)
  const cached = kb.cache.match(query);
  if (cached) {
    ctx?.reportStatus('SPANE Expert: Cache hit — returning instantly');
    const stats = kb.cache.getStats();
    return {
      artifacts: [{
        data: `${cached.answer}\n\n---\n*Source: ${cached.source} | Cache confidence: ${(cached.confidence * 100).toFixed(1)}% | Cache hit rate: ${stats.hitRate}*`,
        mimeType: 'text/markdown',
      }],
    };
  }

  // 2. SEARCH BUILT-IN KNOWLEDGE BASE (no LLM call needed)
  ctx?.reportStatus('SPANE Expert: Searching built-in knowledge base...');
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

  // 3. FALLBACK: General SPANE overview
  ctx?.reportStatus('SPANE Expert: Returning general overview...');
  const generalAnswer = `## SPANE Expert Agent\n\nI am the SPANE (Scale of Positive and Negative Experience) Expert with built-in CSV knowledge covering:\n\n` +
    `- **12 scale items** with subscales (SPANE-P: positive/good/pleasant/happy/joyful/contented; SPANE-N: negative/bad/unpleasant/sad/afraid/angry)\n` +
    `- **Scoring guide**: SPANE-P (6-30), SPANE-N (6-30), SPANE-B (-24 to +24)\n` +
    `- **12 validation studies**: USA (Diener 2009), Germany (Rahm 2017, N=1,057), China (Li 2013, N=4,250), Portugal (Silva 2021), Spain (Espejo 2020), Arab Gulf (Yaaqeib 2022, N=1,393), Mexico (Daniel-Gonzalez 2020), Greece (Kyriazos 2018), Chile (Carmona-Halty 2018), Romania (Balgiu 2019), Peru (Cassaretto 2017)\n` +
    `- **Research papers**: 6,000+ citations; original paper in Social Indicators Research\n` +
    `- **Related measures**: PANAS, SWLS, Flourishing Scale, PERMA, MHC-SF, SHS, WEMWBS, OHQ, ABS, SGWB\n` +
    `- **Myth debunking**: No peer-reviewed 25K Faraday cage study exists; SPANE measures frequency of occurrence (1-5 scale), NOT metaphysical frequencies\n\n` +
    `Please ask a more specific question about any of these topics.`;

  return {
    artifacts: [{ data: generalAnswer, mimeType: 'text/markdown' }],
  };
}
