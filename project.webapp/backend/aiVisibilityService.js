require('dotenv').config();

const axios = require('axios');

const { GoogleGenerativeAI } = require('@google/generative-ai');

const { LLMService } = require('./llmService');

const cheerio = require('cheerio');



// API Keys from environment variables

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;



// Tunable timeouts (ms) for fast-mode calls

const PERPLEXITY_TIMEOUT_MS = parseInt(process.env.PERPLEXITY_TIMEOUT_MS || '25000', 10);

const OPENAI_TIMEOUT_MS = parseInt(process.env.OPENAI_TIMEOUT_MS || '20000', 10);



// Shared LLM service instance

const sharedLLM = new LLMService();



// AI-specific prompts for each model

function getChatGPTPrompts(company, industry) {

  return [

    `Which companies are leading in ${industry}?`,

    `What are the top companies offering ${industry} solutions in ${industry}?`,

    `Compare ${company} with other companies in the ${industry}.`,

    `How does ${company} leverage AI in ${industry}?`

  ];

}



function getGeminiPrompts(company, industry) {

  return [

    `Which companies are leading in ${industry}?`,

    `What are the top companies offering ${industry} solutions in ${industry}?`,

    `Compare ${company} with other companies in the ${industry}.`,

    `How does ${company} leverage AI in ${industry}?`

  ];

}



function getPerplexityPrompts(company, industry) {

  return [

    `Which companies are leading in ${industry}?`,

    `What are the top companies offering ${industry} solutions in ${industry}?`,

    `Compare ${company} with other companies in the ${industry}.`,

    `How does ${company} leverage AI in ${industry}?`

  ];

}



function getClaudePrompts(company, industry) {

  return [

    `Which companies are leading in ${industry}?`,

    `What are the top companies offering ${industry} solutions in ${industry}?`,

    `Compare ${company} with other companies in the ${industry}.`,

    `How does ${company} leverage AI in ${industry}?`

  ];

}



// --- Per-model visibility scoring (CSE-driven) ---

const MODEL_KEYWORDS = {

  chatgpt: ['chatgpt'],

  gemini: ['gemini ai'],

  claude: ['claude ai'],

  perplexity: ['perplexity ai']

};



// Only use providers that are configured to avoid zeros from missing API keys

function getConfiguredModelKeys() {

  const keys = [];

  
  
  // Check if API key exists and is not a placeholder value

  const isValidApiKey = (key) => {

    return key && 

           !key.includes('your_') && 

           !key.includes('_here') &&

           key !== 'your_openai_api_key_here' &&

           key !== 'your_gemini_api_key_here' &&

           key !== 'your_anthropic_api_key_here' &&

           key !== 'your_perplexity_api_key_here';

  };

  
  
  if (isValidApiKey(OPENAI_API_KEY)) keys.push('chatgpt');

  if (isValidApiKey(GEMINI_API_KEY)) keys.push('gemini');

  if (isValidApiKey(ANTHROPIC_API_KEY)) keys.push('claude');

  if (isValidApiKey(PERPLEXITY_API_KEY)) keys.push('perplexity');

  
  
  console.log(`🔧 Configured model keys: [${keys.join(', ')}]`);

  return keys;

}



function getHost(url) {

  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }

}



function computeSourceWeight(url) {

  const host = getHost(url);

  if (!host) return 1.0;

  if (/forbes|bloomberg|wsj|nytimes|wired|techcrunch|theverge|reuters|guardian|bbc|cnbc|financialtimes|ft\.com|news/i.test(host)) return 1.5;

  if (/medium|substack|blog|dev\.to|hashnode/i.test(host)) return 1.0;

  if (/reddit|twitter|x\.com|quora|stackoverflow|hackernews|ycombinator/i.test(host)) return 0.5;

  return 1.0;

}



function quickSentimentScore(text) {

  // Heuristic fallback: positive words increase, negative decrease

  const t = String(text || '').toLowerCase();

  const pos = (t.match(/best|leading|top|innovative|recommended|trusted|popular|positive|strong|leader|growing/g) || []).length;

  const neg = (t.match(/problem|issue|concern|negative|bad|poor|not\s+recommended|decline|weak/g) || []).length;

  const total = Math.max(1, pos + neg);

  const raw = (pos - neg) / total; // -1..1

  return Math.max(-1, Math.min(1, raw));

}



async function fetchModelSnippetsFast(competitorName, modelKey) {

  try {

    const kw = MODEL_KEYWORDS[modelKey]?.[0] || modelKey;

    const q = `${competitorName} ${kw}`;

    const results = await withTimeout(queryCustomSearchAPI(q), 7000, []);

    return results.slice(0, 10); // cap

  } catch { return []; }

}



async function fetchModelSnippetsFull(competitorName, modelKey) {

  try {

    const kws = MODEL_KEYWORDS[modelKey] || [modelKey];

    const queries = kws.map(k => `${competitorName} ${k}`);

    const results = await Promise.all(queries.map(q => withTimeout(queryCustomSearchAPI(q), 9000, []).catch(() => [])));

    const flat = results.flat();

    // de-duplicate by link

    const seen = new Set();

    const unique = [];

    for (const r of flat) {

      if (!r?.link) continue;

      if (seen.has(r.link)) continue;

      seen.add(r.link);

      unique.push(r);

      if (unique.length >= 15) break;

    }

    return unique;

  } catch { return []; }

}



async function computePerModelRawMetrics(competitorName) {

  const modelKeys = Object.keys(MODEL_KEYWORDS);

  const byModel = {};

  await Promise.all(modelKeys.map(async (m) => {

    const results = await fetchModelSnippetsFull(competitorName, m);

    let mentions = 0;

    let prominenceSum = 0;

    let posCount = 0;

    let negCount = 0;

    let totalCount = 0;

    results.forEach((item, idx) => {

      const snippet = `${item?.name || ''}. ${item?.snippet || ''}`;

      const weight = computeSourceWeight(item?.link || '');

      const rankPos = idx + 1;

      // Mentions: count snippet presence (treat each result as one mention)

      mentions += 1;

      // Prominence contribution

      prominenceSum += (1 / rankPos) * weight;

      // Sentiment

      const s = quickSentimentScore(snippet);

      if (s > 0.1) posCount++; else if (s < -0.1) negCount++;

      totalCount++;

    });

    const sentiment = totalCount > 0 ? (posCount - negCount) / totalCount : 0; // -1..1

    const brandMentions = mentions; // co-mentions proxy

    byModel[m] = { mentions, prominence: prominenceSum, sentiment, brandMentions };

  }));

  return byModel;

}



function normalizeAndScoreModels(rawMetricsByCompetitor) {

  // Collect maxima for normalization per model

  const modelKeys = Object.keys(MODEL_KEYWORDS);

  const maxes = {};

  modelKeys.forEach(m => { maxes[m] = { mentions: 1, prominence: 1, brand: 1 }; });

  for (const comp of rawMetricsByCompetitor) {

    for (const m of modelKeys) {

      const mm = comp.rawModels[m] || { mentions: 0, prominence: 0, brandMentions: 0 };

      maxes[m].mentions = Math.max(maxes[m].mentions, mm.mentions || 0);

      maxes[m].prominence = Math.max(maxes[m].prominence, mm.prominence || 0);

      maxes[m].brand = Math.max(maxes[m].brand, mm.brandMentions || 0);

    }

  }

  // Compute normalized 0..100 and score

  for (const comp of rawMetricsByCompetitor) {

    const aiScores = {};

    for (const m of modelKeys) {

      const mm = comp.rawModels[m] || { mentions: 0, prominence: 0, sentiment: 0, brandMentions: 0 };

      const normMentions = (mm.mentions / Math.max(1, maxes[m].mentions)) * 100;

      const normProminence = (mm.prominence / Math.max(1, maxes[m].prominence)) * 100;

      const normSentiment = ((Math.max(-1, Math.min(1, mm.sentiment)) + 1) / 2) * 100; // -1..1 to 0..100

      const normBrand = (mm.brandMentions / Math.max(1, maxes[m].brand)) * 100;

      const score = (normMentions * 0.35) + (normProminence * 0.30) + (normSentiment * 0.20) + (normBrand * 0.15);

      // Scale back to 0..10 for table parity

      aiScores[m] = Number((score / 10).toFixed(4));

    }

    comp.aiScores = aiScores;

  }

  return rawMetricsByCompetitor;

}



// --- AI Traffic Share (query-pool → model responses) ---

function getDefaultQueryPool(industry = '', geo = null, companyName = '', product = '') {

  const base = [

    'top companies in [INDUSTRY]',

    'best tools in [INDUSTRY]',

    'leading vendors in [INDUSTRY]',

    'alternatives and competitors in [INDUSTRY]',

    'who are the leaders in [INDUSTRY]',

    'recommended solutions in [INDUSTRY]'

  ];

  const ind = industry && industry.trim().length > 0 ? industry : 'this category';



  // Geo/product aware prompt bank (30) merged with base prompts

  const geoBank = getGeoCompetitorPromptBank({

    product: product || '[product]',

    category: ind || '[product category]',

    city: geo?.city || '',

    country: geo?.country || '',

    region: geo?.region || '',

    competitorA: geo?.competitorA || (companyName || '[competitor name]'),

    competitorB: geo?.competitorB || 'Amazon'

  });



  const merged = [

    ...base.map(q => q.replace('[INDUSTRY]', ind)),

    ...geoBank

  ];



  // De-duplicate while preserving order

  const seen = new Set();

  const unique = [];

  for (const q of merged) {

    const key = q.trim().toLowerCase();

    if (!seen.has(key)) { seen.add(key); unique.push(q); }

  }



  return unique;

}



// Citation-first prompt bank to elicit explicit sources/domains

function getCitationPromptBank({ company = '', industry = '', product = '', country = '' }) {

  const industryCtx = industry || '[industry]';

  const productCtx = product || '[product]';

  const countryCtx = country ? ` in ${country}` : '';

  const wrapper = 'Answer briefly. Then output a Sources section with 3–8 items as: Category | Domain | URL. Use real HTTPS links, one domain per line, no duplicates.';

  return [

    `${wrapper}\nWho are the leading vendors in ${industryCtx}? For each key claim include a supporting source.`,

    `${wrapper}\nCompare ${company} to peers in ${industryCtx}. Cite one link per claim.`,

    `${wrapper}\nBest buying guides for ${productCtx}${countryCtx}. Provide reputable publication links.`,

    `${wrapper}\nWhere do users discuss ${productCtx}? Give Trustpilot/Reddit/Quora thread URLs.`,

    `${wrapper}\nWhere to buy ${productCtx}${countryCtx}? Provide retailer category/bestseller URLs.`,

    `${wrapper}\nNews/editorial coverage of ${company} in ${industryCtx} (last 12 months). Give major publication links.`

  ];

}



// Content-style prompt bank to elicit stylistic patterns explicitly

function getContentStylePromptBank({ company = '', competitorA = '', competitorB = '', industry = '', product = '', country = '' }) {

  const ind = industry || '[industry]';

  const prod = product || '[product]';

  const geo = country ? ` in ${country}` : '';

  const compA = competitorA || 'Competitor A';

  const compB = competitorB || 'Competitor B';

  const wrap = 'Answer briefly. Then output a Sources section with 3–8 items as: Category | Domain | URL.';

  return [

    // List style

    `${wrap}\nTop 10 ecommerce sites for ${prod}${geo}. Rank them and give one‑line reasons.`,

    `${wrap}\nBest places to buy ${prod} today; list 5 with key strengths.`,

    // Comparison style

    `${wrap}\nCompare ${company} vs ${compA} vs ${compB} on price, selection, shipping, returns. Provide a concise table and pros/cons.`,

    `${wrap}\n${company} vs ${compA}: which is better for ${prod}? Explain briefly.`,

    // Recommendation style

    `${wrap}\nRecommend the best retailer for these personas: budget, premium/luxury, fastest shipping, most reliable returns for ${prod}. Give one pick per persona.`,

    `${wrap}\nIf I value price vs service vs speed for ${prod}, which vendor should I choose? One sentence each.`,

    // FAQ style

    `${wrap}\nWhere can I buy ${prod} safely online${geo}? Include any trust or warranty cues.`,

    `${wrap}\nIs ${company} legit for ${prod}? What do buyers typically say?`,

    // Editorial style

    `${wrap}\nSummarize recent editorial coverage of top ${ind} retailers (last 12 months). Who is called 'most trusted' or 'best overall' and why?`,

    `${wrap}\nAccording to major publications, which ${ind} stores lead today? Cite 3–5 sources.`

  ];

}



// Prompt bank: 30 geo-intent e-commerce discovery questions

function getGeoCompetitorPromptBank({ product, category, city, country, region, competitorA, competitorB }) {

  const geo = [city, region, country].filter(Boolean).join('/');

  const locIn = geo ? ` in ${geo}` : '';

  const locFor = geo ? ` for ${geo}` : '';

  const safeProduct = product || '[product]';

  const safeCategory = category || '[product category]';

  const compA = competitorA || '[competitor A]';

  const compB = competitorB || '[competitor B]';



  return [

    `Best website to buy ${safeProduct} online${locIn}`,

    `Top ${safeCategory} ecommerce stores${locIn}`,

    `Trusted online stores for ${safeProduct}${locIn}`,

    `Affordable ${safeProduct} retailers online${locIn}`,

    `Where can I buy high-quality ${safeProduct} with warranty${locIn}?`,

    `Most reliable ecommerce websites for ${safeCategory}${locIn}`,

    `Which online store has the best reviews for ${safeProduct}${locIn}?`,

    `Is ${compA} a trusted site for ${safeProduct}${locIn}?`,

    `Best-rated ecommerce platforms for ${safeProduct}${locFor}`,

    `Where do experts recommend buying ${safeProduct}${locIn}?`,

    `Cheapest place to buy ${safeProduct} online${locIn}`,

    `Best deals on ${safeCategory} ecommerce websites${locIn}`,

    `${safeProduct} price comparison: Amazon vs ${compA} vs others${locIn}`,

    `Does ${compA} offer discounts on ${safeProduct}${locIn}?`,

    `Best value-for-money online store for ${safeProduct}${locIn}`,

    `Fastest delivery for ${safeProduct}${locIn}`,

    `Ecommerce websites with free shipping for ${safeProduct}${locIn}`,

    `Best return policies for ${safeProduct} online${locIn}`,

    `Where can I get same-day delivery for ${safeProduct}${locIn}?`,

    `Which online store has the best customer service for ${safeProduct}${locIn}?`,

    `Compare ${compA} vs ${compB} for ${safeProduct}${locIn}`,

    `Is ${compA} better than Amazon for ${safeProduct}${locIn}?`,

    `Which online store is more reliable: ${compA} or ${compB} for ${safeProduct}${locIn}?`,

    `Best alternatives to ${compA} for ${safeProduct}${locIn}`,

    `Which ecommerce site has the most product variety for ${safeProduct}${locIn}?`,

    `Best local online store for ${safeProduct}${locIn}`,

    `Where can I buy ${safeProduct} from local sellers${locIn}?`,

    `${safeProduct} ecommerce websites that deliver to ${geo || '[city/country]'}`,

    `Most popular ecommerce site for ${safeProduct}${locIn}`,

    `Which online store near me sells ${safeProduct} with delivery${locIn}?`

  ];

}



async function callModelSimple(modelKey, prompt) {

  console.log(`\n🤖 [callModelSimple] Calling ${modelKey} with prompt: "${prompt.substring(0, 100)}..."`);

  
  
  try {

    // Check if API key exists and is not a placeholder value

    const isValidApiKey = (key) => {

      return key && 

             !key.includes('your_') && 

             !key.includes('_here') &&

             key !== 'your_openai_api_key_here' &&

             key !== 'your_gemini_api_key_here' &&

             key !== 'your_anthropic_api_key_here' &&

             key !== 'your_perplexity_api_key_here';

    };

    
    
    if (modelKey === 'gemini') {

      if (!isValidApiKey(GEMINI_API_KEY)) {

        console.log(`   ❌ [callModelSimple] Invalid Gemini API key`);

        return '';

      }

      console.log(`   📞 [callModelSimple] Calling Gemini API...`);

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      let res;

      try {

        res = await withTimeout(

          model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }]}] }),

          10000,

          { response: { candidates: [] } }

        );

      } catch (err) { 
        console.log(`   ❌ [callModelSimple] Gemini API error: ${err.message}`);
        res = { response: { candidates: [] } }; 
      }

      const response = res?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      console.log(`   ${response.length > 0 ? '✅' : '⚠️'} [callModelSimple] Gemini response: ${response.length} characters`);

      return response;

    }

    if (modelKey === 'chatgpt') {

      if (!isValidApiKey(OPENAI_API_KEY)) {

        console.log(`   ❌ [callModelSimple] Invalid ChatGPT API key`);

        return '';

      }

      console.log(`   📞 [callModelSimple] Calling ChatGPT API...`);

      const res = await axios.post('https://api.openai.com/v1/chat/completions', {

        model: 'gpt-3.5-turbo',

        messages: [

          { role: 'system', content: 'You are a helpful market analyst.' },

          { role: 'user', content: prompt }

        ],

        max_tokens: 400

      }, { headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` } });

      const response = res?.data?.choices?.[0]?.message?.content || '';

      console.log(`   ✅ [callModelSimple] ChatGPT response: ${response.length} characters`);

      return response;

    }

    if (modelKey === 'claude') {

      if (!isValidApiKey(ANTHROPIC_API_KEY)) {

        console.log(`   ❌ [callModelSimple] Invalid Claude API key`);

        return '';

      }

      console.log(`   📞 [callModelSimple] Calling Claude API...`);

      const res = await axios.post('https://api.anthropic.com/v1/messages', {

        model: 'claude-3.5-sonnet-20241022',

        max_tokens: 400,

        messages: [{ role: 'user', content: prompt }]

      }, { headers: { 'Authorization': `Bearer ${ANTHROPIC_API_KEY}`, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' } });

      const response = res?.data?.content?.[0]?.text || '';

      console.log(`   ✅ [callModelSimple] Claude response: ${response.length} characters`);

      return response;

    }

    if (modelKey === 'perplexity') {

      if (!isValidApiKey(PERPLEXITY_API_KEY)) {

        console.log(`   ❌ [callModelSimple] Invalid Perplexity API key`);

        return '';

      }

      console.log(`   📞 [callModelSimple] Calling Perplexity API...`);

      try {

        const resp = await sharedLLM.callPerplexityAPI(prompt, 'sonar', false);

        const response = resp?.text || '';

        console.log(`   ✅ [callModelSimple] Perplexity response: ${response.length} characters`);

        return response;

      } catch (error) {

        console.log(`   ❌ [callModelSimple] Perplexity API error: ${error.message}`);

        return '';

      }

    }

    console.log(`   ❌ [callModelSimple] Unknown model key: ${modelKey}`);

    return '';

  } catch (error) {

    console.log(`   ❌ [callModelSimple] Error calling ${modelKey}: ${error.message}`);

    return '';

  }

}



async function computeAiTrafficShares(competitorNames, industry, opts = {}) {

  console.log('\n🚦 [computeAiTrafficShares] Starting AI Traffic Share calculation...');

  console.log(`   Competitors: ${competitorNames.join(', ')}`);

  console.log(`   Industry: ${industry}`);

  console.log(`   Full analysis mode enabled`);

  
  
  // Use only the four prompts provided; no additional banks

  const queries = [

    `Which companies are leading in ${industry}?`,

    `What are the top companies offering ${industry} solutions in ${industry}?`,

    `Compare ${opts.companyName || ''} with other companies in the ${industry}.`,

    `How does ${opts.companyName || ''} leverage AI in ${industry}?`

  ];

  console.log(`   Queries to process: ${queries.length} (${queries.join(', ')})`);

  
  
  const modelKeys = getConfiguredModelKeys();

  console.log(`   Configured models: ${modelKeys.join(', ')}`);

  
  
  if (modelKeys.length === 0) {

    console.log('❌ [computeAiTrafficShares] No models configured - returning empty result');

    return { sharesByCompetitor: {}, totals: {}, counts: {}, queries: [] };

  }

  
  
  const counts = {};

  const totals = {};

  const placements = {}; // per-model placement counters

  modelKeys.forEach(m => {

    counts[m] = Object.fromEntries(competitorNames.map(n => [n, 0]));

    totals[m] = 0;

    placements[m] = Object.fromEntries(competitorNames.map(n => [n, { first: 0, second: 0, third: 0 }]));

  });



  // Precompute alias lists per competitor for robust detection

  const aliasMap = Object.fromEntries(competitorNames.map(n => [n, buildAliases(n)]));

  const listVendors = competitorNames.join(', ');



  const promptFor = (q) => `For the topic: "${q}", consider these vendors: ${listVendors}. Briefly discuss which of these are most relevant/recommended today. Mention vendor names directly.`;



  // Create all LLM calls in parallel

  console.log('\n🚀 [computeAiTrafficShares] Creating parallel LLM calls...');

  const allCalls = [];

  
  
  modelKeys.forEach(m => {

    queries.forEach((q, i) => {

      allCalls.push({

        model: m,

        query: q,

        queryIndex: i,

        prompt: promptFor(q)

      });

    });

  });

  
  
  console.log(`   Total parallel calls: ${allCalls.length} (${modelKeys.length} models × ${queries.length} queries)`);

  
  
  // Execute all calls in parallel

  const responses = await Promise.all(allCalls.map(async (call) => {

    try {

      console.log(`   📞 [${call.model}] Query ${call.queryIndex + 1}: "${call.query}"`);

      const text = await withTimeout(callModelSimple(call.model, call.prompt), 12000, '').catch(() => '');

      console.log(`   ✅ [${call.model}] Response: ${text ? text.length : 0} characters`);

      return {

        model: call.model,

        query: call.query,

        queryIndex: call.queryIndex,

        text: text || '',

        success: !!(text && String(text).trim())

      };

    } catch (error) {

      console.log(`   ❌ [${call.model}] Error: ${error.message}`);

      return {

        model: call.model,

        query: call.query,

        queryIndex: call.queryIndex,

        text: '',

        success: false

      };

    }

  }));

  
  
  console.log(`\n📊 [computeAiTrafficShares] Processing ${responses.length} responses...`);

  
  
  // Process all responses in parallel

  const processingPromises = responses.map(async (response) => {

    if (!response.success) {

      console.log(`   ⚠️ Skipping failed response from ${response.model} for "${response.query}"`);

      return { model: response.model, queryIndex: response.queryIndex, mentions: [], ranked: [] };

    }

    
    
    const lower = String(response.text).toLowerCase();

    const mentions = [];

    
    
    competitorNames.forEach(name => {

      if (!name) return;

      const aliases = aliasMap[name] || [name];

      const matched = aliases.some(a => wordBoundaryRegex(a).test(lower));

      if (matched) {

        mentions.push(name);

        console.log(`     ✅ [${response.model}] Found mention of "${name}"`);

      }

    });

    const ranked = rankCompetitorsInText(response.text, competitorNames, aliasMap);

    return { model: response.model, queryIndex: response.queryIndex, mentions, ranked };

  });

  
  
  const processedResults = await Promise.all(processingPromises);

  
  
  // Aggregate results

  console.log('\n📈 [computeAiTrafficShares] Aggregating results...');

  processedResults.forEach(result => {

    const m = result.model;

    const queryIndex = result.queryIndex;

    
    
    // Count successful queries for this model

    totals[m] += 1;

    
    
    // Process mentions

    result.mentions.forEach(name => {

      counts[m][name] += 1;

    });

    // Placement: 1st/2nd/3rd+

    if (Array.isArray(result.ranked) && result.ranked.length > 0) {

      const first = result.ranked[0];

      const second = result.ranked[1];

      const rest = result.ranked.slice(2);

      if (first && placements[m][first]) placements[m][first].first += 1;

      if (second && placements[m][second]) placements[m][second].second += 1;

      rest.forEach(n => { if (placements[m][n]) placements[m][n].third += 1; });

    }

    
    
    console.log(`   [${m}] Query ${queryIndex + 1}: ${result.mentions.length} mentions found`);

  });



  // Finalize raw counts only (no formulas)

  console.log('\n📊 [computeAiTrafficShares] Finalizing counts...');

  const countsByCompetitor = {};

  competitorNames.forEach(name => {

    const byModelCounts = {};

    const placementByModel = {};

    let totalMentions = 0;

    modelKeys.forEach(m => {

      const c = counts[m][name] || 0;

      totalMentions += c;

      byModelCounts[m] = c;

      placementByModel[m] = {

        first: placements[m][name]?.first || 0,

        second: placements[m][name]?.second || 0,

        third: placements[m][name]?.third || 0

      };

    });

    const placementTotals = {

      first: modelKeys.reduce((s, m) => s + (placements[m][name]?.first || 0), 0),

      second: modelKeys.reduce((s, m) => s + (placements[m][name]?.second || 0), 0),

      third: modelKeys.reduce((s, m) => s + (placements[m][name]?.third || 0), 0)

    };

    countsByCompetitor[name] = { totalMentions, byModel: byModelCounts, placementByModel, placementTotals };

  });

  
  
  console.log('\n✅ [computeAiTrafficShares] Calculation completed (counts only)');

  return { countsByCompetitor, queries };

}



// --- AI Citation Metrics (mention + sentiment + prominence) ---

function buildAliases(name) {

  const canonRaw = String(name || '').trim();

  const canon = canonRaw.toLowerCase();

  const noSpace = canon.replace(/\s+/g, '');

  const hyphen = canon.replace(/\s+/g, '-');

  // Strip common suffixes

  const stripped = canon.replace(/\b(corp(oration)?|inc\.?|ltd\.?|llc\.?|co\.?|technologies|technology|systems|solutions)\b/gi, '').trim();

  const strippedNoSpace = stripped.replace(/\s+/g, '');

  const strippedHyphen = stripped.replace(/\s+/g, '-');

  // Domain-style variants

  const domainCom = noSpace + '.com';

  const domainAi = noSpace + '.ai';

  const words = canon.split(/\s+/).filter(Boolean);

  const swapped = words.length === 2 ? `${words[1]} ${words[0]}` : '';

  const aliases = new Set([

    canonRaw,

    canon,

    noSpace,

    hyphen,

    stripped,

    strippedNoSpace,

    strippedHyphen,

    domainCom,

    domainAi,

    swapped,

    swapped ? swapped.replace(/\s+/g, '') : '',

    swapped ? swapped.replace(/\s+/g, '-'): ''

  ].filter(Boolean));

  return Array.from(aliases);

}



// --- Relative AI Visibility Index (RAVI) ---

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function clamp100(x) { return Math.max(0, Math.min(100, x)); }

function normalizeTo100(x, max = 100, min = 0) {

  const denom = Math.max(1e-9, max - min);

  const v = ((x - min) / denom) * 100;

  return clamp100(v);

}



function computeModelCoveragePercent(aiScores, threshold = 0) {

  const keys = ['chatgpt','gemini','perplexity','claude'];

  const available = keys.filter(k => aiScores && typeof aiScores[k] === 'number');

  const denom = Math.max(1, available.length);

  const covered = available.filter(k => (Number(aiScores[k]) || 0) > threshold).length;

  return (covered / denom) * 100;

}



function computeAvgModelScore100(aiScores) {

  const keys = ['chatgpt','gemini','perplexity','claude'];

  const vals = keys.map(k => Number(aiScores?.[k] || 0)).filter(v => v >= 0);

  if (vals.length === 0) return 0;

  // aiScores are on 0..10 in this pipeline; convert to 0..100

  const avg0to10 = vals.reduce((a,b)=>a+b,0) / vals.length;

  return avg0to10 * 10;

}



function computeRaviForCompetitor(entry) {

  const avgModelScore = computeAvgModelScore100(entry.aiScores);

  const trafficShare = Number(entry.aiTraffic?.global || 0); // already 0..100

  const citationScorePct = Number(entry.citations?.global?.citationScore || 0) * 100; // 0..1 -> 0..100

  const modelCoverage = computeModelCoveragePercent(entry.aiScores, 0);



  const avgModelN = normalizeTo100(avgModelScore, 100, 0);

  const trafficN = normalizeTo100(trafficShare, 100, 0);

  const citationN = normalizeTo100(citationScorePct, 100, 0);

  const coverageN = normalizeTo100(modelCoverage, 100, 0);



  const raviRaw = (avgModelN * 0.40) + (trafficN * 0.25) + (citationN * 0.20) + (coverageN * 0.15);

  const ravi = clamp100(raviRaw);

  return {

    raw: Number(raviRaw.toFixed(3)),

    rounded: Number((Math.round(ravi * 10) / 10).toFixed(1)),

    components: {

      avgModel: Number(avgModelN.toFixed(2)),

      traffic: Number(trafficN.toFixed(2)),

      citation: Number(citationN.toFixed(2)),

      coverage: Number(coverageN.toFixed(2))

    }

  };

}



function wordBoundaryRegex(term) {

  const escaped = term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

  // Allow optional punctuation or separators between tokens (spaces, hyphens, dots)

  // Example: "cloud fuze" should match "cloud-fuze" or "cloudfuze"

  const flexible = escaped.replace(/\\\s\+/g, '[\\s._-]*');

  return new RegExp(`(?:^|[^A-Za-z0-9])${flexible}(?:[^A-Za-z0-9]|$)`, 'i');

}



function sentimentWeightFromScore(s) {

  // Map [-1,1] to bins as specified

  if (s >= 0.6) return 1.0;

  if (s >= 0.2) return 0.8;

  if (s >= -0.2) return 0.6;

  if (s >= -0.6) return 0.4;

  return 0.2;

}



function computeProminenceFactorFromText(text, name) {

  try {

    const t = String(text || '');

    const lower = t.toLowerCase();

    const idx = lower.indexOf(String(name || '').toLowerCase());

    let factor = 1.0;

    if (idx >= 0 && idx < 200) factor += 0.15; // early appearance

    if (/recommend|we\s+recommend|top\s+pick|best\s+choice/i.test(t)) factor += 0.1;

    // list rank heuristic

    const lines = t.split(/\n+/);

    let rankBoost = 0;

    for (let i = 0; i < Math.min(lines.length, 20); i++) {

      const line = lines[i];

      const m = line.match(/^\s*(\d+)[\)\.]?\s+(.+)$/);

      if (m && wordBoundaryRegex(name).test(line)) {

        const rank = parseInt(m[1], 10) || 99;

        const rankDiscount = 1 / Math.log2(1 + Math.max(1, rank));

        rankBoost = Math.max(rankBoost, rankDiscount - 1); // normalize ~ [0,1]

      }

    }

    factor += Math.min(0.3, Math.max(0, rankBoost));

    // Clamp to [0.5, 1.5]

    return Math.max(0.5, Math.min(1.5, factor));

  } catch { return 1.0; }

}



function detectMentionRobust(text, name, domainKeywords = []) {

  const t = String(text || '');

  const aliases = buildAliases(name);

  const hasAlias = aliases.some(a => wordBoundaryRegex(a).test(t));

  if (!hasAlias) return { detected: false, count: 0 };

  // Ambiguity guard for short/common names

  const common = /^(box|meta|apple|oracle|data|cloud|drive)$/i;

  if (common.test(name)) {

    const windowOk = domainKeywords.some(k => new RegExp(`\\b${k}\\b`, 'i').test(t));

    if (!windowOk) return { detected: false, count: 0 };

  }

  // Count occurrences (capped later)

  let count = 0;

  aliases.forEach(a => { const m = t.match(new RegExp(a.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'ig')); count += (m ? m.length : 0); });

  return { detected: true, count: Math.max(1, Math.min(3, count)) };

}



// --- Competitor type classification (backend logging)

const NAME_HINTS_TYPES = {

  Direct: ['store','shop','official','checkout','cart','buy from','retailer','asos','primark','zara','h&m','massimo dutti','pull & bear','pull&bear','uniqlo','mango','gap','topshop','bershka','forever 21'],

  Marketplace: ['amazon','etsy','ebay','walmart','flipkart','aliexpress','mercadolibre','rakuten'],

  Content: ['wirecutter','reddit','quora','youtube','influencer','blog','guide','buyers guide','forum','community','review site','trustpilot','capterra','g2'],

  Authority: ['forbes','allure','bloomberg','wsj','nytimes','the verge','guardian','techcrunch','reuters','cnbc','financial times','ft.com','editorial','press'],

  Indirect: ['the ordinary','tata harper','minimalist','affordable alternative','alternative','substitute','sustainable luxury','organic skincare','budget skincare']

};

function classifyCompetitorTypeServer(name, textBlob, shoppingTotal) {

  const n = String(name || '').toLowerCase();

  const t = String(textBlob || '').toLowerCase();

  const hasAny = (arr) => arr.some(k => n.includes(k) || t.includes(k));

  if (hasAny(NAME_HINTS_TYPES.Marketplace)) return 'Marketplace';

  if (hasAny(NAME_HINTS_TYPES.Content)) return 'Content';

  if (hasAny(NAME_HINTS_TYPES.Authority)) return 'Authority';

  if ((Number(shoppingTotal) || 0) > 0) return 'Direct';

  if (hasAny(NAME_HINTS_TYPES.Indirect) || /(alternative|substitute|budget|affordable|sustainable\s+luxury)/i.test(t)) return 'Indirect';

  if (/store|shop|cart|checkout|official|retail|ecommerce/i.test(t) || hasAny(NAME_HINTS_TYPES.Direct)) return 'Direct';

  return 'Direct';

}



// --- Source extraction and classification (exact URLs/domains) ---

const SOURCE_CATEGORIES_DOMAIN_LIST = {

  'Blogs / Guides': [

    'wirecutter.com', 'nytimes.com', 'thewirecutter.com', 'howtogeek.com', 'tomsguide.com', 'pcmag.com',

    'blogspot.', 'medium.com', 'substack.com', 'wp.com', 'wordpress.com'

  ],

  'Review Sites / Forums': [

    'trustpilot.com', 'reddit.com', 'quora.com', 'stackexchange.com', 'stackoverflow.com', 'hackernews.com', 'ycombinator.com', 'producthunt.com'

  ],

  'Marketplaces': [

    'amazon.', 'etsy.com', 'ebay.', 'walmart.', 'aliexpress.', 'flipkart.', 'shopify.com', 'mercadolibre.'

  ],

  'News / PR Mentions': [

    'forbes.com', 'techcrunch.com', 'theverge.com', 'bloomberg.com', 'wsj.com', 'nytimes.com', 'guardian.com', 'prnewswire.com', 'businesswire.com'

  ],

  'Directories / Comparison': [

    'top10.com', 'capterra.com', 'g2.com', 'getapp.com', 'trustradius.com', 'comparitech.com'

  ]

};



function normalizeHost(urlOrHost) {

  try {

    const url = urlOrHost.includes('://') ? new URL(urlOrHost) : new URL(`https://${urlOrHost}`);

    return url.hostname.replace(/^www\./, '').toLowerCase();

  } catch { return String(urlOrHost || '').replace(/^www\./, '').toLowerCase(); }

}



function classifyDomain(host) {

  const h = normalizeHost(host);

  const containsAny = (list) => list.some(d => h.includes(d));

  if (containsAny(SOURCE_CATEGORIES_DOMAIN_LIST['Blogs / Guides'])) return 'Blogs / Guides';

  if (containsAny(SOURCE_CATEGORIES_DOMAIN_LIST['Review Sites / Forums'])) return 'Review Sites / Forums';

  if (containsAny(SOURCE_CATEGORIES_DOMAIN_LIST['Marketplaces'])) return 'Marketplaces';

  if (containsAny(SOURCE_CATEGORIES_DOMAIN_LIST['News / PR Mentions'])) return 'News / PR Mentions';

  if (containsAny(SOURCE_CATEGORIES_DOMAIN_LIST['Directories / Comparison'])) return 'Directories / Comparison';

  return null;

}



function extractUrls(text) {

  try {

    const t = String(text || '');

    const rx = /(https?:\/\/[^\s)]+)|(\b[\w.-]+\.[a-z]{2,}\b)/gi;

    const found = new Set();

    let m;

    while ((m = rx.exec(t)) !== null) {

      const raw = m[0];

      // Skip if looks like a sentence ending with dot and no TLD

      if (!raw) continue;

      try {

        const host = normalizeHost(raw);

        if (host && /[a-z]/i.test(host)) found.add(host);

      } catch {}

    }

    return Array.from(found);

  } catch { return []; }

}



function computeSourcesByToolFromTexts(breakdowns) {

  const result = {};

  const tools = ['gemini','chatgpt','perplexity','claude'];

  tools.forEach(tool => {

    const analysis = String(breakdowns?.[tool]?.analysis || '');

    const hosts = extractUrls(analysis);

    const counts = { 'Blogs / Guides': 0, 'Review Sites / Forums': 0, 'Marketplaces': 0, 'News / PR Mentions': 0, 'Directories / Comparison': 0 };

    const examples = [];

    hosts.forEach(h => {

      const cat = classifyDomain(h);

      if (cat) { counts[cat] += 1; examples.push({ domain: h, category: cat }); }

    });

    result[tool] = { counts, examples };

  });

  return result;

}



// --- Content Style classification (FAQ, List, Comparison, Recommendation, Editorial)

const CONTENT_STYLE_KEYWORDS = {

  List: ['top ', 'top-', 'best ', 'best-', 'list of', 'roundup', 'top 5', 'top five', 'top 10', 'ranking'],

  Comparison: [' vs ', 'versus', 'compare', 'comparison', 'compared to'],

  Recommendation: ['recommend', 'we suggest', 'try ', 'good for', 'ideal for', 'if you want', 'alternative', 'pick'],

  FAQ: ['where can i', 'how do i', 'faq', 'q:', 'where to buy', 'is it safe', 'can i', 'best place to buy'],

  Editorial: ['according to', 'editorial', 'news', 'press', 'reported', 'magazine', 'forbes', 'allure', 'techcrunch']

};

function computeContentStyleCountsFromText(text) {

  try {

    const blob = String(text || '').toLowerCase();

    const counts = { List: 0, Comparison: 0, Recommendation: 0, FAQ: 0, Editorial: 0 };

    Object.keys(CONTENT_STYLE_KEYWORDS).forEach(k => {

      const kws = CONTENT_STYLE_KEYWORDS[k] || [];

      let v = 0; kws.forEach(w => { if (blob.includes(w)) v += 1; });

      counts[k] = v;

    });

    return counts;

  } catch { return { List: 0, Comparison: 0, Recommendation: 0, FAQ: 0, Editorial: 0 }; }

}

function mergeStyleCounts(a, b) {

  const out = { List: 0, Comparison: 0, Recommendation: 0, FAQ: 0, Editorial: 0 };

  Object.keys(out).forEach(k => { out[k] = (a?.[k] || 0) + (b?.[k] || 0); });

  return out;

}



// --- Product Attribute Mentions (backend) ---

const ATTRIBUTE_SYNONYMS = {

  Luxury: ['luxury','premium','high-end','curated'],

  Affordable: ['affordable','budget','low-cost','cheap','value','deal','discount'],

  'Cheap Deals': ['cheap deals','best deal','discount','low price','bargain','sale'],

  'Fast Shipping': ['fast shipping','same-day','next-day','prime delivery','quick delivery'],

  Organic: ['organic','clean beauty','natural'],

  Sustainable: ['sustainable','eco-friendly','green','recyclable'],

  Minimalist: ['minimalist','simple ingredients','minimal ingredients'],

  Variety: ['variety','wide selection','assortment','many options']

};

function computeAttributeCountsFromText(text, competitorName) {

  try {

    const out = {};

    Object.keys(ATTRIBUTE_SYNONYMS).forEach(k => (out[k] = 0));

    const t = String(text || '').toLowerCase();

    if (!t) return out;

    const name = String(competitorName || '').toLowerCase();

    const hasName = !!name && t.includes(name);

    Object.entries(ATTRIBUTE_SYNONYMS).forEach(([attr, syns]) => {

      let count = 0;

      syns.forEach(s => {

        const rx = new RegExp(`(?:^|[^a-z0-9])${s.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}(?:[^a-z0-9]|$)`, 'gi');

        const m = t.match(rx);

        count += m ? m.length : 0;

      });

      if (hasName && count > 0) out[attr] += count;

    });

    return out;

  } catch { return {}; }

}

function mergeAttributeCounts(a, b) {

  const out = {};

  Object.keys(ATTRIBUTE_SYNONYMS).forEach(k => { out[k] = (a?.[k] || 0) + (b?.[k] || 0); });

  return out;

}



// --- Sentiment helpers (backend) ---

const SENTIMENT_POS_WORDS = ['trusted','reliable','affordable','great','excellent','fast','love','best','top','high quality','recommend'];

const SENTIMENT_NEG_WORDS = ['expensive','slow','overwhelming','poor','bad','negative','issue','problem','weak','concern','not recommended'];

const ATTR_CONTEXT_MAP = {

  Trust: ['trust','trusted','authority','credible','reliable'],

  Price: ['price','affordable','cheap','expensive','deal','value','budget'],

  Delivery: ['delivery','shipping','fast','slow','prime','same-day','next-day'],

  Sustainability: ['sustainable','organic','eco','green','environment'],

  UX: ['ux','experience','overwhelming','easy','hard','simple']

};

function detectToneFromText(text) {

  const t = String(text || '').toLowerCase();

  let pos = 0, neg = 0;

  SENTIMENT_POS_WORDS.forEach(w => { if (t.includes(w)) pos += 1; });

  SENTIMENT_NEG_WORDS.forEach(w => { if (t.includes(w)) neg += 1; });

  if (pos > 0 && neg === 0) return 'Positive';

  if (neg > 0 && pos === 0) return 'Negative';

  if (pos > 0 && neg > 0) return 'Mixed';

  return 'Neutral';

}

function detectAttributeFromText(text) {

  const t = String(text || '').toLowerCase();

  let best = 'General'; let max = 0;

  Object.keys(ATTR_CONTEXT_MAP).forEach(key => {

    const kws = ATTR_CONTEXT_MAP[key];

    let hits = 0; kws.forEach(k => { if (t.includes(k)) hits += 1; });

    if (hits > max) { max = hits; best = key; }

  });

  return best;

}

function extractSnippetAroundName(text, name, window = 140) {

  try {

    const t = String(text || '');

    const n = String(name || '');

    const idx = t.toLowerCase().indexOf(n.toLowerCase());

    if (idx >= 0) {

      const start = Math.max(0, idx - Math.floor(window/2));

      const end = Math.min(t.length, idx + n.length + Math.floor(window/2));

      return t.slice(start, end).replace(/\s+/g, ' ').trim();

    }

    const m = t.match(/[^.!?]*[.!?]/);

    return (m ? m[0] : t).slice(0, window).trim();

  } catch { return String(text || '').slice(0, window); }

}

function extractSentenceWithName(text, name) {

  try {

    const t = String(text || '').replace(/\s+/g, ' ').trim();

    const n = String(name || '');

    if (!t) return '';

    const parts = t.split(/(?<=[.!?])\s+/);

    const ci = n.toLowerCase();

    for (const s of parts) {

      if (s.toLowerCase().includes(ci)) return s.trim().slice(0, 280);

    }

    return extractSnippetAroundName(t, n, 160);

  } catch { return String(text || '').slice(0, 160); }

}

function extractQuotedSentenceWithName(text, name) {

  try {

    const n = String(name || '').toLowerCase();

    const t = String(text || '');

    const quoteRegex = /"([^"]{3,280})"|'([^']{3,280})'/g;

    let match;

    while ((match = quoteRegex.exec(t)) !== null) {

      const seg = (match[1] || match[2] || '').trim();

      if (seg && seg.toLowerCase().includes(n)) return seg;

    }

    return '';

  } catch { return ''; }

}

function isNonInformativeSentimentText(text) {

  const t = String(text || '').toLowerCase();

  return /please\s+provide\s+the\s+\[?product\]?|need\s+the\s+product\s+name|what\s+specific\s+product/i.test(t);

}

function classifySourceCategoryFromText(text) {

  const hosts = extractUrls(text);

  for (const h of hosts) {

    const cat = classifyDomain(h);

    if (cat) return cat;

  }

  const t = String(text || '').toLowerCase();

  if (/reddit|quora|forum|community|trustpilot/.test(t)) return 'Review Sites / Forums';

  if (/forbes|bloomberg|wsj|nytimes|guardian|techcrunch|press|editorial/.test(t)) return 'News / PR Mentions';

  if (/amazon|etsy|ebay|walmart|flipkart|aliexpress/.test(t)) return 'Marketplaces';

  if (/blog|guide|buyers guide|how to|list of/.test(t)) return 'Blogs / Guides';

  return '—';

}



// --- Shopping Visibility (Transactional Mentions) ---

function getTransactionalPromptBank(product = '', country = '') {

  const loc = country ? ` in ${country}` : '';

  const p = product || '[product]';

  return [

    `Best website to buy ${p} online${loc}`,

    `Top ${p} ecommerce stores${loc}`,

    `Trusted online stores for ${p}${loc}`,

    `Affordable ${p} retailers online${loc}`,

    `Where can I buy high-quality ${p} with warranty${loc}?`

  ];

}



function textIncludesNear(text, term, keywords) {

  try {

    const lower = String(text || '').toLowerCase();

    const t = String(term || '').toLowerCase();

    const idx = lower.indexOf(t);

    if (idx < 0) return false;

    const window = lower.slice(Math.max(0, idx - 60), Math.min(lower.length, idx + t.length + 60));

    return keywords.some(k => window.includes(k));

  } catch { return false; }

}



async function computeShoppingVisibilityCounts(competitorNames, product, country) {

  console.log('\n🛍️ [computeShoppingVisibilityCounts] Starting transactional mentions calculation...');

  console.log(`   Competitors: ${competitorNames.join(', ')}`);

  console.log(`   Product: ${product || '(none)'}`);

  console.log(`   Country: ${country || '(none)'}`);

  console.log(`   Full analysis mode enabled`);



  const queries = getTransactionalPromptBank(product, country);

  console.log(`   Queries to process: ${queries.length}`);

  queries.forEach((q, i) => console.log(`     Q${i + 1}: ${q}`));



  const modelKeys = getConfiguredModelKeys();

  console.log(`   Configured models: ${modelKeys.join(', ')}`);

  if (modelKeys.length === 0) {

    console.log('❌ [computeShoppingVisibilityCounts] No models configured - returning empty result');

    return { countsByCompetitor: {}, queries };

  }



  const counts = {};

  modelKeys.forEach(m => { counts[m] = Object.fromEntries(competitorNames.map(n => [n, 0])); });



  const aliasMap = Object.fromEntries(competitorNames.map(n => [n, buildAliases(n)]));

  const listVendors = competitorNames.join(', ');

  const transactionalKeywords = ['buy','purchase','order','shop','store','checkout','cart','pricing','price','deal','discount','sold at','retailer','best place to buy'];



  const promptFor = (q) => `For the topic: "${q}", consider these vendors: ${listVendors}. Mention the vendors that are commonly recommended as a place to buy. Mention vendor names directly.`;



  console.log('\n🚀 [computeShoppingVisibilityCounts] Creating parallel LLM calls...');

  const allCalls = [];

  modelKeys.forEach(m => {

    queries.forEach((q, i) => {

      allCalls.push({ model: m, query: q, queryIndex: i, prompt: promptFor(q) });

    });

  });

  console.log(`   Total parallel calls: ${allCalls.length} (${modelKeys.length} models × ${queries.length} queries)`);



  const responses = await Promise.all(allCalls.map(async (call) => {

    try {

      console.log(`   📞 [${call.model}] Q${call.queryIndex + 1}: "${call.query}"`);

      const text = await withTimeout(callModelSimple(call.model, call.prompt), 12000, '').catch(() => '');

      const ok = !!(text && String(text).trim());

      console.log(`   ✅ [${call.model}] Q${call.queryIndex + 1}: ${ok ? (String(text).length + ' chars') : 'empty'}`);

      return { model: call.model, queryIndex: call.queryIndex, text: text || '', success: ok };

    } catch {

      console.log(`   ❌ [${call.model}] Q${call.queryIndex + 1}: error`);

      return { model: call.model, queryIndex: call.queryIndex, text: '', success: false };

    }

  }));



  const processed = await Promise.all(responses.map(async (r) => {

    if (!r.success) return r;

    const t = String(r.text || '');

    const lower = t.toLowerCase();

    const mentions = [];

    competitorNames.forEach(name => {

      const aliases = aliasMap[name] || [name];

      const mentioned = aliases.some(a => textIncludesNear(lower, a, transactionalKeywords));

      if (mentioned) mentions.push(name);

    });

    console.log(`   🔎 [${r.model}] Q${r.queryIndex + 1}: Mentions → ${mentions.length ? mentions.join(', ') : 'none'}`);

    return { ...r, mentions };

  }));



  processed.forEach(res => {

    if (!res.success) return;

    const m = res.model;

    (res.mentions || []).forEach(name => { counts[m][name] += 1; });

  });



  const countsByCompetitor = {};

  competitorNames.forEach(name => {

    const byModel = {};

    let total = 0;

    modelKeys.forEach(m => { byModel[m] = counts[m][name] || 0; total += byModel[m]; });

    countsByCompetitor[name] = { total, byModel };

  });



  console.log('\n📊 [computeShoppingVisibilityCounts] Final counts:');

  Object.keys(countsByCompetitor).forEach(k => {

    const row = countsByCompetitor[k];

    const byM = modelKeys.map(m => `${m}:${row.byModel[m] || 0}`).join(', ');

    console.log(`   ${k}: total=${row.total} | ${byM}`);

  });

  console.log('✅ [computeShoppingVisibilityCounts] Completed');

  return { countsByCompetitor, queries };

}



// Determine placement order (1st/2nd/3rd+) for competitors found in text

function rankCompetitorsInText(text, competitorNames, aliasMap) {

  try {

    const t = String(text || '');

    const lower = t.toLowerCase();

    // Prefer explicit numbered lists like "1. Name", "2) Name"

    const lines = t.split(/\n+/);

    const ranked = [];

    const seen = new Set();

    for (let i = 0; i < Math.min(lines.length, 50); i++) {

      const line = lines[i];

      const m = line.match(/^\s*(\d+)[)\.]?\s+(.+)$/);

      if (!m) continue;

      const content = m[2] || '';

      for (const name of competitorNames) {

        if (!name || seen.has(name)) continue;

        const aliases = aliasMap[name] || [name];

        if (aliases.some(a => wordBoundaryRegex(a).test(content))) {

          ranked.push(name);

          seen.add(name);

        }

      }

      if (ranked.length >= 3) break;

    }

    if (ranked.length >= 2) return ranked;

    // Fallback to first-occurrence order

    const positions = competitorNames.map(name => {

      const aliases = aliasMap[name] || [name];

      let pos = Infinity;

      aliases.forEach(a => {

        const idx = lower.indexOf(String(a).toLowerCase());

        if (idx >= 0) pos = Math.min(pos, idx);

      });

      return { name, pos };

    }).filter(x => isFinite(x.pos)).sort((a, b) => a.pos - b.pos);

    return positions.map(x => x.name);

  } catch {

    return [];

  }

}



async function computeCitationMetrics(competitorNames, industry, opts = {}) {

  console.log('\n🔍 [computeCitationMetrics] Starting citation metrics calculation...');

  console.log(`   Competitors: ${competitorNames.join(', ')}`);

  console.log(`   Industry: ${industry}`);

  console.log(`   Full analysis mode enabled`);

  
  
  const queries = getDefaultQueryPool(industry, opts.geo || null, opts.companyName || '', opts.product || '').slice(0, 12);

  console.log(`   Queries to process: ${queries.length} (${queries.join(', ')})`);

  
  
  const modelKeys = getConfiguredModelKeys();

  console.log(`   Configured models: ${modelKeys.join(', ')}`);

  
  
  if (modelKeys.length === 0) {

    console.log('❌ [computeCitationMetrics] No models configured - returning empty result');

    return {};

  }

  
  
  // Initialize aggregates

  const agg = {};

  competitorNames.forEach(c => {

    agg[c] = { perModel: {}, globalRaw: 0, globalMentions: 0 };

    modelKeys.forEach(m => { agg[c].perModel[m] = { raw: 0, mentions: 0, total: 0 }; });

  });



  const domainKeywords = ['cloud', 'migration', 'file', 'sharing', 'security', 'saas', 'platform', 'software', 'ai', 'storage'];

  console.log(`   Domain keywords: ${domainKeywords.join(', ')}`);



  // Create all LLM calls in parallel

  console.log('\n🚀 [computeCitationMetrics] Creating parallel LLM calls...');

  const allCalls = [];

  
  
  modelKeys.forEach(m => {

    queries.forEach((q, i) => {

      allCalls.push({

        model: m,

        query: q,

        queryIndex: i,

        prompt: `Answer briefly: ${q}`

      });

    });

  });

  
  
  console.log(`   Total parallel calls: ${allCalls.length} (${modelKeys.length} models × ${queries.length} queries)`);

  
  
  // Execute all calls in parallel

  const responses = await Promise.all(allCalls.map(async (call) => {

    try {

      console.log(`   📞 [${call.model}] Query ${call.queryIndex + 1}: "${call.query}"`);

      const text = await withTimeout(callModelSimple(call.model, call.prompt), 12000, '').catch(() => '');

      console.log(`   ✅ [${call.model}] Response: ${text ? text.length : 0} characters`);

      return {

        model: call.model,

        query: call.query,

        queryIndex: call.queryIndex,

        text: text || '',

        success: !!(text && String(text).trim())

      };

    } catch (error) {

      console.log(`   ❌ [${call.model}] Error: ${error.message}`);

      return {

        model: call.model,

        query: call.query,

        queryIndex: call.queryIndex,

        text: '',

        success: false

      };

    }

  }));

  
  
  console.log(`\n📊 [computeCitationMetrics] Processing ${responses.length} responses...`);

  
  
  // Process all responses in parallel

  const processingPromises = responses.map(async (response) => {

    if (!response.success) {

      console.log(`   ⚠️ Skipping failed response from ${response.model} for "${response.query}"`);

      return { model: response.model, queryIndex: response.queryIndex, mentions: [] };

    }

    
    
    const lower = String(response.text).toLowerCase();

    const mentions = [];

    
    
    for (const c of competitorNames) {

      try {

        const det = detectMentionRobust(lower, c, domainKeywords);

        if (!det.detected) { 

          continue; 

        }

        
        
        console.log(`     ✅ [${response.model}] Found mention of "${c}" (count: ${det.count})`);

        
        
        const s = quickSentimentScore(response.text);

        const sw = sentimentWeightFromScore(s);

        const pf = computeProminenceFactorFromText(response.text, c);

        const contrib = Math.min(1, det.count) * sw * pf;

        
        
        console.log(`       [${response.model}] Sentiment: ${s}, Weight: ${sw}, Prominence: ${pf}, Contribution: ${contrib}`);

        
        
        mentions.push({

          competitor: c,

          contribution: contrib,

          sentiment: s,

          weight: sw,

          prominence: pf

        });

      } catch (error) {

        console.log(`     ❌ [${response.model}] Error processing competitor "${c}": ${error.message}`);

      }

    }

    
    
    return { model: response.model, queryIndex: response.queryIndex, mentions };

  });

  
  
  const processedResults = await Promise.all(processingPromises);

  
  
  // Aggregate results

  console.log('\n📈 [computeCitationMetrics] Aggregating results...');

  processedResults.forEach(result => {

    const m = result.model;

    const queryIndex = result.queryIndex;

    
    
    // Count total queries for this model

    competitorNames.forEach(c => {

      agg[c].perModel[m].total += 1;

    });

    
    
    // Process mentions

    result.mentions.forEach(mention => {

      const c = mention.competitor;

      agg[c].perModel[m].raw += Math.min(1.0, mention.contribution);

      agg[c].perModel[m].mentions += 1;

      agg[c].globalRaw += Math.min(1.0, mention.contribution);

      agg[c].globalMentions += 1;

    });

    
    
    console.log(`   [${m}] Query ${queryIndex + 1}: ${result.mentions.length} mentions found`);

  });



  // Finalize metrics

  console.log('\n📊 [computeCitationMetrics] Finalizing metrics...');

  const result = {};

  competitorNames.forEach(c => {

    console.log(`\n   Processing competitor: ${c}`);

    const perModel = {};

    let sumTotals = 0;

    let sumRaw = 0;

    let sumMentions = 0;

    const usedModels = modelKeys.filter(m => (agg[c].perModel[m].total || 0) > 0);

    console.log(`     Used models: ${usedModels.join(', ')}`);

    
    
    usedModels.forEach(m => {

      const pm = agg[c].perModel[m];

      const total = pm.total;

      const citationScore = total > 0 ? (pm.raw / total) : 0;

      const citationRate = total > 0 ? (pm.mentions / total) : 0;

      
      
      console.log(`     ${m}: Total=${total}, Mentions=${pm.mentions}, Raw=${pm.raw.toFixed(3)}, Score=${citationScore.toFixed(3)}, Rate=${citationRate.toFixed(3)}`);

      
      
      perModel[m] = {

        citationCount: pm.mentions,

        totalQueries: pm.total,

        citationRate,

        rawCitationScore: pm.raw,

        citationScore

      };

      sumTotals += pm.total;

      sumRaw += pm.raw;

      sumMentions += pm.mentions;

    });

    
    
    // Equal-weighted per-model average (S^(eq))

    const equalWeighted = usedModels.length > 0

      ? usedModels.reduce((s, m) => s + (perModel[m].citationScore || 0), 0) / usedModels.length

      : 0;



    // Volume-weighted global score (S^(global))

    const globalCitationScore = sumTotals > 0 ? (sumRaw / sumTotals) : 0;

    const globalCitationRate = sumTotals > 0 ? (sumMentions / sumTotals) : 0;



    // Laplace-smoothed citation rate per global counts (alpha = 1)

    const alpha = 1;

    const smoothedRate = (sumMentions + alpha) / (sumTotals + 2 * alpha);



    // Display scores on 0–100 scale

    const displayScore_volume = Math.max(0, Math.min(100, globalCitationScore * 100));

    const displayScore_equal = Math.max(0, Math.min(100, equalWeighted * 100));



    // Confidence proxy based on mentions count vs threshold

    const minQueriesThreshold = 50;

    const confidence = Math.min(1, (sumMentions || 0) / minQueriesThreshold);



    console.log(`     Global totals: Total=${sumTotals}, Mentions=${sumMentions}, Raw=${sumRaw.toFixed(3)}`);

    console.log(`     Global scores: S_volume=${globalCitationScore.toFixed(3)}, S_equal=${equalWeighted.toFixed(3)}, Rate=${globalCitationRate.toFixed(3)} (smoothed ${smoothedRate.toFixed(3)})`);

    
    
    result[c] = {

      perModel,

      global: {

        citationCount: sumMentions,

        totalQueries: sumTotals,

        citationRate: globalCitationRate,

        citationRate_smoothed: smoothedRate,

        rawCitationScore: sumRaw,

        citationScore: globalCitationScore,

        equalWeightedGlobal: equalWeighted,

        score_volume_weighted: globalCitationScore,

        score_equal_weighted: equalWeighted,

        displayScore_volume: displayScore_volume,

        displayScore_equal: displayScore_equal,

        mentions_total: sumMentions,

        queries_total: sumTotals,

        confidence,

        models_available: usedModels

      }

    };

  });

  
  
  console.log('\n✅ [computeCitationMetrics] Final result summary:');

  Object.keys(result).forEach(competitor => {

    const data = result[competitor];

    console.log(`   ${competitor}: Global Citation Score = ${(data.global.citationScore * 100).toFixed(1)}%`);

  });

  
  
  return result;

}



// --- Audience & Demographics Helpers (GEO) ---

// Collect relevant text snippets for a competitor using Google CSE

async function collectAudienceSnippets(competitorName) {

  try {

    const queries = [

      `${competitorName} about us`,

      `${competitorName} solutions`,

      `${competitorName} platform`,

      `${competitorName} customers`,

      `${competitorName} press`,

      `${competitorName} who we serve`,

      `${competitorName} target audience`

    ];

    const results = await Promise.all(

      queries.map(q => queryCustomSearchAPI(q).catch(() => []))

    );

    const flattened = results.flat();

    const snippets = flattened

      .map(item => String(item?.snippet || ''))

      .filter(s => s && s.trim().length > 0)

      .slice(0, 25); // cap

    return snippets;

  } catch {

    return [];

  }

}



function normalizeRegion(labelRaw = '') {

  const l = String(labelRaw).toLowerCase();

  if (/(north\s*america|usa|u\.s\.|united\s*states|canada|us\b)/i.test(l)) return 'North America';

  if (/(europe|eu\b|uk\b|united\s*kingdom|germany|france|italy|spain|netherlands|nordics)/i.test(l)) return 'Europe';

  if (/(apac|asia\s*pacific|asia|australia|new\s*zealand|india|japan|singapore|korea)/i.test(l)) return 'APAC';

  if (/(latin\s*america|latam|brazil|mexico|argentina|chile|colombia)/i.test(l)) return 'LATAM';

  if (/(middle\s*east|mena|saudi|uae|qatar|egypt)/i.test(l)) return 'Middle East';

  if (/(africa|south\s*africa|nigeria|kenya)/i.test(l)) return 'Africa';

  if (/(global|worldwide|international)/i.test(l)) return 'Global';

  return labelRaw || '';

}



function normalizeCompanySize(labelRaw = '') {

  const l = String(labelRaw).toLowerCase();

  if (/(smb|small\s*business|startups?|small\s*&?\s*medium|mid\s*-?market)/i.test(l)) return 'SMB';

  if (/(enterprise|large\s*enterprise|fortune\s*500|global\s*enterprise|large\s*organizations?)/i.test(l)) return 'Enterprise';

  if (/(mid\s*-?market|midsize|medium\s*business)/i.test(l)) return 'Mid-Market';

  return labelRaw || '';

}



function normalizeIndustryFocus(labelRaw = '') {

  const l = String(labelRaw).toLowerCase();

  if (/health|medic|pharma|biotech|care/.test(l)) return 'Healthcare';

  if (/fintech|bank|finance|payment|insur/.test(l)) return 'Financial Services';

  if (/retail|e-?commerce|commerce|marketplace/.test(l)) return 'Retail & E-commerce';

  if (/cloud|devops|kubernetes|saas|platform|api/.test(l)) return 'Cloud & SaaS';

  if (/security|cyber|threat|protections?/.test(l)) return 'Cybersecurity';

  if (/education|edtech|university|school|learning/.test(l)) return 'Education';

  if (/manufactur|industrial|logistics|supply/.test(l)) return 'Manufacturing & Logistics';

  return labelRaw || '';

}



function normalizeAudienceLabels(labels = []) {

  const norm = [];

  const pushUnique = (label) => {

    if (!label) return;

    if (!norm.includes(label)) norm.push(label);

  };

  (labels || []).forEach(raw => {

    const l = String(raw || '').toLowerCase();

    if (/developer|devops|engineer/.test(l)) return pushUnique('Developers');

    if (/it\s*(teams?|managers?|leaders?)/.test(l)) return pushUnique('Enterprise IT');

    if (/security|secops|ciso/.test(l)) return pushUnique('Security Teams');

    if (/data|analytics|ml|ai\s*teams?/.test(l)) return pushUnique('Data & AI Teams');

    if (/marketing|growth|demand/.test(l)) return pushUnique('Marketing Teams');

    if (/sales|revops|revenue/.test(l)) return pushUnique('Sales Teams');

    if (/end-?users?|consumers?/.test(l)) return pushUnique('End Users');

    if (/smb|small\s*business|startups?/.test(l)) return pushUnique('SMB Buyers');

    if (/enterprise/.test(l)) return pushUnique('Enterprise Buyers');

    // fallback: Title Case

    pushUnique(String(raw || '').replace(/\s+/g, ' ').trim());

  });

  return norm;

}



function computeConfidenceForLabel(label, snippets, synonyms = []) {

  const total = Math.max(1, snippets.length);

  const needles = [String(label || '').toLowerCase(), ...synonyms.map(s => String(s).toLowerCase())].filter(Boolean);

  let supporting = 0;

  const lowers = snippets.map(s => String(s || '').toLowerCase());

  lowers.forEach(s => {

    if (needles.some(n => n && s.includes(n))) supporting++;

  });

  return Number((supporting / total).toFixed(2));

}



async function extractAudienceProfileWithGemini(competitorName, snippets) {

  if (!GEMINI_API_KEY) return null;

  try {

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

     const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const prompt = `From the following text snippets about ${competitorName}, extract the target audience (roles, industries, B2B/B2C) and demographics (region, company size, industry focus).\nReturn ONLY JSON with keys: audience[], demographics { region, companySize, industryFocus }.\nSnippets:\n${snippets.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nExample JSON:\n{\n  "audience": ["Enterprise IT", "Developers"],\n  "demographics": {"region": "North America", "companySize": "SMB", "industryFocus": "Healthcare"}\n}`;

    const result = await model.generateContent(prompt);

    let text = result.response.candidates[0]?.content?.parts?.[0]?.text || '';

    text = text.trim().replace(/```json\s*|```/g, '');

    const jsonMatch = text.match(/\{[\s\S]*\}/);

    const raw = jsonMatch ? jsonMatch[0] : text;

    const parsed = JSON.parse(raw);

    return parsed;

  } catch (e) {

    return null;

  }

}



async function getAudienceProfile(competitorName) {

  try {

    const snippets = await collectAudienceSnippets(competitorName);

    const extracted = await extractAudienceProfileWithGemini(competitorName, snippets);

    if (!extracted) return null;



    // Normalize fields

    const normAudience = normalizeAudienceLabels(extracted.audience || []);

    const regionLabel = normalizeRegion(extracted?.demographics?.region || '');

    const companySizeLabel = normalizeCompanySize(extracted?.demographics?.companySize || '');

    const industryFocusLabel = normalizeIndustryFocus(extracted?.demographics?.industryFocus || '');



    // Confidence scoring

    const audienceWithConfidence = normAudience.map(label => ({

      label,

      confidence: computeConfidenceForLabel(label, snippets)

    }));



    const regionConfidence = computeConfidenceForLabel(regionLabel, snippets, [

      regionLabel,

      ...(regionLabel === 'North America' ? ['usa', 'united states', 'canada', 'north america'] : []),

      ...(regionLabel === 'Europe' ? ['europe', 'eu', 'uk', 'united kingdom'] : []),

      ...(regionLabel === 'APAC' ? ['apac', 'asia pacific', 'asia', 'australia', 'india', 'japan'] : []),

      ...(regionLabel === 'LATAM' ? ['latam', 'latin america', 'brazil', 'mexico'] : []),

      ...(regionLabel === 'Middle East' ? ['middle east', 'mena', 'uae', 'saudi'] : []),

      ...(regionLabel === 'Africa' ? ['africa', 'south africa', 'nigeria', 'kenya'] : []),

      ...(regionLabel === 'Global' ? ['global', 'worldwide', 'international'] : [])

    ]);



    const sizeConfidence = computeConfidenceForLabel(companySizeLabel, snippets, [

      companySizeLabel,

      ...(companySizeLabel === 'SMB' ? ['smb', 'small business', 'startup', 'mid-market'] : []),

      ...(companySizeLabel === 'Enterprise' ? ['enterprise', 'large enterprise', 'fortune 500'] : []),

      ...(companySizeLabel === 'Mid-Market' ? ['mid-market', 'midsize', 'medium business'] : [])

    ]);



    const industryConfidence = computeConfidenceForLabel(industryFocusLabel, snippets, [industryFocusLabel]);



    return {

      audience: audienceWithConfidence,

      demographics: {

        region: { label: regionLabel, confidence: regionConfidence },

        companySize: { label: companySizeLabel, confidence: sizeConfidence },

        industryFocus: { label: industryFocusLabel, confidence: industryConfidence }

      }

    };

  } catch {

    return null;

  }

}



// Automatic industry and product detection functions

async function detectIndustryAndProduct(companyName) {

  console.log(`🔍 Detecting industry and product for: ${companyName}`);

  
  
  try {

    // Use Google search to find company information

    const searchQueries = [

      `${companyName} company profile`,

      `${companyName} what do they do`,

      `${companyName} industry sector`,

      `${companyName} products services`

    ];

    
    
    let allSearchResults = [];

    
    
    for (const query of searchQueries) {

      try {

        const results = await queryCustomSearchAPI(query);

        allSearchResults = allSearchResults.concat(results);

      } catch (error) {

        console.log(`   ⚠️ Search failed for: ${query}`);

      }

    }

    
    
    if (allSearchResults.length === 0) {

      console.log(`   ⚠️ No search results found for ${companyName}`);

      return { industry: '', product: '' };

    }

    
    
    // Use AI to analyze search results and extract industry/product

    const analysisPrompt = `Analyze these search results about "${companyName}" and determine:

1. The primary industry/sector this company operates in (be specific: e.g., "ecommerce", "retail", "fashion", "technology", "healthcare", "finance", etc.)

2. The main products/services they offer (be specific about their core offerings)

3. The target market/customers they serve

4. The business model they use (B2B, B2C, marketplace, SaaS, etc.)



Search results:

${allSearchResults.map(item => `${item.name}: ${item.snippet}`).join('\n\n')}



Return ONLY a JSON object with this format:

{

  "industry": "the primary industry (be specific)",

  "product": "the main product or service",

  "targetMarket": "primary target customers",

  "businessModel": "B2B/B2C/marketplace/SaaS/etc"

}`;

    
    
    if (GEMINI_API_KEY) {

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

       const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
      
      

      const result = await model.generateContent(analysisPrompt);

      const response = result.response.candidates[0]?.content?.parts[0]?.text || '';

      
      
      try {

        // Clean the response to remove markdown formatting

        let cleanedResponse = response.trim();

        cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*$/g, '');

        cleanedResponse = cleanedResponse.replace(/```\s*/g, '');

        
        
        const jsonMatch = cleanedResponse.match(/\{.*\}/s);

        if (jsonMatch) {

          cleanedResponse = jsonMatch[0];

        }

        
        
        const analysis = JSON.parse(cleanedResponse);

        console.log(`   ✅ Detected industry: ${analysis.industry}`);

        console.log(`   ✅ Detected product: ${analysis.product}`);

        return analysis;

      } catch (error) {

        console.error('   ❌ Failed to parse AI analysis:', error.message);

        return { industry: '', product: '' };

      }

    } else {

      console.log(`   ⚠️ No Gemini API key, using fallback detection`);

      return { industry: '', product: '' };

    }
    
    

  } catch (error) {

    console.error(`❌ Industry/product detection error:`, error.message);

    return { industry: '', product: '' };

  }

}



// Lightweight product inference by known-brand heuristics

function inferProductFromCompanyName(companyName) {

  const name = String(companyName || '').toLowerCase();

  const clothingBrands = ['zara','h&m','hm','uniqlo','mango','bershka','massimo dutti','the gap','gap','asos','shein','forever 21','primark','pull & bear','pull and bear','fashion nova'];

  const pharmacyBrands = ['apollo','apollo pharmacy','walgreens','cvs','rite aid','boots','guardian pharmacy'];

  const beautyRetail = ['sephora','ulta','nykaa','dermstore'];

  const marketplaces = ['amazon','walmart','etsy','ebay','flipkart','aliexpress'];

  if (clothingBrands.some(b => name.includes(b))) return 'clothing';

  if (pharmacyBrands.some(b => name.includes(b))) return 'medicines';

  if (beautyRetail.some(b => name.includes(b))) return 'beauty products';

  if (marketplaces.some(b => name.includes(b))) return 'consumer goods';

  return '';

}



// Detect product only (fast prompt on search results)

async function detectProductOnly(companyName) {

  try {

    const queries = [

      `${companyName} main products`,

      `${companyName} what do they sell`,

      `${companyName} category`

    ];

    let results = [];

    for (const q of queries) {

      const r = await queryCustomSearchAPI(q).catch(() => []);

      results = results.concat(r);

      if (results.length >= 5) break;

    }

    if (results.length === 0) return { product: '' };

    const prompt = `From these snippets, infer the PRIMARY product category this company sells.

Company: ${companyName}

Snippets:\n${results.map(x => `- ${x.snippet}`).join('\n')}

Return ONLY JSON: { "product": "..." }`;

    if (GEMINI_API_KEY) {

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

       const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

       const out = await withTimeout(

         model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }]}] }),

         8000,

         { response: { candidates: [] } }

       );

      const text = out.response.candidates[0]?.content?.parts[0]?.text || '';

      try {

        const clean = text.replace(/```json\s*/g,'').replace(/```/g,'').trim();

        const m = clean.match(/\{[\s\S]*\}/);

        const obj = JSON.parse(m ? m[0] : clean);

        return { product: obj.product || '' };

      } catch { return { product: '' }; }

    }

    return { product: inferProductFromCompanyName(companyName) };

  } catch { return { product: '' }; }

}



// Enhanced prompt generation with automatic detection

function getEnhancedPrompts(company, industry = '', product = '') {

  const industryContext = industry || '[industry]';

  const productContext = product || '[product/service]';

  
  
  return {

    chatgpt: [

      `Analyze the market visibility and competitive positioning of "${company}" in the ${industryContext} industry. Focus on their brand recognition, market share, and how they compare to other leading companies in this space.`,

      `What are the key strengths and competitive advantages of "${company}" in the ${industryContext} market? How do they differentiate themselves from competitors?`,

      `Evaluate "${company}"'s presence and performance in ${industryContext}. What is their current market position and how visible are they compared to industry leaders?`,

      `How does "${company}" leverage technology and innovation in the ${industryContext} sector? What makes them stand out in this competitive landscape?`

    ],

    gemini: [

      `Conduct a comprehensive analysis of "${company}"'s market visibility in the ${industryContext} industry. Assess their brand recognition, competitive positioning, and market presence compared to other companies in this sector.`,

      `What are the primary products and services offered by "${company}" in the ${industryContext} market? How do these offerings compare to competitors?`,

      `Analyze "${company}"'s competitive landscape in ${industryContext}. Who are their main competitors and how does "${company}" position itself against them?`,

      `Evaluate "${company}"'s market performance and visibility in the ${industryContext} sector. What factors contribute to their success or challenges in this market?`

    ],

    perplexity: [

      `Analyze the brand and market visibility of "${company}" in ${industryContext}. Write a comprehensive narrative analysis that repeatedly references the exact company name "${company}" throughout the text. Include their position versus competitors, sentiment indicators, market share, recent developments, and notable strengths or gaps. Ensure the company name "${company}" appears naturally multiple times (at least 8) in the explanation.`,

      `Provide a detailed competitor visibility comparison centered on "${company}" in ${industryContext}. Explicitly mention "${company}" many times while discussing mentions, positioning, market references, competitive advantages, and industry recognition. Keep the tone analytical and informative while highlighting "${company}"'s unique value proposition.`,

      `Summarize how "${company}" is perceived in the ${industryContext} market, including brand mentions, relative positioning, customer sentiment, market trends, and competitive analysis. Make sure to include the exact string "${company}" frequently across the response so the narrative clearly ties every point back to "${company}" and their market position.`

    ],

    claude: [

      `Provide a deep analysis of "${company}"'s competitive positioning in the ${industryContext} industry. Focus on their market visibility, brand strength, and how they compare to industry leaders.`,

      `What are the key market dynamics affecting "${company}" in the ${industryContext} sector? How do they navigate competitive challenges and opportunities?`,

      `Analyze "${company}"'s strategic positioning in ${industryContext}. What are their core competencies and how do they differentiate from competitors?`,

      `Evaluate "${company}"'s market presence and performance in the ${industryContext} industry. What factors drive their success and what challenges do they face?`

    ]

  };

}



// Google Custom Search API with retry logic

async function queryCustomSearchAPI(query) {

  const maxRetries = 3;

  const baseDelay = 2000;

  
  
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {

    throw new Error('Google API credentials not configured');

  }

  
  
  console.log(`   🔍 Google Search: "${query}"`);

  
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {

    try {

      console.log(`   📡 Google Search attempt ${attempt}/${maxRetries}...`);

      const response = await axios.get(

        `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}`

      );

      
      
      // Check if response has items

      if (!response.data || !response.data.items) {

        console.log(`   ⚠️ Google Search returned no results for: "${query}"`);

        return [];

      }

      
      
      const results = response.data.items.map(item => ({

        name: item.title,

        link: item.link,

        snippet: item.snippet

      }));

      console.log(`   ✅ Google Search successful: ${results.length} results`);

      return results;

    } catch (error) {

      if (error?.response?.status === 429) {

        const delay = baseDelay * Math.pow(2, attempt - 1);

        console.log(`   ⏳ Rate limited, waiting ${delay}ms before retry...`);

        await new Promise(resolve => setTimeout(resolve, delay));

        continue;

      }

      if (attempt === maxRetries) {

        console.error(`   ❌ Google Search failed after ${maxRetries} attempts:`, error.message);

        // Return empty array instead of throwing error

        console.log(`   ⚠️ Returning empty results for: "${query}"`);

        return [];

      }

      console.log(`   ⏳ Google Search attempt ${attempt} failed, retrying...`);

      await new Promise(resolve => setTimeout(resolve, baseDelay));

    }

  }

  
  
  // If we get here, return empty array

  console.log(`   ⚠️ Returning empty results for: "${query}"`);

  return [];

}



// Industry news search method with parallel queries

async function searchIndustryNewsCompetitors(companyName) {

  try {

    console.log(`   📰 Method 1: Industry news search for "${companyName}"`);

    
    
    // Industry-specific search queries for unique competitor discovery

    const searchQueries = [

      `"${companyName}" competitors direct rivals market analysis`,

      `"${companyName}" vs competitors comparison 2024`,

      `companies competing with "${companyName}" industry news`,

      `"${companyName}" alternative brands similar companies market`,

      `"${companyName}" market competitors business rivals analysis`,

      `"${companyName}" competitive landscape industry report`,

      `"${companyName}" top competitors market share 2024`,

      `"${companyName}" direct competition business rivals news`,

      `"${companyName}" industry competitors emerging brands`,

      `"${companyName}" market rivals competitive analysis`

    ];

    
    
    console.log(`   🚀 Running ${searchQueries.length} industry news queries in parallel...`);

    
    
    // Run all queries truly in parallel without delays

    const queryPromises = searchQueries.map(async (query, index) => {

      try {

        console.log(`   🔍 Industry news query ${index + 1}: "${query}"`);

        
        
        const searchResults = await queryCustomSearchAPI(query);

        console.log(`   📄 Found ${searchResults.length} results for query ${index + 1}`);

        return searchResults;

      } catch (error) {

        console.error(`   ❌ Industry news query ${index + 1} failed:`, error.message);

        return [];

      }

    });

    
    
    // Wait for all queries to complete

    const allSearchResults = await Promise.all(queryPromises);

    
    
    // Flatten results

    const flattenedResults = allSearchResults.flat();

    console.log(`   📊 Total industry news results: ${flattenedResults.length}`);

    
    
    const competitors = await extractCompetitorNames(companyName, flattenedResults);

    console.log(`   🎯 Extracted ${competitors.length} competitors from industry news:`, competitors);

    return competitors;

  } catch (error) {

    console.error('❌ Industry news search error:', error.message);

    return [];

  }

}



// Public company database search method with parallel queries

async function searchPublicCompanyDatabase(companyName) {

  try {

    console.log(`   🏢 Method 2: Public company database search for "${companyName}"`);

    
    
    // Multiple public database search queries - more specific for actual competitors

    const searchQueries = [

      `"${companyName}" direct competitors business rivals`,

      `"${companyName}" vs competitors market analysis`,

      `companies like "${companyName}" same industry`,

      `"${companyName}" competitive landscape rivals`

    ];

    
    
    console.log(`   🚀 Running ${searchQueries.length} public database queries in parallel...`);

    
    
    // Run all queries truly in parallel without delays

    const queryPromises = searchQueries.map(async (query, index) => {

      try {

        console.log(`   🔍 Public database query ${index + 1}: "${query}"`);

        
        
        const searchResults = await queryCustomSearchAPI(query);

        console.log(`   📄 Found ${searchResults.length} results for query ${index + 1}`);

        return searchResults;

      } catch (error) {

        console.error(`   ❌ Public database query ${index + 1} failed:`, error.message);

        return [];

      }

    });

    
    
    // Wait for all queries to complete

    const allSearchResults = await Promise.all(queryPromises);

    
    
    // Flatten results

    const flattenedResults = allSearchResults.flat();

    console.log(`   📊 Total public database results: ${flattenedResults.length}`);

    
    
    const competitors = await extractCompetitorNames(companyName, flattenedResults);

    console.log(`   🎯 Extracted ${competitors.length} competitors from public database:`, competitors);

    return competitors;

  } catch (error) {

    console.error('❌ Public database search error:', error.message);

    return [];

  }

}



// Web search with relaxed filtering

async function extractCompetitorsWithRelaxedFiltering(searchResults, companyName) {

  try {

    console.log(`   🔍 Extracting competitors from ${searchResults.length} search results`);

    const competitors = await extractCompetitorNames(companyName, searchResults);

    console.log(`   🎯 Extracted ${competitors.length} competitors from web search`);

    const filtered = competitors.filter(name => 

      name.toLowerCase() !== companyName.toLowerCase() &&

      name.length > 2

    );

    console.log(`   ✅ Filtered to ${filtered.length} valid competitors`);

    return filtered;

  } catch (error) {

    console.error('❌ Relaxed filtering error:', error.message);

    return [];

  }

}



// Wikipedia-based search with parallel queries

async function searchWikipediaCompetitors(companyName) {

  try {

    console.log(`   📚 Method 4: Wikipedia-based search for "${companyName}"`);

    
    
    // Multiple Wikipedia search queries - more specific for actual competitors

    const searchQueries = [

      `"${companyName}" Wikipedia competitors section`,

      `"${companyName}" Wikipedia competitive landscape`,

      `"${companyName}" Wikipedia rivals competitors`,

      `"${companyName}" Wikipedia market competition`

    ];

    
    
    console.log(`   🚀 Running ${searchQueries.length} Wikipedia queries in parallel...`);

    
    
    // Run all queries truly in parallel without delays

    const queryPromises = searchQueries.map(async (query, index) => {

      try {

        console.log(`   🔍 Wikipedia query ${index + 1}: "${query}"`);

        
        
        const searchResults = await queryCustomSearchAPI(query);

        console.log(`   📄 Found ${searchResults.length} results for query ${index + 1}`);

        return searchResults;

      } catch (error) {

        console.error(`   ❌ Wikipedia query ${index + 1} failed:`, error.message);

        return [];

      }

    });

    
    
    // Wait for all queries to complete

    const allSearchResults = await Promise.all(queryPromises);

    
    
    // Flatten results

    const flattenedResults = allSearchResults.flat();

    console.log(`   📊 Total Wikipedia results: ${flattenedResults.length}`);

    
    
    const competitors = await extractCompetitorNames(companyName, flattenedResults);

    console.log(`   🎯 Extracted ${competitors.length} competitors from Wikipedia:`, competitors);

    return competitors;

  } catch (error) {

    console.error('❌ Wikipedia search error:', error.message);

    return [];

  }

}



// Normalize brand key (dedupe variants like "pharmeasy" vs "pharmeasy.com" vs URL)

function normalizeBrandKey(raw) {

  try {

    if (!raw) return '';

    let s = String(raw).trim().toLowerCase();

    // Remove markdown/url wrappers

    s = s.replace(/^["'\[]+|["'\]]+$/g, '');

    // If looks like a URL or domain, extract registrable label

    if (s.includes('http://') || s.includes('https://')) {

      try { const u = new URL(s); s = u.hostname; } catch {}

    }

    // Strip protocol remnants and paths

    s = s.replace(/^www\./, '').split('/')[0];

    // If domain, take first label (brand) before first dot

    if (s.includes('.')) {

      s = s.split('.')[0];

    }

    // Remove non-alphanumeric characters

    s = s.replace(/[^a-z0-9]/g, '');

    // Strip common trailing noise tokens (handle domain-like and commerce suffixes)

    const trailingTokens = [

      'com','in','co','io','ai',

      'official','store','shop','app','inc','ltd','limited',

      'mart','online','healthservices','healthservice','healthcare'

    ];

    let changed = true;

    while (changed) {

      changed = false;

      for (const tok of trailingTokens) {

        if (s.endsWith(tok) && s.length > tok.length + 2) { // keep some brand core

          s = s.slice(0, -tok.length);

          changed = true;

          break;

        }

      }

    }

    return s;

  } catch { return String(raw || '').toLowerCase().trim(); }

}



function prettifyBrandNameFromKey(key) {

  if (!key) return '';

  // Simple title case; keeps brand readable when we dedupe domains

  return key.replace(/([a-z])([A-Z])/g, '$1 $2')

            .replace(/\b([a-z])/g, (m) => m.toUpperCase());

}



// Clean competitor names and dedupe by normalized brand key

function cleanCompetitorNames(names) {

  const seen = new Set();

  const out = [];

  (names || [])

    .filter(name => name && typeof name === 'string')

    .map(name => String(name).trim())

    .filter(name => 

      name.length > 0 && 

      !name.toLowerCase().includes('wikipedia') &&

      !name.toLowerCase().includes('linkedin') &&

      !name.toLowerCase().includes('news') &&

      !name.toLowerCase().includes('article')

    )

    .forEach((name) => {

      const key = normalizeBrandKey(name);

      if (!key) return;

      if (seen.has(key)) return;

      seen.add(key);

      // Prefer original readable name if it already looks like a brand (no domain), else prettify

      const looksLikeDomain = /\.|\//.test(name);

      const display = looksLikeDomain ? prettifyBrandNameFromKey(key) : name;

      out.push(display);

    });

  // Extra pass: merge visually-similar variants (case-insensitive)

  const finalSeen = new Set();

  const final = [];

  out.forEach(name => {

    const key = normalizeBrandKey(name);

    if (finalSeen.has(key)) return;

    finalSeen.add(key);

    final.push(name);

  });

  console.log('   🧹 [cleanCompetitorNames] Unique brands:', final);

  return final;

}



// Extract competitor names from search results using AI

async function extractCompetitorNames(companyName, searchResults) {

  if (!GEMINI_API_KEY) {

    throw new Error('GEMINI_API_KEY not set');

  }

  
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  
  
  // Build richer context using title + snippet + link

  const searchText = searchResults.map(item => {

    const title = String(item?.name || '').trim();

    const snippet = String(item?.snippet || '').trim();

    const link = String(item?.link || '').trim();

    return `${title}${snippet ? ` — ${snippet}` : ''}${link ? ` (${link})` : ''}`;

  }).join('\n');

  
  
  console.log(`[DEBUG] Search results being sent to Gemini (${searchResults.length} items):`);

  searchResults.forEach((item, index) => {

    console.log(`  ${index + 1}. ${item.name} - ${item.snippet} - ${item.link}`);

  });

  
  
  // Enhanced industry-aware prompt for unique competitor extraction

  const prompt = `Analyze these search results and extract ONLY direct competitor NAMES for "${companyName}".



PRIORITIZE UNIQUE AND EMERGING COMPETITORS:

- Look for specific, named companies that directly compete with ${companyName}

- Include both established competitors AND emerging/niche competitors

- Focus on companies that customers would actually choose between

- Avoid generic, well-known mega-brands unless they're direct competitors

- Include regional, specialized, or industry-specific competitors



INDUSTRY-SPECIFIC COMPETITOR DETECTION:

- For FASHION/CLOTHING brands: Look for fashion retailers, clothing brands, apparel companies, fashion e-commerce sites (both mainstream and niche)

- For E-COMMERCE platforms: Look for other online marketplaces, retail platforms, shopping sites

- For TECH companies: Look for other technology companies, software providers, tech platforms

- For AUTOMOTIVE: Look for other car manufacturers, automotive companies

- For MEDIA/NEWS: Look for other news organizations, media companies, publishing houses

- For SOCIAL platforms: Look for other social media companies, community platforms

- For PROFESSIONAL services: Look for other companies in the same professional field



STRICT RULES FOR ACCURACY:

1) ONLY include companies that are DIRECT competitors to ${companyName} (same industry, similar products/services, same target customers)

2) Exclude ${companyName} itself

3) Exclude generic terms like "competitors", "companies", "businesses", "alternatives", "list"

4) Exclude news websites, blogs, or informational sites (e.g., "Reuters", "Forbes", "TechCrunch")

5) Exclude job sites, review sites, or directory sites (e.g., "Indeed", "Glassdoor", "LinkedIn")

6) Exclude government or educational institutions unless they directly compete

7) Exclude generic e-commerce platforms (Amazon, eBay, Walmart) unless the company is also a generic e-commerce platform

8) Only include actual business competitors that customers would choose between

9) Deduplicate and normalize brand names (e.g., "amazon.com" → "Amazon")

10) Focus on companies with similar business models and target markets

11) Prioritize unique, specific competitors over generic mega-brands

12) Return ONLY a JSON array (no extra text), target 5-8 high-quality competitors



Search results (title — snippet (link)):

${searchText}



Return JSON array only, e.g.: ["Company1", "Company2", "Company3"]`;



  console.log(`   🤖 Extracting competitors using AI for "${companyName}"`);

  console.log(`   📄 Analyzing ${searchResults.length} search results`);

  
  
  let result;

  try {

    result = await withTimeout(

      model.generateContent({

        contents: [{ role: 'user', parts: [{ text: prompt }]}],

        generationConfig: { 

          responseMimeType: 'application/json',

          temperature: 0.1,

          maxOutputTokens: 1000

        }

      }),

      15000, // Increased timeout

      { response: { candidates: [] } }

    );

  } catch (error) {

    console.log(`[DEBUG] Gemini API error:`, error.message);

    // Try without JSON mode as fallback

    try {

      result = await withTimeout(

        model.generateContent(prompt),

        10000,

        { response: { candidates: [] } }

      );

    } catch (fallbackError) {

      console.log(`[DEBUG] Gemini fallback also failed:`, fallbackError.message);

      result = { response: { candidates: [] } };

    }

  }

  const response = result.response.candidates[0]?.content?.parts[0]?.text || '';

  console.log(`[DEBUG] Raw Gemini response:`, response);

  
  
  try {

    const clean = response.replace(/```json\s*/g, '').replace(/```/g, '').trim();

    const jsonMatch = clean.match(/\[[\s\S]*\]/);

    const raw = jsonMatch ? jsonMatch[0] : clean;

    const competitors = JSON.parse(raw);

    
    
    if (Array.isArray(competitors) && competitors.length > 0) {

      const validCompetitors = competitors

        .filter(name => name && typeof name === 'string' && name.trim().length > 0)

        .map(name => name.trim())

        .filter(name => name.toLowerCase() !== companyName.toLowerCase());
    
    

    console.log(`   ✅ AI extracted ${validCompetitors.length} competitors`);

      if (validCompetitors.length > 0) return validCompetitors;

      // Fall back to heuristic extraction below if AI returned empty

    }

  } catch (error) {

    console.error('❌ Failed to parse competitor names:', error.message);

    console.error('Raw response:', response);

    // Continue to heuristic extraction

  }



  // Heuristic extraction: infer brand names from result links and titles

  try {

    const domainToBrand = (url) => {

      try {

        const u = new URL(url);

        const host = u.hostname.replace(/^www\./, '').toLowerCase();

        const sld = host.split('.').slice(-2, -1)[0] || host.split('.')[0];

        if (!sld) return '';

        // Map a few common marketplaces explicitly

        const map = { amazon: 'Amazon', ebay: 'eBay', walmart: 'Walmart', target: 'Target', etsy: 'Etsy', asos: 'ASOS', uniqlo: 'Uniqlo', bestbuy: 'Best Buy', aliexpress: 'AliExpress' };

        return map[sld] || sld.replace(/[-_]/g, ' ').replace(/\b(\w)/g, (m, c) => c.toUpperCase());

      } catch { return ''; }

    };

    const fromDomains = new Set();

    (searchResults || []).forEach(item => {

      const b = domainToBrand(item?.link || '');

      if (b) fromDomains.add(b);

    });

    // Also split titles on common "vs" / list patterns

    const fromTitles = new Set();

    (searchResults || []).forEach(item => {

      const t = String(item?.name || '');

      const parts = t.split(/\bvs\.?|,|\/|\band\b|\bor\b/i).map(s => s.trim());

      parts.forEach(p => {

        if (!p) return;

        // Keep short brand-like tokens

        const cleaned = p.replace(/[^A-Za-z0-9 &'-]/g, '').trim();

        if (cleaned && cleaned.length <= 20 && !/competitor|alternative|list|best|top|guide/i.test(cleaned)) {

          fromTitles.add(cleaned);

        }

      });

    });

    let heuristic = cleanCompetitorNames([ ...fromDomains, ...fromTitles ]);

    heuristic = heuristic.filter(n => n.toLowerCase() !== String(companyName).toLowerCase()).slice(0, 10);

    console.log(`   🔎 Heuristic extracted ${heuristic.length} competitors`);

    return heuristic;

  } catch {

    return [];

  }

}



// Validate competitors using AI with parallel processing

async function validateCompetitors(companyName, competitorNames, searchResults) {

  if (!GEMINI_API_KEY) {

    console.log(`   ⚠️ No Gemini API key, returning top 10 competitors without validation`);

    return competitorNames.slice(0, 10);

  }

  
  
  console.log(`   🤖 Validating ${competitorNames.length} competitors for "${companyName}" in parallel...`);

  
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  
  
  // Process all competitors truly in parallel without delays

  const validationPromises = competitorNames.map(async (competitor, index) => {

    try {

      console.log(`   [DEBUG] Starting validation for competitor ${index + 1}/${competitorNames.length}: ${competitor}`);

      
      
      const scoringPrompt = `You are a business analyst. Rate how likely it is that "${competitor}" is a DIRECT competitor to "${companyName}" on a scale of 0-100.



STRICT EVALUATION CRITERIA:

1. Industry/Market Alignment (30%):

   - Must operate in the SAME industry as ${companyName}

   - Must serve the SAME market segment

   - Must be in the SAME business category



2. Product/Service Similarity (30%):

   - Must offer SIMILAR products or services

   - Must solve the SAME customer problems

   - Must be in the SAME product category



3. Target Customer Overlap (25%):

   - Must target the SAME customer demographics

   - Must compete for the SAME customer base

   - Must have similar customer profiles



4. Business Model Compatibility (15%):

   - Must use similar business models

   - Must compete in the SAME sales channels



EXCLUSION RULES - AUTOMATIC 0 SCORE:

- News websites (Forbes, Reuters, TechCrunch, etc.)

- Job sites (Indeed, Glassdoor, LinkedIn, etc.)

- Educational sites (Wikipedia, Quizlet, etc.)

- Social platforms (Reddit, Quora, etc.)

- Technology platforms (Shopify, WordPress, etc.)

- Generic business services (Mailchimp, etc.)



Rate 0-100 where:

- 90-100: Direct competitor (same industry, similar products, same customers)

- 70-89: Strong competitor (related industry, overlapping products/customers)

- 50-69: Moderate competitor (some overlap in market or products)

- 0-49: Not a competitor (different industry/market or excluded category)



Return only a number between 0-100.`;

      
      
      const result = await model.generateContent(scoringPrompt);

      const response = result.response.candidates[0]?.content?.parts[0]?.text || '';

      
      
      // Extract numeric score from response

      const scoreMatch = response.match(/(\d+)/);

      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

      
      
      console.log(`   [DEBUG] ${competitor} scored ${score}/100 - ${score >= 60 ? 'VALID' : 'REJECTED'}`);

      
      
      return {

        competitor,

        score,

        isValid: score >= 60, // Balanced threshold for accuracy and coverage

        error: null

      };
      
      

    } catch (error) {

      console.error(`   ❌ Error validating ${competitor}:`, error.message);

      return {

        competitor,

        score: 0,

        isValid: true, // Include as fallback if validation fails

        error: error.message

      };

    }

  });

  
  
  // Wait for all validations to complete

  console.log(`   ⏳ Running ${validationPromises.length} parallel validations...`);

  const validationResults = await Promise.all(validationPromises);

  
  
  // Filter valid competitors

  let validatedCompetitors = validationResults

    .filter(result => result.isValid)

    .map(result => result.competitor);
  
  

  console.log(`   ✅ Parallel validation complete: ${validatedCompetitors.length} valid competitors out of ${competitorNames.length}`);

  console.log(`[DEBUG] Validation results:`, validationResults.map(r => `${r.competitor}:${r.score}(${r.isValid ? 'VALID' : 'REJECTED'})`));

  console.log(`[DEBUG] Valid competitors after filtering:`, validatedCompetitors);

  
  
  // Quality over quantity: only return validated competitors

  if (validatedCompetitors.length === 0) {

    console.log(`   ⚠️ No competitors passed validation. This may indicate the search results don't contain relevant competitors for "${companyName}".`);

    console.log(`   💡 Consider trying different search terms or checking if the company name is correct.`);

  } else if (validatedCompetitors.length < 3) {

    console.log(`   ⚠️ Only ${validatedCompetitors.length} competitors passed validation. Quality over quantity - returning only validated competitors.`);

  }

  
  
  // Log validation summary

  validationResults.forEach(result => {

    if (result.isValid) {

      console.log(`   ✅ ${result.competitor}: Score ${result.score}/100`);

    } else {

      console.log(`   ❌ ${result.competitor}: Score ${result.score}/100 (rejected)`);

    }

  });

  
  
  return validatedCompetitors;

}



// Multi-method competitor detection with parallel processing

async function detectCompetitors(companyName, searchResults, industry = '') {

  console.log('\n🔍 Starting parallel competitor detection...');

  const allCompetitors = new Map();

  const methodResults = {};

  
  
  // Run all 4 detection methods in parallel for maximum speed

  console.log('🚀 Launching all detection methods simultaneously...');

  
  
  const detectionPromises = [

    // Method 1: Industry news search

    (async () => {

      console.log('📰 Method 1: Industry news search...');

      try {

        const competitors = await searchIndustryNewsCompetitors(companyName);

        const cleaned = cleanCompetitorNames(competitors);

        methodResults.industryNews = cleaned;

        console.log(`   ✅ Found ${cleaned.length} competitors via industry news:`, cleaned);

        return { method: 'industryNews', competitors: cleaned };

      } catch (error) {

        console.error(`   ❌ Industry news search failed:`, error.message);

        return { method: 'industryNews', competitors: [] };

      }

    })(),

    
    
    // Method 2: Public company database search

    (async () => {

      console.log('🏢 Method 2: Public company database search...');

      try {

        const competitors = await searchPublicCompanyDatabase(companyName);

        const cleaned = cleanCompetitorNames(competitors);

        methodResults.publicDatabase = cleaned;

        console.log(`   ✅ Found ${cleaned.length} competitors via public database:`, cleaned);

        return { method: 'publicDatabase', competitors: cleaned };

      } catch (error) {

        console.error(`   ❌ Public database search failed:`, error.message);

        return { method: 'publicDatabase', competitors: [] };

      }

    })(),

    
    
    // Method 3: Web search with relaxed filtering

    (async () => {

      console.log('🌐 Method 3: Web search with relaxed filtering...');

      try {

        const competitors = await extractCompetitorsWithRelaxedFiltering(searchResults, companyName);

        const cleaned = cleanCompetitorNames(competitors);

        methodResults.webSearch = cleaned;

        console.log(`   ✅ Found ${cleaned.length} competitors via web search:`, cleaned);

        return { method: 'webSearch', competitors: cleaned };

      } catch (error) {

        console.error(`   ❌ Web search failed:`, error.message);

        return { method: 'webSearch', competitors: [] };

      }

    })(),

    
    
    // Method 4: Wikipedia-based search

    (async () => {

      console.log('📚 Method 4: Wikipedia-based search...');

      try {

        const competitors = await searchWikipediaCompetitors(companyName);

        const cleaned = cleanCompetitorNames(competitors);

        methodResults.wikipedia = cleaned;

        console.log(`   ✅ Found ${cleaned.length} competitors via Wikipedia:`, cleaned);

        return { method: 'wikipedia', competitors: cleaned };

      } catch (error) {

        console.error(`   ❌ Wikipedia search failed:`, error.message);

        return { method: 'wikipedia', competitors: [] };

      }

    })(),

    
    
    // Method 5: Geo-intent prompt bank search

    (async () => {

      console.log('🌍 Method 5: Geo-intent prompt bank search...');

      try {

        const prompts = getGeoCompetitorPromptBank({

          product: '',

          category: '',

          city: '',

          country: '',

          region: '',

          competitorA: companyName,

          competitorB: 'Amazon'

        });

        console.log(`   📝 Geo prompt bank size: ${prompts.length}`);

        // Run all searches in parallel with tight timeouts

        const searchPromises = prompts.map((q, i) => {

          console.log(`   🔎 Geo query ${i + 1}/${prompts.length}: "${q}"`);

          return withTimeout(queryCustomSearchAPI(q), 6000, []).catch(() => []);

        });

        const resultsNested = await Promise.all(searchPromises);

        const flattened = resultsNested.flat();

        console.log(`   📄 Geo prompt bank total results: ${flattened.length}`);

        const extracted = await withTimeout(extractCompetitorNames(companyName, flattened), 6000, []).catch(() => []);

        const cleaned = cleanCompetitorNames(extracted);

        console.log(`   ✅ Geo prompt bank extracted ${cleaned.length} competitors`);

        methodResults.geoPromptBank = cleaned;

        return { method: 'geoPromptBank', competitors: cleaned };

      } catch (error) {

        console.error(`   ❌ Geo-intent prompt bank search failed:`, error.message);

        return { method: 'geoPromptBank', competitors: [] };

      }

    })(),

    
    
    // Method 6: Query expansion (alternatives / vs / like)

    (async () => {

      console.log('🧠 Method 6: Query expansion (alternatives / vs / like)...');

      try {

        const qx = [

          `"${companyName}" direct competitors business rivals`,

          `"${companyName}" vs competitors market analysis`,

          `companies like "${companyName}" same industry`,

          `"${companyName}" alternative brands competitors`,

          `"${companyName}" market competitors analysis`,

          `"${companyName}" competitive landscape rivals`,

          `"${companyName}" business competitors direct`,

          `"${companyName}" industry rivals competitors`

        ];

        const queryResults = await Promise.all(qx.map(q => queryCustomSearchAPI(q).catch(() => [])));

        const flat = queryResults.flat();

        console.log(`   📄 Query expansion total results: ${flat.length}`);

        const extracted = await withTimeout(extractCompetitorNames(companyName, flat), 10000, []).catch(() => []);

        const cleaned = cleanCompetitorNames(extracted);

        console.log(`   ✅ Query expansion extracted ${cleaned.length} competitors`);

        return { method: 'queryExpansion', competitors: cleaned };

      } catch (error) {

        console.error('   ❌ Query expansion failed:', error.message);

        return { method: 'queryExpansion', competitors: [] };

      }

    })()

  ];

  
  
  // Wait for all detection methods to complete

  console.log('⏳ Waiting for all detection methods to complete...');

  const detectionResults = await Promise.all(detectionPromises);

  
  
  // Consolidate results from all methods

  console.log('\n📊 Consolidating results from all detection methods...');

  detectionResults.forEach(result => {

    console.log(`[DEBUG] Method ${result.method} returned ${result.competitors?.length || 0} competitors:`, result.competitors);

    if (result.competitors && result.competitors.length > 0) {

      result.competitors.forEach(rawComp => {

        const key = normalizeBrandKey(rawComp);

        const prev = allCompetitors.get(key) || 0;

        allCompetitors.set(key, prev + 1);

        console.log(`   [DEDUP] Add '${rawComp}' -> key='${key}', freq=${prev + 1}`);

      });

    }

  });

  
  
  // Rank competitors by frequency

  console.log('\n📊 Ranking competitors by frequency...');

  const rankedCompetitors = Array.from(allCompetitors.entries())

    .map(([key, frequency]) => ({ name: prettifyBrandNameFromKey(key) || key, frequency, key }))

    .sort((a, b) => b.frequency - a.frequency);
  
  

  console.log('📈 Competitor frequency ranking:');

  rankedCompetitors.forEach((comp, index) => {

    console.log(`   ${index + 1}. ${comp.name} (found ${comp.frequency} times)`);

  });

  
  
  let competitorNames = rankedCompetitors.map(c => c.name);

  console.log('   [DEDUP] Final ranked (name,key,freq):', rankedCompetitors);

  
  
  // Only use fallback seeding if primary detection completely failed

  if (!competitorNames || competitorNames.length < 2) {

    console.log(`   ⚠️ Primary detection found only ${competitorNames?.length || 0} competitors, using intelligent fallback...`);

    
    
    // Industry-specific fallback competitors when primary detection fails

    const industryCompetitors = {
      fashion: ['Zara', 'H&M', 'Uniqlo', 'Gap', 'Forever 21', 'Shein', 'ASOS', 'Boohoo'],
      automotive: ['Tesla', 'BMW', 'Mercedes-Benz', 'Toyota', 'Ford', 'Honda', 'Volkswagen', 'Audi'],
      tech: ['Apple', 'Google', 'Microsoft', 'Amazon', 'Meta', 'Samsung', 'IBM', 'Oracle'],
      streaming: ['Netflix', 'Disney+', 'Hulu', 'HBO Max', 'Amazon Prime Video', 'Apple TV+', 'Paramount+', 'Peacock'],
      media: ['CNN', 'BBC', 'Reuters', 'The New York Times', 'The Guardian', 'Fox News', 'Bloomberg', 'Al Jazeera'],
      social: ['Facebook', 'Instagram', 'Twitter', 'TikTok', 'LinkedIn', 'Snapchat', 'Pinterest', 'Reddit'],
      professional: ['LinkedIn', 'Indeed', 'Glassdoor', 'Monster', 'ZipRecruiter', 'CareerBuilder', 'Dice', 'SimplyHired'],
      ecommerce: ['Amazon', 'eBay', 'Walmart', 'Target', 'Etsy', 'Shopify', 'AliExpress', 'Wayfair'],
      beauty: ['Sephora', 'Ulta Beauty', 'MAC Cosmetics', 'Fenty Beauty', 'NYX', 'Maybelline', 'L\'Oréal', 'Clinique'],
      electronics: ['Best Buy', 'Newegg', 'B&H Photo', 'Micro Center', 'Fry\'s Electronics', 'TigerDirect', 'Adorama', 'Amazon'],
      food: ['Uber Eats', 'DoorDash', 'Grubhub', 'Postmates', 'Deliveroo', 'Just Eat', 'Zomato', 'Swiggy'],
      fitness: ['Peloton', 'Planet Fitness', 'LA Fitness', 'Gold\'s Gym', 'Equinox', '24 Hour Fitness', 'Anytime Fitness', 'Crunch'],
      travel: ['Expedia', 'Booking.com', 'Airbnb', 'Hotels.com', 'TripAdvisor', 'Kayak', 'Priceline', 'Trivago'],
      finance: ['Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'Capital One', 'American Express', 'PayPal', 'Venmo'],
      healthcare: ['CVS Health', 'Walgreens', 'UnitedHealth', 'Anthem', 'Cigna', 'Aetna', 'Humana', 'Kaiser Permanente'],
      education: ['Coursera', 'Udemy', 'Khan Academy', 'edX', 'Skillshare', 'LinkedIn Learning', 'Pluralsight', 'Udacity'],
      gaming: ['Steam', 'Epic Games', 'PlayStation Store', 'Xbox', 'Nintendo eShop', 'GOG', 'Origin', 'Battle.net'],
      music: ['Spotify', 'Apple Music', 'Amazon Music', 'YouTube Music', 'Tidal', 'Pandora', 'Deezer', 'SoundCloud'],
      home: ['Wayfair', 'IKEA', 'Home Depot', 'Lowe\'s', 'Bed Bath & Beyond', 'Williams-Sonoma', 'Crate & Barrel', 'West Elm'],
      grocery: ['Whole Foods', 'Trader Joe\'s', 'Kroger', 'Safeway', 'Albertsons', 'Publix', 'Wegmans', 'H-E-B']
    };

    
    
    // Better industry detection based on company name, provided industry, and context

    let detectedIndustry = 'ecommerce'; // default

    
    
    // First, try to use the provided industry parameter

    if (industry && industry.trim().length > 0) {

      const industryLower = industry.toLowerCase();

      if (industryLower.includes('media') || industryLower.includes('news') || industryLower.includes('journalism')) {

        detectedIndustry = 'media';

      } else if (industryLower.includes('social') || industryLower.includes('community')) {

        detectedIndustry = 'social';

      } else if (industryLower.includes('professional') || industryLower.includes('job') || industryLower.includes('career')) {

        detectedIndustry = 'professional';

      } else if (industryLower.includes('fashion') || industryLower.includes('clothing') || industryLower.includes('apparel')) {

        detectedIndustry = 'fashion';

      } else if (industryLower.includes('automotive') || industryLower.includes('car') || industryLower.includes('vehicle')) {

        detectedIndustry = 'automotive';

      } else if (industryLower.includes('tech') || industryLower.includes('technology') || industryLower.includes('software')) {

        detectedIndustry = 'tech';

      } else if (industryLower.includes('streaming') || industryLower.includes('entertainment') || industryLower.includes('video')) {

        detectedIndustry = 'streaming';

      } else if (industryLower.includes('beauty') || industryLower.includes('cosmetic') || industryLower.includes('makeup')) {

        detectedIndustry = 'beauty';

      } else if (industryLower.includes('electronic') || industryLower.includes('gadget') || industryLower.includes('device')) {

        detectedIndustry = 'electronics';

      } else if (industryLower.includes('food') || industryLower.includes('restaurant') || industryLower.includes('delivery')) {

        detectedIndustry = 'food';

      } else if (industryLower.includes('fitness') || industryLower.includes('gym') || industryLower.includes('workout')) {

        detectedIndustry = 'fitness';

      } else if (industryLower.includes('travel') || industryLower.includes('hotel') || industryLower.includes('booking')) {

        detectedIndustry = 'travel';

      } else if (industryLower.includes('finance') || industryLower.includes('bank') || industryLower.includes('payment')) {

        detectedIndustry = 'finance';

      } else if (industryLower.includes('health') || industryLower.includes('medical') || industryLower.includes('pharma')) {

        detectedIndustry = 'healthcare';

      } else if (industryLower.includes('education') || industryLower.includes('learning') || industryLower.includes('course')) {

        detectedIndustry = 'education';

      } else if (industryLower.includes('gaming') || industryLower.includes('game') || industryLower.includes('esport')) {

        detectedIndustry = 'gaming';

      } else if (industryLower.includes('music') || industryLower.includes('audio') || industryLower.includes('podcast')) {

        detectedIndustry = 'music';

      } else if (industryLower.includes('home') || industryLower.includes('furniture') || industryLower.includes('decor')) {

        detectedIndustry = 'home';

      } else if (industryLower.includes('grocery') || industryLower.includes('supermarket') || industryLower.includes('food retail')) {

        detectedIndustry = 'grocery';

      }

    }

    
    
    // If no industry provided or not recognized, try company name detection

    if (detectedIndustry === 'ecommerce') {

      if (companyName.toLowerCase().includes('fashion') || companyName.toLowerCase().includes('zara') || 

          companyName.toLowerCase().includes('h&m') || companyName.toLowerCase().includes('uniqlo') ||

          companyName.toLowerCase().includes('gap') || companyName.toLowerCase().includes('asos') ||

          companyName.toLowerCase().includes('mirraw') || companyName.toLowerCase().includes('ethnic') ||

          companyName.toLowerCase().includes('indian') || companyName.toLowerCase().includes('traditional') ||

          companyName.toLowerCase().includes('saree') || companyName.toLowerCase().includes('kurta') ||

          companyName.toLowerCase().includes('lehenga') || companyName.toLowerCase().includes('salwar')) {

        detectedIndustry = 'fashion';

      } else if (companyName.toLowerCase().includes('tesla') || companyName.toLowerCase().includes('bmw') ||

                 companyName.toLowerCase().includes('mercedes') || companyName.toLowerCase().includes('toyota')) {

        detectedIndustry = 'automotive';

      } else if (companyName.toLowerCase().includes('apple') || companyName.toLowerCase().includes('google') ||

                 companyName.toLowerCase().includes('microsoft') || companyName.toLowerCase().includes('samsung')) {

        detectedIndustry = 'tech';

      } else if (companyName.toLowerCase().includes('netflix') || companyName.toLowerCase().includes('disney') ||

                 companyName.toLowerCase().includes('hulu') || companyName.toLowerCase().includes('spotify')) {

        detectedIndustry = 'streaming';

      } else if (companyName.toLowerCase().includes('forbes') || companyName.toLowerCase().includes('reuters') ||

                 companyName.toLowerCase().includes('cnn') || companyName.toLowerCase().includes('bbc')) {

        detectedIndustry = 'media';

      } else if (companyName.toLowerCase().includes('reddit') || companyName.toLowerCase().includes('facebook') ||

                 companyName.toLowerCase().includes('twitter') || companyName.toLowerCase().includes('instagram')) {

        detectedIndustry = 'social';

      } else if (companyName.toLowerCase().includes('linkedin') || companyName.toLowerCase().includes('indeed') ||

                 companyName.toLowerCase().includes('glassdoor') || companyName.toLowerCase().includes('monster')) {

        detectedIndustry = 'professional';

      }

    }

    
    
    console.log(`   🎯 Fallback industry detection: ${detectedIndustry} (from industry param: ${industry})`);

    
    
    const suggestions = industryCompetitors[detectedIndustry] || industryCompetitors['ecommerce'];

    
    
    const normMain = String(companyName || '').toLowerCase();

    const filteredSuggestions = suggestions.filter(s => s.toLowerCase() !== normMain);

    
    
    // Add fallback suggestions only if primary detection failed

    competitorNames = [...competitorNames, ...filteredSuggestions].slice(0, 8);

    console.log(`   🔧 Added ${detectedIndustry} fallback suggestions. Count: ${competitorNames.length}`);

  } else {

    console.log(`   ✅ Primary detection successful with ${competitorNames.length} competitors - no fallback needed`);

  }

  
  
  // Pre-filter obvious non-competitors before AI validation

  // NOTE: Only filter competitors, not the main company being analyzed

  console.log('\n🔍 Pre-filtering obvious non-competitors...');

  const excludedPatterns = [

    /forbes|reuters|techcrunch|bloomberg|cnn|bbc|nytimes|vox|medium/i,

    /indeed|glassdoor|linkedin|monster|ziprecruiter/i,

    /wikipedia|quizlet|khan|edx|coursera|sciencedirect|academic/i,

    /reddit|quora|stackoverflow|medium|substack|fandom|scribd/i,

    /shopify|wordpress|squarespace|wix|webflow|platform/i,

    /mailchimp|hubspot|salesforce|zendesk|slack|business/i,

    /google|microsoft|apple|amazon|meta|twitter|tech/i,

    /youtube|tiktok|instagram|facebook|snapchat|social/i,

    /netflix|disney|hulu|spotify|pandora|entertainment/i,

    /investopedia|thestrategystory|productmint|scmglobe|rankandstyle/i,

    /stylebysavina|theeleganceedit|thredup|ethicalconsumer|ecoclub/i,

    /goodonyou|fredericetiemble|adammendler|gittemary|zarahighend/i,

    /ecdb|direct|zubiaga|iksurfmag|thewaltdisneycompany|ijirset/i,

    /micro1|captiv8|strategies|start|shsconferences|nielseniq/i,

    /conquest|scrapehero|unl|martinroll|ecostylist|heuritech/i

  ];

  
  
  const filteredCompetitors = competitorNames.filter(competitor => {

    // Don't filter out the main company being analyzed

    if (competitor.toLowerCase() === companyName.toLowerCase()) {

      console.log(`   ✅ Keeping main company: ${competitor}`);

      return true;

    }

    
    
    const isExcluded = excludedPatterns.some(pattern => pattern.test(competitor));

    if (isExcluded) {

      console.log(`   ❌ Pre-filtered out: ${competitor} (matches exclusion pattern)`);

      return false;

    }

    return true;

  });

  
  
  console.log(`   📊 Pre-filtering: ${competitorNames.length} → ${filteredCompetitors.length} competitors`);

  console.log(`   ✅ Remaining competitors:`, filteredCompetitors);



  // Validate remaining competitors with AI

  console.log('\n✅ Validating remaining competitors with AI...');

  const validatedCompetitors = await validateCompetitors(companyName, filteredCompetitors, searchResults);

  console.log(`🎯 AI validated competitors:`, validatedCompetitors);

  
  
  // Final post-processing: basic cleanup only, let AI validation do the heavy lifting

  console.log('\n🔍 Final post-processing for basic cleanup...');

  const finalCompetitors = validatedCompetitors.filter(competitor => {

    const compLower = competitor.toLowerCase();

    
    
    // Always keep the main company being analyzed

    if (compLower === companyName.toLowerCase()) {

      console.log(`   ✅ Keeping main company: ${competitor}`);

      return true;

    }

    
    
    // Only filter out obvious non-competitors that AI might have missed

    const obviousNonCompetitors = [

      'wikipedia', 'linkedin', 'indeed', 'glassdoor', 'monster', 'ziprecruiter',

      'careerbuilder', 'reddit', 'quora', 'stackoverflow', 'github', 'shopify',

      'wordpress', 'mailchimp', 'hubspot', 'salesforce', 'microsoft office',

      'google docs', 'adobe', 'canva', 'figma', 'slack', 'discord', 'zoom',

      'youtube', 'vimeo', 'dailymotion', 'twitch', 'pinterest', 'tumblr',

      'medium', 'substack', 'newsletter', 'blog', 'article', 'post', 'story'

    ];

    
    
    const isObviousNonCompetitor = obviousNonCompetitors.some(term => compLower.includes(term));

    
    
    if (isObviousNonCompetitor) {

      console.log(`   ❌ Filtering out obvious non-competitor: ${competitor}`);

      return false;

    } else {

      console.log(`   ✅ Keeping AI-validated competitor: ${competitor}`);

      return true;

    }

  });

  
  
  console.log(`🎯 Final competitors after post-processing:`, finalCompetitors);

  console.log(`📊 Final count: ${finalCompetitors.length} high-quality competitors`);

  
  
  return finalCompetitors;

}



// Web scraping functionality

async function scrapeWebsite(url) {

  console.log(`   🌐 Scraping website: ${url}`);

  
  
  try {

    console.log(`   📄 Loading page...`);

    
    
    const response = await axios.get(url, {

      timeout: 30000,

      headers: {

        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',

        'Accept-Language': 'en-US,en;q=0.5',

        'Accept-Encoding': 'gzip, deflate',

        'Connection': 'keep-alive',

        'Upgrade-Insecure-Requests': '1'

      }

    });

    
    
    const html = response.data;

    const $ = cheerio.load(html);

    
    
    const companyData = {

      name: $('title').text() || 'No title available',

      description: $('meta[name="description"]').attr('content') || 'No description available'

      };
    
    

    console.log(`   ✅ Scraping successful: "${companyData.name}"`);

    return companyData;

  } catch (error) {

    console.error(`   ❌ Scraping failed:`, error.message);

    return { error: 'Scraping failed', details: error.message };

  }

}



// Analyze visibility from AI response

// Enhanced visibility analysis with detailed scoring

function analyzeVisibility(responseText, company) {

  const name = company.name || company;

  
  
  // A. Mentions Count (35% weight)

  const mentions = (responseText.match(new RegExp(name, 'gi')) || []);

  const mentionsCount = mentions.length;

  
  
  // B. Prominence (30% weight) - how early the first mention appears (normalized 0..1)

  const lower = responseText.toLowerCase();

  const idx = lower.indexOf(String(name || '').toLowerCase());

  const textLen = Math.max(1, lower.length);

  const prominence = idx >= 0 ? Math.max(0, Math.min(1, 1 - (idx / textLen))) : 0;

  
  
  // C. Sentiment Score (20% weight)

  let sentiment = 0.5; // Default neutral

  const positiveWords = responseText.match(/best|leading|top|innovative|recommended|trusted|popular/gi) || [];

  const negativeWords = responseText.match(/problem|issue|concern|negative|bad|poor|not recommended/gi) || [];

  
  
  if (positiveWords.length > 0) {

    sentiment = 1; // Positive

  } else if (negativeWords.length > 0) {

    sentiment = 0; // Negative

  }

  
  
  // D. Brand Mentions (10% weight) - Same as mentions count but with different weight

  const brandMentions = mentionsCount;

  
  
  console.log(`   [DEBUG] Raw values for ${name}:`);

  console.log(`   [DEBUG] Mentions count: ${mentionsCount}`);

  console.log(`   [DEBUG] Prominence: ${prominence.toFixed(4)}`);

  console.log(`   [DEBUG] Sentiment: ${sentiment}`);

  console.log(`   [DEBUG] Brand mentions: ${brandMentions}`);

  
  
  return { 

    mentions, 

    position: idx >= 0 ? 1 : 0, // kept for backward compatibility

    prominence,

    sentiment, 

    brandMentions,

    mentionsCount,

    positiveWords: positiveWords.length,

    negativeWords: negativeWords.length

  };

}



// Calculate weighted visibility score

function calculateVisibilityScore(response, companyName = '') {

  if (response && typeof response === 'string') {

    const analysis = analyzeVisibility(response, companyName);

    
    
    // Weighted scoring formula

    const mentionsScore = analysis.mentionsCount * 0.35; // 35% weight

    const prominenceScore = analysis.prominence * 0.30; // 30% weight

    const sentimentScore = analysis.sentiment * 0.20; // 20% weight

    const brandMentionsScore = analysis.brandMentions * 0.15; // 15% weight

    
    
    const totalScore = mentionsScore + prominenceScore + sentimentScore + brandMentionsScore;

    
    
    console.log(`   [DEBUG] Weighted scores for ${companyName}:`);

    console.log(`   [DEBUG] Mentions score (35%): ${analysis.mentionsCount} x 0.35 = ${mentionsScore.toFixed(2)}`);

    console.log(`   [DEBUG] Prominence score (30%): ${analysis.prominence.toFixed(4)} x 0.30 = ${prominenceScore.toFixed(2)}`);

    console.log(`   [DEBUG] Sentiment score (20%): ${analysis.sentiment} x 0.20 = ${sentimentScore.toFixed(2)}`);

    console.log(`   [DEBUG] Brand mentions score (15%): ${analysis.brandMentions} x 0.15 = ${brandMentionsScore.toFixed(2)}`);

    console.log(`   [DEBUG] Total visibility score: ${totalScore.toFixed(4)}`);

    
    
    return {

      totalScore: totalScore,

      breakdown: {

        mentionsScore,

        prominenceScore,

        sentimentScore,

        brandMentionsScore

      },

      analysis

    };

  }

  
  
  if (response && typeof response === 'object') {

    const score = response.visibilityScore || response.score || response.rating || 5;

    return {

      totalScore: Math.min(Math.max(parseFloat(score) || 5, 1), 10),

      breakdown: {

        mentionsScore: 0,

        positionScore: 0,

        sentimentScore: 0,

        brandMentionsScore: 0

      },

      analysis: {}

    };

  }

  
  
  return {

    totalScore: 5,

    breakdown: {

      mentionsScore: 0,

      positionScore: 0,

      sentimentScore: 0,

      brandMentionsScore: 0

    },

    analysis: {}

  };

}



// Quick competitor detection within ~10 seconds from company/name/url/domain

async function quickDetectCompetitors(input) {

  try {

    let company = String(input || '').trim();

    // Normalize URL/domain to a company hint

    try {

      if (company.includes('.') || company.startsWith('http')) {

        const url = company.startsWith('http') ? company : `https://${company}`;

        const u = new URL(url);

        const host = u.hostname.replace(/^www\./, '');

        // use first label as company hint

        company = host.split('.')[0];

      }

    } catch {}



    const query = `"${company}" direct competitors business rivals`;

    const searchResults = await withTimeout(queryCustomSearchAPI(query), 6000, []);

    const extracted = await withTimeout(extractCompetitorNames(company, searchResults), 6000, []);

    const cleaned = cleanCompetitorNames(extracted).slice(0, 10);

    return { company, competitors: cleaned };

  } catch (e) {

    return { company: String(input || ''), competitors: [] };

  }

}



// Query Gemini for visibility analysis

async function queryGeminiVisibility(competitorName, industry = '', customPrompts = null) {

  if (!GEMINI_API_KEY) {

    throw new Error('GEMINI_API_KEY not set');

  }

  
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  
  
  const prompts = customPrompts || getGeminiPrompts(competitorName, industry);

  let allResponsesText = '';

  
  
  console.log(`   🤖 Gemini: Analyzing ${competitorName} with ${prompts.length} prompts`);

  console.log(`   📝 Gemini prompts to be used:`);

  prompts.forEach((prompt, i) => {

    console.log(`   ${i + 1}. ${prompt}`);

  });

  
  
  // Retry mechanism for service overload

  const retryWithBackoff = async (fn, maxRetries = 3) => {

    for (let attempt = 1; attempt <= maxRetries; attempt++) {

      try {

        return await fn();

      } catch (error) {

        if (error.message.includes('overloaded') || error.message.includes('503') || error.message.includes('429')) {

          if (attempt < maxRetries) {

            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff

            console.log(`   ⏳ Gemini service overloaded, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);

            await new Promise(resolve => setTimeout(resolve, delay));

            continue;

          }

        }

        throw error;

      }

    }

  };

  
  
  // Run prompts in small concurrent batches to speed up while avoiding throttling

  const geminiConcurrency = 2;

  for (let i = 0; i < prompts.length; i += geminiConcurrency) {

    const batch = prompts.slice(i, i + geminiConcurrency);

    const batchResponses = await Promise.all(batch.map(async (prompt, idx) => {

      const promptIndex = i + idx;

      try {

        console.log(`   📝 Gemini prompt ${promptIndex + 1}: ${prompt.substring(0, 50)}...`);

        const response = await retryWithBackoff(async () => {

          const result = await model.generateContent(prompt);

          return result.response.candidates[0]?.content?.parts[0]?.text || '';

        });

        console.log(`   ✅ Gemini prompt ${promptIndex + 1} completed (${response.length} chars)`);

        return response;

      } catch (error) {

        console.error(`   ❌ Gemini prompt ${promptIndex + 1} error after retries:`, error.message);

        return '';

      }

    }));

    allResponsesText += batchResponses.join(' ') + ' ';

    if (i + geminiConcurrency < prompts.length) {

      await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay

    }

  }

  
  
  console.log(`   [DEBUG] Analyzing visibility for: ${competitorName}`);

  console.log(`   [DEBUG] Response text length: ${allResponsesText.length} characters`);

  
  
  const scoreResult = calculateVisibilityScore(allResponsesText, competitorName);

  
  
  console.log(`   📊 Gemini analysis: ${scoreResult.analysis.mentionsCount} mentions, sentiment: ${scoreResult.analysis.sentiment}, score: ${scoreResult.totalScore.toFixed(4)}`);

  
  
  return { 

    analysis: allResponsesText || 'No analysis available', 

    visibilityScore: scoreResult.totalScore,

    keyMetrics: scoreResult.analysis,

    breakdown: scoreResult.breakdown

  };

}



// Query Perplexity for visibility analysis

async function queryPerplexity(competitorName, industry = '', customPrompts = null) {

  if (!PERPLEXITY_API_KEY) {

    throw new Error('PERPLEXITY_API_KEY not set');

  }

  
  
  const prompts = customPrompts || getPerplexityPrompts(competitorName, industry);

  let allResponsesText = '';

  
  
  console.log(`   🤖 Perplexity: Analyzing ${competitorName} with ${prompts.length} prompts`);

  console.log(`   📝 Perplexity prompts to be used:`);

  prompts.forEach((prompt, i) => {

    console.log(`   ${i + 1}. ${prompt}`);

  });

  
  
  // Retry mechanism for service overload

  const retryWithBackoff = async (fn, maxRetries = 3) => {

    for (let attempt = 1; attempt <= maxRetries; attempt++) {

      try {

        return await fn();

      } catch (error) {

        if (error.message.includes('overloaded') || error.message.includes('503') || error.message.includes('429') || error.response?.status === 503 || error.response?.status === 429) {

          if (attempt < maxRetries) {

            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff

            console.log(`   ⏳ Perplexity service overloaded, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);

            await new Promise(resolve => setTimeout(resolve, delay));

            continue;

          }

        }

        throw error;

      }

    }

  };

  
  
  for (let i = 0; i < prompts.length; i += 3) {

    const batch = prompts.slice(i, i + 3);

    console.log(`   [DEBUG] Processing Perplexity batch ${Math.floor(i/3) + 1}/${Math.ceil(prompts.length/3)}...`);

    
    
    const batchPromises = batch.map(async (prompt, index) => {

      try {

        console.log(`   📝 Perplexity prompt ${i + index + 1}: ${prompt.substring(0, 50)}...`);

        
        
        const responseObj = await retryWithBackoff(async () => {

          return sharedLLM.callPerplexityAPI(prompt, 'sonar', false);

        });

        const responseText = responseObj?.text || '';

        
        
        console.log(`   ✅ Perplexity prompt ${i + index + 1} completed (${responseText.length} chars)`);

        return responseText;

      } catch (error) {

        console.error(`   ❌ Perplexity prompt ${i + index + 1} error after retries:`, error.message);

        return '';

      }

    });

    
    
    const batchResponses = await Promise.all(batchPromises);

    allResponsesText += batchResponses.join(' ');

    
    
    if (i + 3 < prompts.length) {

      await new Promise(resolve => setTimeout(resolve, 600)); // Reduced delay

    }

  }

  
  
  console.log(`   [DEBUG] Analyzing visibility for: ${competitorName}`);

  console.log(`   [DEBUG] Response text length: ${allResponsesText.length} characters`);

  
  
  const scoreResult = calculateVisibilityScore(allResponsesText, competitorName);

  
  
  console.log(`   📊 Perplexity analysis: ${scoreResult.analysis.mentionsCount} mentions, sentiment: ${scoreResult.analysis.sentiment}, score: ${scoreResult.totalScore.toFixed(4)}`);

  
  
  return { 

    analysis: allResponsesText, 

    visibilityScore: scoreResult.totalScore,

    keyMetrics: scoreResult.analysis,

    breakdown: scoreResult.breakdown

  };

}



// Query Claude for visibility analysis

async function queryClaude(competitorName, industry = '', customPrompts = null) {

  if (!ANTHROPIC_API_KEY) {

    console.log(`   ⚠️ Claude: ANTHROPIC_API_KEY not set, returning fallback response`);

    return { 

      analysis: 'Claude analysis unavailable - API key not configured', 

      visibilityScore: 0, 

      keyMetrics: {},

      breakdown: {},

      error: 'api_key_not_set'

    };

  }

  
  
  const prompts = customPrompts || getClaudePrompts(competitorName, industry);

  let allResponsesText = '';

  
  
  console.log(`   🤖 Claude: Analyzing ${competitorName} with ${prompts.length} prompts`);

  console.log(`   📝 Claude prompts to be used:`);

  prompts.forEach((prompt, i) => {

    console.log(`   ${i + 1}. ${prompt}`);

  });

  
  
  // Run Claude prompts in small concurrent batches

  const claudeConcurrency = 2;

  for (let i = 0; i < prompts.length; i += claudeConcurrency) {

    const batch = prompts.slice(i, i + claudeConcurrency);

    const batchResponses = await Promise.all(batch.map(async (prompt, idx) => {

      const promptIndex = i + idx;

      try {

        console.log(`   📝 Claude prompt ${promptIndex + 1}: ${prompt.substring(0, 50)}...`);

        const response = await axios.post(

          'https://api.anthropic.com/v1/messages',

          {

            model: 'claude-3-5-sonnet-20241022',

            max_tokens: 1000,

            messages: [

              { role: 'user', content: prompt }

            ]

          },

          {

            headers: { 

              'Authorization': `Bearer ${ANTHROPIC_API_KEY}`, 

              'Content-Type': 'application/json',

              'anthropic-version': '2023-06-01'

            }

          }

        );

        const content = response.data?.content?.[0]?.text || '';

        console.log(`   ✅ Claude prompt ${promptIndex + 1} completed (${content.length} chars)`);

        return content;

      } catch (error) {

        console.error(`   ❌ Claude prompt ${promptIndex + 1} error:`, error.message);

        return '';

      }

    }));

    allResponsesText += batchResponses.join(' ') + ' ';

    if (i + claudeConcurrency < prompts.length) {

      await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay

    }

  }

  
  
  console.log(`   [DEBUG] Analyzing visibility for: ${competitorName}`);

  console.log(`   [DEBUG] Response text length: ${allResponsesText.length} characters`);

  
  
  const scoreResult = calculateVisibilityScore(allResponsesText, competitorName);

  
  
  console.log(`   📊 Claude analysis: ${scoreResult.analysis.mentionsCount} mentions, sentiment: ${scoreResult.analysis.sentiment}, score: ${scoreResult.totalScore.toFixed(4)}`);

  
  
  return { 

    analysis: allResponsesText, 

    visibilityScore: scoreResult.totalScore,

    keyMetrics: scoreResult.analysis,

    breakdown: scoreResult.breakdown

  };

}



// Query ChatGPT for visibility analysis

async function queryChatGPT(competitorName, industry = '', customPrompts = null) {

  // Check if API key exists and is not a placeholder value

  const isValidApiKey = (key) => {

    return key && 

           !key.includes('your_') && 

           !key.includes('_here') &&

           key !== 'your_openai_api_key_here' &&

           key !== 'your_gemini_api_key_here' &&

           key !== 'your_anthropic_api_key_here' &&

           key !== 'your_perplexity_api_key_here';

  };

  
  
  if (!isValidApiKey(OPENAI_API_KEY)) {

    console.log(`   ⚠️ ChatGPT: OPENAI_API_KEY not configured or is placeholder, returning fallback response`);

    return { 

      analysis: 'ChatGPT analysis unavailable - API key not configured', 

      visibilityScore: 0, 

      keyMetrics: {},

      breakdown: {},

      error: 'api_key_not_set'

    };

  }

  
  
  const prompts = customPrompts || getChatGPTPrompts(competitorName, industry);

  let allResponsesText = '';

  
  
  console.log(`   🤖 ChatGPT: Analyzing ${competitorName} with ${prompts.length} prompts`);

  console.log(`   📝 ChatGPT prompts to be used:`);

  prompts.forEach((prompt, i) => {

    console.log(`   ${i + 1}. ${prompt}`);

  });

  
  
  // Run ChatGPT prompts in small concurrent batches

  const openAiConcurrency = 2;

  for (let i = 0; i < prompts.length; i += openAiConcurrency) {

    const batch = prompts.slice(i, i + openAiConcurrency);

    const batchResponses = await Promise.all(batch.map(async (prompt, idx) => {

      const promptIndex = i + idx;

      try {

        console.log(`   📝 ChatGPT prompt ${promptIndex + 1}: ${prompt.substring(0, 50)}...`);

        const response = await axios.post(

          'https://api.openai.com/v1/chat/completions',

          {

            model: 'gpt-3.5-turbo',

            messages: [

              { role: 'system', content: 'You are a helpful business analyst specializing in AI market analysis.' },

              { role: 'user', content: prompt }

            ],

            max_tokens: 1000

          },

          {

            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' }

          }

        );

        const content = response.data?.choices?.[0]?.message?.content || '';

        console.log(`   ✅ ChatGPT prompt ${promptIndex + 1} completed (${content.length} chars)`);

        return content;

      } catch (error) {

        console.error(`   ❌ ChatGPT prompt ${promptIndex + 1} error:`, error.message);

        return '';

      }

    }));

    allResponsesText += batchResponses.join(' ') + ' ';

    if (i + openAiConcurrency < prompts.length) {

      await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay

    }

  }

  
  
  console.log(`   [DEBUG] Analyzing visibility for: ${competitorName}`);

  console.log(`   [DEBUG] Response text length: ${allResponsesText.length} characters`);

  
  
  const scoreResult = calculateVisibilityScore(allResponsesText, competitorName);

  
  
  console.log(`   📊 ChatGPT analysis: ${scoreResult.analysis.mentionsCount} mentions, sentiment: ${scoreResult.analysis.sentiment}, score: ${scoreResult.totalScore.toFixed(4)}`);

  
  
  return { 

    analysis: allResponsesText, 

    visibilityScore: scoreResult.totalScore,

    keyMetrics: scoreResult.analysis,

    breakdown: scoreResult.breakdown

  };

}



// Utility: timeout wrapper with fallback

async function withTimeout(promise, ms, fallbackValue) {

  return Promise.race([

    promise,

    new Promise(resolve => setTimeout(() => resolve(fallbackValue), ms))

  ]);

}



// Main AI visibility analysis function - now optimized by default

// New parallel LLM analysis function

async function analyzeCompanyWithAllModels(companyName, industry, product, prompts) {

  console.log(`\n🚀 [analyzeCompanyWithAllModels] Starting parallel analysis for ${companyName}`);

  
  
  const modelKeys = getConfiguredModelKeys();

  console.log(`   Available models: ${modelKeys.join(', ')}`);

  
  
  if (modelKeys.length === 0) {

    console.log('   ⚠️ No models available, returning fallback data');

    return {

      aiScores: { gemini: 0, perplexity: 0, claude: 0, chatgpt: 0 },

      breakdowns: {

        gemini: { analysis: 'No API key', visibilityScore: 0, keyMetrics: {}, breakdown: {} },

        perplexity: { analysis: 'No API key', visibilityScore: 0, keyMetrics: {}, breakdown: {} },

        claude: { analysis: 'No API key', visibilityScore: 0, keyMetrics: {}, breakdown: {} },

        chatgpt: { analysis: 'No API key', visibilityScore: 0, keyMetrics: {}, breakdown: {} }

      },

      keyMetrics: {

        gemini: { brandMentions: 0, positiveWords: 0, negativeWords: 0 },

        perplexity: { brandMentions: 0, positiveWords: 0, negativeWords: 0 },

        claude: { brandMentions: 0, positiveWords: 0, negativeWords: 0 },

        chatgpt: { brandMentions: 0, positiveWords: 0, negativeWords: 0 }

      },

      analysis: {

        gemini: 'No API key configured',

        perplexity: 'No API key configured',

        claude: 'No API key configured',

        chatgpt: 'No API key configured'

      }

    };

  }

  
  
  // Create all analysis calls in parallel

  const analysisCalls = [];

  
  
  if (modelKeys.includes('gemini')) {

    analysisCalls.push({

      model: 'gemini',

      promise: withTimeout(

        queryGeminiVisibility(companyName, industry, [prompts.gemini[0]]),

        15000,

        { analysis: 'Timed out', visibilityScore: 0, keyMetrics: {}, breakdown: {} }

      ).catch(() => ({ analysis: 'Error', visibilityScore: 0, keyMetrics: {}, breakdown: {} }))

    });

  }

  
  
  if (modelKeys.includes('perplexity')) {

    analysisCalls.push({

      model: 'perplexity',

      promise: withTimeout(

        queryPerplexity(companyName, industry, [prompts.perplexity[0]]),

        15000,

        { analysis: 'Timed out', visibilityScore: 0, keyMetrics: {}, breakdown: {} }

      ).catch(() => ({ analysis: 'Error', visibilityScore: 0, keyMetrics: {}, breakdown: {} }))

    });

  }

  
  
  if (modelKeys.includes('claude')) {

    analysisCalls.push({

      model: 'claude',

      promise: withTimeout(

        queryClaude(companyName, industry, [prompts.claude[0]]),

        15000,

        { analysis: 'Timed out', visibilityScore: 0, keyMetrics: {}, breakdown: {} }

      ).catch(() => ({ analysis: 'Error', visibilityScore: 0, keyMetrics: {}, breakdown: {} }))

    });

  }

  
  
  if (modelKeys.includes('chatgpt')) {

    analysisCalls.push({

      model: 'chatgpt',

      promise: withTimeout(

        queryChatGPT(companyName, industry, [prompts.chatgpt[0]]),

        15000,

        { analysis: 'Timed out', visibilityScore: 0, keyMetrics: {}, breakdown: {} }

      ).catch(() => ({ analysis: 'Error', visibilityScore: 0, keyMetrics: {}, breakdown: {} }))

    });

  }

  
  
  console.log(`   Executing ${analysisCalls.length} parallel analysis calls...`);

  
  
  // Execute all calls in parallel

  const results = await Promise.all(analysisCalls.map(async (call) => {

    try {

      console.log(`   📞 Starting ${call.model} analysis...`);

      const result = await call.promise;

      console.log(`   ✅ ${call.model} analysis completed: Score ${result.visibilityScore || 0}`);

      return { model: call.model, result };

    } catch (error) {

      console.log(`   ❌ ${call.model} analysis failed: ${error.message}`);

      return { 

        model: call.model, 

        result: { analysis: 'Error', visibilityScore: 0, keyMetrics: {}, breakdown: {} }

      };

    }

  }));

  
  
  // Aggregate results

  const aiScores = { gemini: 0, perplexity: 0, claude: 0, chatgpt: 0 };

  const breakdowns = {};

  const keyMetrics = {};

  const analysis = {};

  
  
  results.forEach(({ model, result }) => {

    aiScores[model] = result.visibilityScore || 0;

    breakdowns[model] = result;

    keyMetrics[model] = result.keyMetrics || { brandMentions: 0, positiveWords: 0, negativeWords: 0 };

    analysis[model] = result.analysis || 'No analysis available';

  });

  
  
  console.log(`   ✅ Parallel analysis completed for ${companyName}`);

  return { aiScores, breakdowns, keyMetrics, analysis };

}



async function getVisibilityData(companyName, industry = '', options = {}) {

  const startTime = Date.now();

  console.log('🚀 Starting Optimized AI Visibility Analysis for:', companyName);

  console.log('📊 Industry context:', industry || 'Not specified');

  
  
  // Always run full analysis mode for comprehensive results

  const isFast = false; // Disabled fast mode - always run full analysis

  console.log('🔍 Full analysis mode enabled: comprehensive competitor detection and AI analysis');

  
  
  try {

    // Automatic industry and product detection if not provided (optimized in fast mode)

    let detectedIndustry = industry;

    let detectedProduct = '';

    
    
    // Start industry detection and search results in parallel for maximum speed

    const parallelTasks = [];

    
    
    if (!industry) {

        console.log('🔍 No industry specified, detecting automatically...');

        const detection = await detectIndustryAndProduct(companyName);

        detectedIndustry = detection.industry;

        detectedProduct = detection.product || inferProductFromCompanyName(companyName);

        console.log(`📊 Detected industry: ${detectedIndustry || 'Unknown'}`);

        console.log(`📊 Detected product: ${detectedProduct || 'Unknown'}`);

    }

    
    
    // If product still missing, kick off a quick product-only detection in parallel

    let productOnlyPromise = null;

    if (!detectedProduct) {

      console.log('🧪 Product not provided — attempting quick product inference...');

      productOnlyPromise = withTimeout(detectProductOnly(companyName), 6000, { product: inferProductFromCompanyName(companyName) }).catch(() => ({ product: inferProductFromCompanyName(companyName) }));

    }



    // Get search results for competitors (start in parallel with industry detection)

    let searchQuery = `"${companyName}" direct competitors business rivals ${detectedIndustry}`.trim();

    
    
    // Make search query more industry-specific

    if (detectedIndustry === 'media') {

      searchQuery = `"${companyName}" competitors media news journalism ${detectedIndustry}`;

    } else if (detectedIndustry === 'social') {

      searchQuery = `"${companyName}" competitors social media platforms ${detectedIndustry}`;

    } else if (detectedIndustry === 'professional') {

      searchQuery = `"${companyName}" competitors job sites professional networks ${detectedIndustry}`;

    } else if (detectedIndustry === 'fashion') {

      searchQuery = `"${companyName}" competitors fashion clothing brands ${detectedIndustry}`;

    } else if (detectedIndustry === 'tech') {

      searchQuery = `"${companyName}" competitors technology companies ${detectedIndustry}`;

    } else if (detectedIndustry === 'streaming') {

      searchQuery = `"${companyName}" competitors streaming entertainment platforms ${detectedIndustry}`;

    } else if (detectedIndustry === 'automotive') {

      searchQuery = `"${companyName}" competitors car manufacturers automotive ${detectedIndustry}`;

    }

    
    
    console.log('🔍 Search query:', searchQuery);

    
    
    let searchResults = [];

    try {

        searchResults = await queryCustomSearchAPI(searchQuery);

        console.log('📈 Found', searchResults.length, 'search results');

    } catch (error) {

      console.error('❌ Search API error:', error.message);

      console.log('⚠️ Using empty search results, will rely on competitor detection');

      searchResults = [];

    }

    
    
    const searchTime = Date.now();

    // Set product if quick product inference returned

    if (productOnlyPromise) {

      try {

        const p = await productOnlyPromise;

        if (!detectedProduct && p?.product) detectedProduct = p.product;

      } catch {}

    }

    console.log(`⏱️ Search and detections completed in ${searchTime - startTime}ms (product=${detectedProduct || 'Unknown'})`);

    
    
    // Detect competitors (comprehensive detection)

    console.log('🎯 Starting comprehensive competitor detection...');

    const competitorStartTime = Date.now();

    let competitors = [];

    
    
    // Always use comprehensive detection for full analysis

    console.log('🔍 Using comprehensive competitor detection for full analysis...');

    console.log(`[DEBUG] searchResults length: ${searchResults?.length || 0}`);

    console.log(`[DEBUG] searchResults sample:`, searchResults?.slice(0, 3) || []);

        try {

          competitors = await detectCompetitors(companyName, searchResults, detectedIndustry);

      console.log('✅ Comprehensive competitor detection complete. Found', competitors.length, 'competitors:', competitors);

    } catch (error) {

      console.error('❌ Comprehensive competitor detection failed:', error.message);

          competitors = [];

        }
    
    

    const competitorTime = Date.now();

    console.log(`⏱️ Competitor detection completed in ${competitorTime - competitorStartTime}ms`);
    
    

  // Only use fallback seeding if primary detection completely failed

  if (competitors.length < 2) {

    console.log(`⚠️ Primary detection found only ${competitors.length} competitors, using intelligent fallback...`);

    
    
    // Industry-specific fallback competitors when primary detection fails

    const industryCompetitors = {
      fashion: ['Zara', 'H&M', 'Uniqlo', 'Gap', 'Forever 21', 'Shein', 'ASOS', 'Boohoo'],
      automotive: ['Tesla', 'BMW', 'Mercedes-Benz', 'Toyota', 'Ford', 'Honda', 'Volkswagen', 'Audi'],
      tech: ['Apple', 'Google', 'Microsoft', 'Amazon', 'Meta', 'Samsung', 'IBM', 'Oracle'],
      streaming: ['Netflix', 'Disney+', 'Hulu', 'HBO Max', 'Amazon Prime Video', 'Apple TV+', 'Paramount+', 'Peacock'],
      media: ['CNN', 'BBC', 'Reuters', 'The New York Times', 'The Guardian', 'Fox News', 'Bloomberg', 'Al Jazeera'],
      social: ['Facebook', 'Instagram', 'Twitter', 'TikTok', 'LinkedIn', 'Snapchat', 'Pinterest', 'Reddit'],
      professional: ['LinkedIn', 'Indeed', 'Glassdoor', 'Monster', 'ZipRecruiter', 'CareerBuilder', 'Dice', 'SimplyHired'],
      ecommerce: ['Amazon', 'eBay', 'Walmart', 'Target', 'Etsy', 'Shopify', 'AliExpress', 'Wayfair'],
      beauty: ['Sephora', 'Ulta Beauty', 'MAC Cosmetics', 'Fenty Beauty', 'NYX', 'Maybelline', 'L\'Oréal', 'Clinique'],
      electronics: ['Best Buy', 'Newegg', 'B&H Photo', 'Micro Center', 'Fry\'s Electronics', 'TigerDirect', 'Adorama', 'Amazon'],
      food: ['Uber Eats', 'DoorDash', 'Grubhub', 'Postmates', 'Deliveroo', 'Just Eat', 'Zomato', 'Swiggy'],
      fitness: ['Peloton', 'Planet Fitness', 'LA Fitness', 'Gold\'s Gym', 'Equinox', '24 Hour Fitness', 'Anytime Fitness', 'Crunch'],
      travel: ['Expedia', 'Booking.com', 'Airbnb', 'Hotels.com', 'TripAdvisor', 'Kayak', 'Priceline', 'Trivago'],
      finance: ['Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'Capital One', 'American Express', 'PayPal', 'Venmo'],
      healthcare: ['CVS Health', 'Walgreens', 'UnitedHealth', 'Anthem', 'Cigna', 'Aetna', 'Humana', 'Kaiser Permanente'],
      education: ['Coursera', 'Udemy', 'Khan Academy', 'edX', 'Skillshare', 'LinkedIn Learning', 'Pluralsight', 'Udacity'],
      gaming: ['Steam', 'Epic Games', 'PlayStation Store', 'Xbox', 'Nintendo eShop', 'GOG', 'Origin', 'Battle.net'],
      music: ['Spotify', 'Apple Music', 'Amazon Music', 'YouTube Music', 'Tidal', 'Pandora', 'Deezer', 'SoundCloud'],
      home: ['Wayfair', 'IKEA', 'Home Depot', 'Lowe\'s', 'Bed Bath & Beyond', 'Williams-Sonoma', 'Crate & Barrel', 'West Elm'],
      grocery: ['Whole Foods', 'Trader Joe\'s', 'Kroger', 'Safeway', 'Albertsons', 'Publix', 'Wegmans', 'H-E-B']
    };

    
    
    // Better industry detection based on company name, provided industry, and context

    let detectedIndustryType = 'ecommerce'; // default

    
    
    // First, try to use the provided industry parameter

    if (detectedIndustry && detectedIndustry.trim().length > 0) {

      const industryLower = detectedIndustry.toLowerCase();

      if (industryLower.includes('media') || industryLower.includes('news') || industryLower.includes('journalism')) {

        detectedIndustryType = 'media';

      } else if (industryLower.includes('social') || industryLower.includes('community')) {

        detectedIndustryType = 'social';

      } else if (industryLower.includes('professional') || industryLower.includes('job') || industryLower.includes('career')) {

        detectedIndustryType = 'professional';

      } else if (industryLower.includes('fashion') || industryLower.includes('clothing') || industryLower.includes('apparel')) {

        detectedIndustryType = 'fashion';

      } else if (industryLower.includes('automotive') || industryLower.includes('car') || industryLower.includes('vehicle')) {

        detectedIndustryType = 'automotive';

      } else if (industryLower.includes('tech') || industryLower.includes('technology') || industryLower.includes('software')) {

        detectedIndustryType = 'tech';

      } else if (industryLower.includes('streaming') || industryLower.includes('entertainment') || industryLower.includes('video')) {

        detectedIndustryType = 'streaming';

      } else if (industryLower.includes('beauty') || industryLower.includes('cosmetic') || industryLower.includes('makeup')) {

        detectedIndustryType = 'beauty';

      } else if (industryLower.includes('electronic') || industryLower.includes('gadget') || industryLower.includes('device')) {

        detectedIndustryType = 'electronics';

      } else if (industryLower.includes('food') || industryLower.includes('restaurant') || industryLower.includes('delivery')) {

        detectedIndustryType = 'food';

      } else if (industryLower.includes('fitness') || industryLower.includes('gym') || industryLower.includes('workout')) {

        detectedIndustryType = 'fitness';

      } else if (industryLower.includes('travel') || industryLower.includes('hotel') || industryLower.includes('booking')) {

        detectedIndustryType = 'travel';

      } else if (industryLower.includes('finance') || industryLower.includes('bank') || industryLower.includes('payment')) {

        detectedIndustryType = 'finance';

      } else if (industryLower.includes('health') || industryLower.includes('medical') || industryLower.includes('pharma')) {

        detectedIndustryType = 'healthcare';

      } else if (industryLower.includes('education') || industryLower.includes('learning') || industryLower.includes('course')) {

        detectedIndustryType = 'education';

      } else if (industryLower.includes('gaming') || industryLower.includes('game') || industryLower.includes('esport')) {

        detectedIndustryType = 'gaming';

      } else if (industryLower.includes('music') || industryLower.includes('audio') || industryLower.includes('podcast')) {

        detectedIndustryType = 'music';

      } else if (industryLower.includes('home') || industryLower.includes('furniture') || industryLower.includes('decor')) {

        detectedIndustryType = 'home';

      } else if (industryLower.includes('grocery') || industryLower.includes('supermarket') || industryLower.includes('food retail')) {

        detectedIndustryType = 'grocery';

      }

    }

    
    
    // If no industry provided or not recognized, try company name detection

    if (detectedIndustryType === 'ecommerce') {

      if (companyName.toLowerCase().includes('fashion') || companyName.toLowerCase().includes('zara') || 

          companyName.toLowerCase().includes('h&m') || companyName.toLowerCase().includes('uniqlo') ||

          companyName.toLowerCase().includes('gap') || companyName.toLowerCase().includes('asos') ||

          companyName.toLowerCase().includes('mirraw') || companyName.toLowerCase().includes('ethnic') ||

          companyName.toLowerCase().includes('indian') || companyName.toLowerCase().includes('traditional') ||

          companyName.toLowerCase().includes('saree') || companyName.toLowerCase().includes('kurta') ||

          companyName.toLowerCase().includes('lehenga') || companyName.toLowerCase().includes('salwar')) {

        detectedIndustryType = 'fashion';

      } else if (companyName.toLowerCase().includes('tesla') || companyName.toLowerCase().includes('bmw') ||

                 companyName.toLowerCase().includes('mercedes') || companyName.toLowerCase().includes('toyota')) {

        detectedIndustryType = 'automotive';

      } else if (companyName.toLowerCase().includes('apple') || companyName.toLowerCase().includes('google') ||

                 companyName.toLowerCase().includes('microsoft') || companyName.toLowerCase().includes('samsung')) {

        detectedIndustryType = 'tech';

      } else if (companyName.toLowerCase().includes('netflix') || companyName.toLowerCase().includes('disney') ||

                 companyName.toLowerCase().includes('hulu') || companyName.toLowerCase().includes('spotify')) {

        detectedIndustryType = 'streaming';

      } else if (companyName.toLowerCase().includes('forbes') || companyName.toLowerCase().includes('reuters') ||

                 companyName.toLowerCase().includes('cnn') || companyName.toLowerCase().includes('bbc')) {

        detectedIndustryType = 'media';

      } else if (companyName.toLowerCase().includes('reddit') || companyName.toLowerCase().includes('facebook') ||

                 companyName.toLowerCase().includes('twitter') || companyName.toLowerCase().includes('instagram')) {

        detectedIndustryType = 'social';

      } else if (companyName.toLowerCase().includes('linkedin') || companyName.toLowerCase().includes('indeed') ||

                 companyName.toLowerCase().includes('glassdoor') || companyName.toLowerCase().includes('monster')) {

        detectedIndustryType = 'professional';

      }

    }

    
    
    console.log(`🎯 Fallback industry detection: ${detectedIndustryType} (from industry param: ${detectedIndustry})`);

    
    
    const suggestions = industryCompetitors[detectedIndustryType] || industryCompetitors['ecommerce'];

    
    
    const normMain = String(companyName || '').toLowerCase();

    const filteredSuggestions = suggestions.filter(s => s.toLowerCase() !== normMain);

    
    
    // Add fallback suggestions only if primary detection failed

    competitors = [...competitors, ...filteredSuggestions].slice(0, 8);

    console.log(`✅ Added ${detectedIndustryType} fallback suggestions. Final competitors:`, competitors);

  } else {

    console.log(`✅ Primary detection successful with ${competitors.length} competitors - no fallback needed`);

  }

    
    
    // No legacy competitor fallback — proceed only with detected competitors

    
    
    // Analyze AI visibility across models (optimized: use all models but with timeouts)

    console.log('🤖 Starting parallel AI analysis...');

    const aiStartTime = Date.now();

    
    
    // Include the main company in analysis

    const allCompanies = [companyName, ...competitors];

    console.log('📋 Companies to analyze:', allCompanies);

    console.log(`[DEBUG] Total companies for analysis: ${allCompanies.length}`);

    console.log(`[DEBUG] Main company: ${companyName}`);

    console.log(`[DEBUG] Competitors:`, competitors);

    
    
    // Process all companies in parallel for maximum speed

    const analysisPromises = allCompanies.map(async (competitorName) => {

      console.log(`🎯 Starting analysis for: ${competitorName}`);

      
      
      // Always perform website scraping for comprehensive analysis

      let scrapedData = null;

      {

        try {

          const searchResult = searchResults.find(item => 

            item.name.toLowerCase().includes(competitorName.toLowerCase())

          );

          if (searchResult?.link) {

            console.log(`🌐 Scraping website for ${competitorName}:`, searchResult.link);

            scrapedData = await scrapeWebsite(searchResult.link);

            console.log(`✅ Scraping complete for ${competitorName}:`, scrapedData.name || 'No title');

          } else {

            console.log(`⚠️ No website link found for ${competitorName}`);

          }

        } catch (error) {

          console.error(`❌ Scraping error for ${competitorName}:`, error.message);

        }

      }

      
      
      console.log(`🤖 Starting AI analysis for ${competitorName}...`);

      
      
      // Use enhanced prompts with detected industry and product

      const enhancedPrompts = getEnhancedPrompts(competitorName, detectedIndustry, detectedProduct);

      
      
      // Query all AI models in parallel for this competitor with enhanced error handling (full analysis mode)

      const [

        geminiResponse, perplexityResponse, 

        claudeResponse, chatgptResponse,

        audienceProfile,

        rawModelMetrics

      ] = await Promise.all([

        queryGeminiVisibility(competitorName, detectedIndustry, enhancedPrompts.gemini).catch(err => {

          console.error(`❌ Gemini error for ${competitorName}:`, err.message);

          return { 

            analysis: 'Gemini analysis unavailable due to service overload', 

            visibilityScore: 0, 

            keyMetrics: {},

            breakdown: {}

          };

        }),

        queryPerplexity(competitorName, detectedIndustry, enhancedPrompts.perplexity).catch(err => {

          console.error(`❌ Perplexity error for ${competitorName}:`, err.message);

          return { 

            analysis: 'Perplexity analysis unavailable due to service overload', 

            visibilityScore: 0, 

            keyMetrics: {},

            breakdown: {}

          };

        }),

        queryClaude(competitorName, detectedIndustry, enhancedPrompts.claude).catch(err => {

          console.error(`❌ Claude error for ${competitorName}:`, err.message);

          return { 

            analysis: 'Claude analysis unavailable due to service overload', 

            visibilityScore: 0, 

            keyMetrics: {},

            breakdown: {}

          };

        }),

        queryChatGPT(competitorName, detectedIndustry, enhancedPrompts.chatgpt).catch(err => {

          console.error(`❌ ChatGPT error for ${competitorName}:`, err.message);

          return { 

            analysis: 'ChatGPT analysis unavailable due to service overload', 

            visibilityScore: 0, 

            keyMetrics: {},

            breakdown: {}

          };

        }),

        withTimeout(getAudienceProfile(competitorName), 12000, null).catch(() => null),

        withTimeout(computePerModelRawMetrics(competitorName, false), 15000, { chatgpt: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, gemini: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, perplexity: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, claude: {mentions:0,prominence:0,sentiment:0,brandMentions:0} }).catch(() => ({ chatgpt: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, gemini: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, perplexity: {mentions:0,prominence:0,sentiment:0,brandMentions:0}, claude: {mentions:0,prominence:0,sentiment:0,brandMentions:0} }))

      ]);

      
      
      // Ensure all responses have valid structure

      const safeGeminiResponse = geminiResponse || { analysis: 'No analysis available', visibilityScore: 5, keyMetrics: {}, breakdown: {} };

      const safePerplexityResponse = perplexityResponse || { analysis: 'No analysis available', visibilityScore: 5, keyMetrics: {}, breakdown: {} };

      const safeClaudeResponse = claudeResponse || { analysis: 'No analysis available', visibilityScore: 5, keyMetrics: {}, breakdown: {} };

      const safeChatGPTResponse = chatgptResponse || { analysis: 'No analysis available', visibilityScore: 5, keyMetrics: {}, breakdown: {} };

      
      
      // Log response structures for debugging (truncate to keep logs small)

      console.log(`\n🔍 Response structures for ${competitorName} (truncated):`);

      const truncate = (obj) => {

        try {

          const str = JSON.stringify(obj);

          return str.length > 400 ? str.slice(0, 400) + '…' : str;

        } catch { return '[unserializable]'; }

      };

      console.log(`   Gemini:`, truncate(safeGeminiResponse));

      console.log(`   Perplexity:`, truncate(safePerplexityResponse));

      console.log(`   Claude:`, truncate(safeClaudeResponse));

      console.log(`   ChatGPT:`, truncate(safeChatGPTResponse));

      
      
      // Calculate scores from AI responses

      const scores = {

        gemini: geminiResponse.visibilityScore || 0,

        perplexity: perplexityResponse.visibilityScore || 0,

        claude: claudeResponse.visibilityScore || 0,

        chatgpt: chatgptResponse.visibilityScore || 0

      };

      
      
      const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) / 4;

      
      
      // Check service availability and provide detailed logging

      const serviceStatus = {

        gemini: !geminiResponse.error,

        perplexity: !perplexityResponse.error,

        claude: !claudeResponse.error,

        chatgpt: !chatgptResponse.error

      };

      
      
      const availableServices = Object.values(serviceStatus).filter(Boolean).length;

      console.log(`📊 Service Status for ${competitorName}:`);

      console.log(`   - Gemini: ${serviceStatus.gemini ? '✅ Available' : '❌ Overloaded'}`);

      console.log(`   - Perplexity: ${serviceStatus.perplexity ? '✅ Available' : '❌ Overloaded'}`);

      console.log(`   - Claude: ${serviceStatus.claude ? '✅ Available' : '❌ Overloaded'}`);

      console.log(`   - ChatGPT: ${serviceStatus.chatgpt ? '✅ Available' : '❌ Overloaded'}`);

      console.log(`   - Available Services: ${availableServices}/4`);

      
      
      console.log(`📈 Calculated scores for ${competitorName}:`);

      console.log(`   - Gemini: ${scores.gemini.toFixed(4)} ${!serviceStatus.gemini ? '(fallback)' : ''}`);

      console.log(`   - Perplexity: ${scores.perplexity.toFixed(4)} ${!serviceStatus.perplexity ? '(fallback)' : ''}`);

      console.log(`   - Claude: ${scores.claude.toFixed(4)} ${!serviceStatus.claude ? '(fallback)' : ''}`);

      console.log(`   - ChatGPT: ${scores.chatgpt.toFixed(4)} ${!serviceStatus.chatgpt ? '(fallback)' : ''}`);

      console.log(`   - Average Score: ${totalScore.toFixed(4)}`);

      
      
      if (availableServices < 2) {

        console.log(`⚠️ Warning: Only ${availableServices}/4 AI services available. Results may be less accurate.`);

      }

      
      
      return {

        name: competitorName,

        citationCount: Math.floor(totalScore * 100), // Mock citation count based on score

        mentions: Math.floor(totalScore * 50), // Add mentions data for frontend graphs

        brandMentions: Math.floor(totalScore * 50), // Add brandMentions for frontend

        aiScores: scores,

        totalScore: Number(totalScore.toFixed(4)),

        breakdowns: {

          gemini: geminiResponse.breakdown || {},

          perplexity: perplexityResponse.breakdown || {},

          claude: claudeResponse.breakdown || {},

          chatgpt: chatgptResponse.breakdown || {}

        },

        keyMetrics: {

          gemini: {

            ...geminiResponse.keyMetrics || {},

            mentionsCount: Math.floor(totalScore * 50), // Add mentionsCount for frontend

            brandMentions: Math.floor(totalScore * 50) // Add brandMentions for frontend

          },

          perplexity: {

            ...perplexityResponse.keyMetrics || {},

            mentionsCount: Math.floor(totalScore * 50),

            brandMentions: Math.floor(totalScore * 50)

          },

          claude: {

            ...claudeResponse.keyMetrics || {},

            mentionsCount: Math.floor(totalScore * 50),

            brandMentions: Math.floor(totalScore * 50)

          },

          chatgpt: {

            ...chatgptResponse.keyMetrics || {},

            mentionsCount: Math.floor(totalScore * 50),

            brandMentions: Math.floor(totalScore * 50)

          }

        },

        scrapedData: scrapedData,

        analysis: {

          gemini: geminiResponse.analysis || 'No analysis available',

          perplexity: perplexityResponse.analysis || 'No analysis available',

          claude: claudeResponse.analysis || 'No analysis available',

          chatgpt: chatgptResponse.analysis || 'No analysis available'

        },

        sourcesByTool: computeSourcesByToolFromTexts({

          gemini: { analysis: geminiResponse.analysis },

          perplexity: { analysis: perplexityResponse.analysis },

          claude: { analysis: claudeResponse.analysis },

          chatgpt: { analysis: chatgptResponse.analysis }

        }),

        audienceProfile: audienceProfile || null,

        rawModels: rawModelMetrics,

        snippets: {

          gemini: (geminiResponse.analysis || '').slice(0, 300),

          chatgpt: (chatgptResponse.analysis || '').slice(0, 300),

          claude: (claudeResponse.analysis || '').slice(0, 300),

          perplexity: (perplexityResponse.analysis || '').slice(0, 300)

        }

      };

    });

    
    
    // Wait for all analyses to complete

    console.log('⏳ Waiting for all parallel analyses to complete...');

    let analysisResults = await Promise.all(analysisPromises);

    console.log(`[DEBUG] Raw analysisResults count after Promise.all: ${analysisResults.length}`);

    console.log(`[DEBUG] Raw analysisResults names:`, analysisResults.map(r => r.name));

    // Compute normalized per-model scores from rawModels across all competitors

    const enriched = analysisResults.map(r => ({ name: r.name, rawModels: r.rawModels || { chatgpt: {}, gemini: {}, perplexity: {}, claude: {} } }));

    console.log(`[DEBUG] Enriched count: ${enriched.length}`);

    const normalized = normalizeAndScoreModels(enriched);

    console.log(`[DEBUG] Normalized count: ${normalized.length}`);

    // Ensure modelKeys is available in this scope for filtering

    const configuredModelKeys = getConfiguredModelKeys();

    const scoreByName = new Map(normalized.map(n => [n.name, n.aiScores]));

    analysisResults = analysisResults.map(r => {

      // Use normalized CSE-based scores only for models that actually ran; zero otherwise

      const norm = scoreByName.get(r.name) || r.aiScores || { chatgpt: 0, gemini: 0, perplexity: 0, claude: 0 };

      const newScores = {

        chatgpt: configuredModelKeys.includes('chatgpt') ? norm.chatgpt : 0,

        gemini: configuredModelKeys.includes('gemini') ? norm.gemini : 0,

        perplexity: configuredModelKeys.includes('perplexity') ? norm.perplexity : 0,

        claude: configuredModelKeys.includes('claude') ? norm.claude : 0,

      };

      const avg = (newScores.chatgpt + newScores.gemini + newScores.perplexity + newScores.claude) / 4;

      return { ...r, aiScores: newScores, totalScore: Number(avg.toFixed(4)) };

    });



    // Compute AI Traffic shares using a small query pool (fast/full)

    console.log('\n🚀 Starting AI Traffic Share and Citation Metrics calculation...');

    console.log(`   Companies: ${allCompanies.join(', ')}`);

    console.log(`   Industry: ${detectedIndustry}`);

    console.log(`   Full analysis mode enabled`);

    
    
    try {

      console.log('📊 Calling computeAiTrafficShares...');

      const trafficPromise = computeAiTrafficShares(allCompanies, detectedIndustry, { companyName, product: detectedProduct })

        .then(result => {

          console.log('✅ AI Traffic (counts) calculation completed successfully');

          if (result && result.countsByCompetitor) {

            console.log('   Traffic results (counts):');

            Object.keys(result.countsByCompetitor).forEach(competitor => {

              const data = result.countsByCompetitor[competitor];

              const p = data.placementTotals || { first: 0, second: 0, third: 0 };

              console.log(`     ${competitor}: total=${data.totalMentions}, P1=${p.first}, P2=${p.second}, P3+=${p.third}`);

            });

          } else {

            console.log('   ⚠️ Traffic result is null/undefined');

          }

          return result;

        })

        .catch(error => {

          console.log('❌ AI Traffic Share calculation failed:', error.message);

          console.log('   Stack trace:', error.stack);

          return null;

        });



      console.log('📈 Calling computeCitationMetrics...');

      const citationsPromise = computeCitationMetrics(allCompanies, detectedIndustry, { companyName, product: detectedProduct })

        .then(result => {

          console.log('✅ AI Citation Metrics calculation completed successfully');

          if (result) {

            console.log('   Citation results:');

            Object.keys(result).forEach(competitor => {

              const data = result[competitor];

              if (data && data.global) {

                console.log(`     ${competitor}: Global ${(data.global.citationScore * 100).toFixed(1)}%`);

              } else {

                console.log(`     ${competitor}: No citation data`);

              }

            });

          } else {

            console.log('   ⚠️ Citation result is null/undefined');

          }

          return result;

        })

        .catch(error => {

          console.log('❌ AI Citation Metrics calculation failed:', error.message);

          console.log('   Stack trace:', error.stack);

          return null;

        });



      const shoppingPromise = computeShoppingVisibilityCounts(allCompanies, detectedProduct, (options?.country || ''))

        .catch(() => null);



      // Run a separate citation-first capture to extract exact domains for source donuts

      const citationPrompts = getCitationPromptBank({ company: companyName, industry: detectedIndustry, product: detectedProduct, country: options?.country || '' });

      const sourceCapturePromise = (async () => {

        const tools = getConfiguredModelKeys();

        const calls = [];

        // Mix citation-first and content-style prompts for better style/domain capture

        const stylePrompts = getContentStylePromptBank({ company: companyName, competitorA: allCompanies[1] || '', competitorB: allCompanies[2] || '', industry: detectedIndustry, product: detectedProduct, country: options?.country || '' });

        tools.forEach(tool => {

          citationPrompts.slice(0, 6).forEach((q, i) => { calls.push({ model: tool, idx: i, prompt: q }); });

          stylePrompts.slice(0, 6).forEach((q, i) => { calls.push({ model: tool, idx: i + 100, prompt: q }); });

        });

        const responses = await Promise.all(calls.map(async c => {

          const text = await withTimeout(callModelSimple(c.model, c.prompt), 14000, '').catch(() => '');

          return { model: c.model, text };

        }));

        // Aggregate by tool

        const agg = {};

        const toolsList = getConfiguredModelKeys();

        toolsList.forEach(t => { agg[t] = { counts: { 'Blogs / Guides':0, 'Review Sites / Forums':0, 'Marketplaces':0, 'News / PR Mentions':0, 'Directories / Comparison':0 }, examples: [] }; });

        responses.forEach(r => {

          const classified = computeSourcesByToolFromTexts({ [r.model]: { analysis: r.text } });

          const entry = classified[r.model];

          if (!entry) return;

          Object.keys(entry.counts || {}).forEach(cat => { agg[r.model].counts[cat] += Number(entry.counts[cat] || 0); });

          (entry.examples || []).forEach(ex => { agg[r.model].examples.push(ex); });

        });

        return agg;

      })();



      const [traffic, citations, shopping, sourceCapture] = await Promise.all([trafficPromise, citationsPromise, shoppingPromise, sourceCapturePromise]);

      
      
      console.log('\n📋 Processing results...');

      console.log(`   Traffic result: ${traffic ? 'SUCCESS' : 'FAILED'}`);

      console.log(`   Citations result: ${citations ? 'SUCCESS' : 'FAILED'}`);

      
      
      // Sentiment capture – targeted prompts per competitor with citation requirement

      const toolsForSent = getConfiguredModelKeys();

      const sentCalls = [];

      const mkSentPromptsFor = (name) => {

        const base = [

          `Summarize shopper sentiment toward ${name} in ${detectedIndustry || '[industry]'} for ${detectedProduct || '[product]'}.

Answer briefly. Then output a Sources section with 1–3 items as: Category | Domain | URL. Use real HTTPS links (no placeholders). Include ONE short quoted sentence that contains the brand name (e.g., "${name} ..."). Return Tone (Positive/Neutral/Negative/Mixed) and the main reason (price, delivery, trust, sustainability, UX).`,

          `Pros and cons for ${name} in ${detectedIndustry || '[industry]'}.

Answer briefly. Then output a Sources section with 1–3 items as: Category | Domain | URL. Include ONE direct quote with the brand name ("${name} ...").`,

          `Recent perception of ${name}: price, delivery, trust. Provide ONE quoted sentence that includes the brand name.

Answer briefly. Then output a Sources section with 1–3 items as: Category | Domain | URL.`

        ];

        return base.slice(0, 3);

      };

      allCompanies.forEach(name => {

        toolsForSent.forEach(tool => {

          mkSentPromptsFor(name).forEach((q, i) => sentCalls.push({ model: tool, name, idx: i, prompt: q }));

        });

      });

      const sentResponses = await Promise.all(sentCalls.map(async c => {

        const text = await withTimeout(callModelSimple(c.model, c.prompt), 15000, '').catch(() => '');

        return { model: c.model, name: c.name, text };

      }));

      // Build sentiment rows per competitor from these responses

      const sentimentByCompetitor = {};

      allCompanies.forEach(n => { sentimentByCompetitor[n] = []; });

      sentResponses.forEach(rsp => {

        const name = rsp.name;

        const txtRaw = String(rsp.text || '');

        if (!txtRaw) return;

        if (isNonInformativeSentimentText(txtRaw)) return; // skip prompts asking for product

        const txt = txtRaw;

        if (!txt) return;

        const tone = detectToneFromText(txt);

        const quoteDirect = extractQuotedSentenceWithName(txt, name);

        const quote = quoteDirect || extractSentenceWithName(txt, name);

        const source = classifySourceCategoryFromText(txt);

        const attr = detectAttributeFromText(txt);

        const takeaway = tone === 'Positive' ? 'Positive framing may boost authority and conversions.' : tone === 'Negative' ? 'Visibility present but negative sentiment — address issues with content.' : tone === 'Mixed' ? 'Mixed perception — clarify value props where weak.' : 'Neutral presence — opportunity to shape narrative.';

        sentimentByCompetitor[name].push({ name, tone, quote, source, attr, takeaway });

      });



      analysisResults = analysisResults.map(r => {

        const aiTraffic = traffic ? (traffic.countsByCompetitor?.[r.name] || { totalMentions: 0, byModel: {}, placementByModel: {}, placementTotals: { first: 0, second: 0, third: 0 } }) : undefined;

        const citationsFor = citations ? (citations[r.name] || undefined) : undefined;

        const shoppingFor = shopping ? (shopping.countsByCompetitor?.[r.name] || { total: 0, byModel: {} }) : undefined;

        // Attach aggregated domain sources by tool (global across prompts)

        const sourcesByTool = sourceCapture || undefined;

        // Content style counts from all analyses

        const styleCounts = mergeStyleCounts(

          mergeStyleCounts(computeContentStyleCountsFromText(r?.analysis?.gemini), computeContentStyleCountsFromText(r?.analysis?.chatgpt)),

          mergeStyleCounts(computeContentStyleCountsFromText(r?.analysis?.perplexity), computeContentStyleCountsFromText(r?.analysis?.claude))

        );

        const styleSource = 'backend';

        
        
        console.log(`   ${r.name}:`);

        if (aiTraffic) {

          const p = aiTraffic.placementTotals || { first: 0, second: 0, third: 0 };

          console.log(`     AI Visibility: total=${aiTraffic.totalMentions}, P1=${p.first}, P2=${p.second}, P3+=${p.third}`);

        } else {

          console.log('     AI Visibility: UNDEFINED');

        }

        console.log(`     Citations: ${citationsFor ? `Global ${(citationsFor.global?.citationScore * 100).toFixed(1)}%` : 'UNDEFINED'}`);

        console.log(`     Shopping Mentions: ${shoppingFor ? shoppingFor.total : 'UNDEFINED'}`);



        // Backend competitor type classification for logs (parity with UI)

        try {

          const texts = [r?.analysis?.gemini, r?.analysis?.chatgpt, r?.analysis?.perplexity, r?.analysis?.claude]

            .map(x => String(x || '')).join('\n');

          const t = classifyCompetitorTypeServer(r.name, texts, shoppingFor?.total || 0);

          console.log(`     Type (heuristic): ${t}`);

        } catch {}

        
        
        console.log(`     Content Style (source=${styleSource}):`, styleCounts);

        // Product Attribute Mentions aggregated from model analyses

        const attrCounts = mergeAttributeCounts(

          mergeAttributeCounts(

            computeAttributeCountsFromText(r?.analysis?.gemini, r.name),

            computeAttributeCountsFromText(r?.analysis?.chatgpt, r.name)

          ),

          mergeAttributeCounts(

            computeAttributeCountsFromText(r?.analysis?.perplexity, r.name),

            computeAttributeCountsFromText(r?.analysis?.claude, r.name)

          )

        );

        console.log('     Product Attributes:', attrCounts);

        // Sentiment rows for this competitor

        // Prioritize rows: Positive/Negative first, then Mixed, then Neutral

        const rawRows = sentimentByCompetitor[r.name] || [];

        const priority = { Positive: 0, Negative: 0, Mixed: 1, Neutral: 2 };

        const sentimentRows = rawRows

          .sort((a, b) => (priority[a.tone] ?? 3) - (priority[b.tone] ?? 3))

          .slice(0, 3);

        sentimentRows.forEach((row, i) => console.log(`     [Sentiment R${i + 1}] Tone=${row.tone} | Quote="${row.quote}" | Source=${row.source} | Attr=${row.attr}`));

        // Authority signals for this competitor

        const authoritySignals = [];

        const allTexts = [r?.analysis?.gemini, r?.analysis?.chatgpt, r?.analysis?.perplexity, r?.analysis?.claude]

          .filter(Boolean).map(t => String(t || '').toLowerCase()).join(' ');

        

        // Detect authority signals from text

        const reviewMatches = (allTexts.match(/\b(review|rating|trustpilot|star|testimonial|feedback)\b/gi) || []).length;

        const backlinkMatches = (allTexts.match(/\b(backlink|domain authority|da|link profile|seo|ranking)\b/gi) || []).length;

        const prMatches = (allTexts.match(/\b(forbes|techcrunch|press|pr coverage|news|featured|editorial)\b/gi) || []).length;

        const certMatches = (allTexts.match(/\b(certified|certification|ssl|badge|award|best of|winner)\b/gi) || []).length;

        

        if (reviewMatches > 0) authoritySignals.push({ signal: 'Reviews', count: reviewMatches, example: 'Customer reviews and ratings' });

        if (backlinkMatches > 0) authoritySignals.push({ signal: 'Backlinks', count: backlinkMatches, example: 'High-quality backlinks' });

        if (prMatches > 0) authoritySignals.push({ signal: 'PR Coverage', count: prMatches, example: 'Media mentions and press coverage' });

        if (certMatches > 0) authoritySignals.push({ signal: 'Certifications/Awards', count: certMatches, example: 'Industry certifications and awards' });

        

        console.log(`     Authority signals: ${authoritySignals.length} types detected`);

        

        // FAQ/Conversational mentions for this competitor

        const faqData = [];

        

        // Extract FAQ-style questions from each model's analysis separately

        const modelTexts = [

          { name: 'gemini', text: r?.analysis?.gemini || '' },

          { name: 'chatgpt', text: r?.analysis?.chatgpt || '' },

          { name: 'perplexity', text: r?.analysis?.perplexity || '' },

          { name: 'claude', text: r?.analysis?.claude || '' }

        ];

        

        modelTexts.forEach(modelData => {

          const text = String(modelData.text).toLowerCase();

          const questions = text.match(/\b(is|are|does|can|should|will|what|where|when|why|how)\s+[^.!?]{5,80}[.?]/gi) || [];

          

          questions.slice(0, 2).forEach(q => {

            // Determine source from surrounding context (200 chars around question)

            const qIndex = text.indexOf(q.toLowerCase());

            const contextStart = Math.max(0, qIndex - 200);

            const contextEnd = Math.min(text.length, qIndex + q.length + 200);

            const context = text.substring(contextStart, contextEnd);

            

            let source = 'AI Analysis';

            if (context.includes('reddit.com') || context.includes('reddit user') || context.includes('on reddit')) source = 'Reddit';

            else if (context.includes('quora.com') || context.includes('quora user') || context.includes('on quora')) source = 'Quora';

            else if (context.includes('trustpilot.com') || context.includes('trustpilot review')) source = 'Trustpilot';

            else if (context.includes('forum') || context.includes('discussion board')) source = 'Forums';

            

            // Determine theme from question content

            let theme = 'General';

            const qLower = q.toLowerCase();

            if (qLower.match(/\b(safe|secure|checkout|payment|scam|fraud)\b/)) theme = 'Safe checkout';

            else if (qLower.match(/\b(ship|delivery|fast|arrive|prime|shipping time)\b/)) theme = 'Fast shipping';

            else if (qLower.match(/\b(return|refund|exchange|policy|money back)\b/)) theme = 'Return policy';

            else if (qLower.match(/\b(review|trust|rating|recommend|reliable)\b/)) theme = 'Trusted reviews';

            else if (qLower.match(/\b(genuine|fake|authentic|legit|counterfeit|real)\b/)) theme = 'Authenticity';

            

            faqData.push({ question: q.trim(), source, theme, model: modelData.name });

          });

        });

        

        console.log(`     FAQ mentions: ${faqData.length} questions extracted`);

        

        return { ...r, aiTraffic, citations: citationsFor, shopping: shoppingFor, sourcesByTool, contentStyle: styleCounts, contentStyleSource: styleSource, sentiment: sentimentRows, productAttributes: attrCounts, authority: authoritySignals, faq: faqData };

      });

    } catch (e) { 

      console.log('❌ Error in AI Traffic/Citation calculation:', e.message);

      console.log('   Stack trace:', e.stack);

    }



    // Compute RAVI per competitor

    analysisResults = analysisResults.map(r => ({

      ...r,

      ravi: computeRaviForCompetitor(r)

    }));

    console.log('✅ All parallel analyses completed!');

    
    
    const aiTime = Date.now();

    console.log(`⏱️ AI analysis completed in ${aiTime - aiStartTime}ms`);

    
    
    console.log('\n🎉 Optimized AI Visibility Analysis complete!');

    console.log('📋 Final results:');

    console.log(`[DEBUG] Final analysisResults count: ${analysisResults.length}`);

    analysisResults.forEach(comp => {

      console.log(`   - ${comp.name}: Score ${comp.totalScore}/10`);

    });

    console.log(`[DEBUG] Final analysisResults names:`, analysisResults.map(r => r.name));

    
    
    // Fallback: if no competitors found, use legacy discovery

    if (!analysisResults || analysisResults.length === 0) {

      try {

        console.log('⚠️ No competitors from AI analysis. Falling back to legacy discovery...');

        const CompetitorDiscoveryService = require('./competitorDiscovery');

        const discovery = new CompetitorDiscoveryService();

        const fallback = await discovery.discoverCompetitors(companyName, detectedIndustry || industry || 'general');

        if (fallback?.success && Array.isArray(fallback.competitors) && fallback.competitors.length > 0) {

          analysisResults = fallback.competitors.map(c => ({

            name: c.name || c.domain || 'Unknown',

            domain: c.domain || '',

            totalScore: 5,

            aiScores: { gemini: 0, perplexity: 0, claude: 0, chatgpt: 0 },

            aiTraffic: { totalMentions: 0, placementTotals: { first: 0, second: 0, third: 0 } },

            citations: { global: { citationScore: 0 } },

            shopping: { total: 0, byModel: {} },

            sentiment: [],

            contentStyle: { List: 0, Comparison: 0, Recommendation: 0, FAQ: 0, Editorial: 0 },

            productAttributes: {},

          }));

        }

      } catch (e) {

        console.warn('Fallback discovery failed:', e?.message);

      }

    }

    
    
    // Calculate overall service status

    const overallServiceStatus = {

      gemini: analysisResults.some(r => !r.breakdowns?.gemini?.error),

      perplexity: analysisResults.some(r => !r.breakdowns?.perplexity?.error),

      claude: analysisResults.some(r => !r.breakdowns?.claude?.error),

      chatgpt: analysisResults.some(r => !r.breakdowns?.chatgpt?.error)

    };

    
    
    const totalTime = Date.now() - startTime;

    console.log(`\n⏱️ Total analysis time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);

    console.log(`📊 Performance breakdown:`);

    console.log(`   - Search & Industry: ${searchTime - startTime}ms`);

    console.log(`   - Competitor Detection: ${competitorTime - competitorStartTime}ms`);

    console.log(`   - AI Analysis: ${aiTime - aiStartTime}ms`);

    
    
    // Persist run rows for engagement/growth later

    try {

      const savePromises = analysisResults.map(async (r) => {

        try {

          await db.saveAiVisibilityRun({

            id: require('crypto').randomUUID(),

            company: companyName,

            competitor: r.name,

            totalScore: r.totalScore,

            aiScores: r.aiScores

          });

        } catch {}

        try {

          if (r.ravi?.rounded !== undefined) {

            await db.saveVisibilityLog({

              id: require('crypto').randomUUID(),

              competitor: r.name,

              metric: 'RAVI',

              value: Number(r.ravi.rounded) || 0

            });

          }

          if (r.aiTraffic?.global !== undefined) {

            await db.saveVisibilityLog({

              id: require('crypto').randomUUID(),

              competitor: r.name,

              metric: 'AI_Traffic_Share',

              value: Number(r.aiTraffic.global) || 0

            });

          }

          if (r.citations?.global?.citationScore !== undefined) {

            await db.saveVisibilityLog({

              id: require('crypto').randomUUID(),

              competitor: r.name,

              metric: 'CitationScore',

              value: Number(r.citations.global.citationScore) * 100 || 0

            });

          }

        } catch {}

      });

      await Promise.all(savePromises);

    } catch {}



    return {

      company: companyName,

      industry: industry,

      competitors: analysisResults,

      serviceStatus: overallServiceStatus

    };
    
    

  } catch (error) {

    const totalTime = Date.now() - startTime;

    console.error(`AI Visibility Analysis error after ${totalTime}ms:`, error);

    throw new Error(`Failed to analyze AI visibility: ${error.message}`);

  }

}



// Analyze a single competitor for AI visibility

async function analyzeSingleCompetitor(competitorName, industry = '') {

  console.log(`\n🎯 Analyzing single competitor: ${competitorName}`);

  console.log(`📋 Industry context: ${industry || 'Not specified'}`);

  
  
  try {

    // Detect industry and product if not provided

    let detectedIndustry = industry;

    let detectedProduct = '';

    
    
    if (!industry) {

      console.log('🔍 Detecting industry and product automatically...');

      const detection = await detectIndustryAndProduct(competitorName);

      detectedIndustry = detection.industry;

      detectedProduct = detection.product;

      console.log(`   ✅ Detected industry: ${detectedIndustry}`);

      console.log(`   ✅ Detected product: ${detectedProduct}`);

    }

    
    
    // Get enhanced prompts

    const enhancedPrompts = getEnhancedPrompts(competitorName, detectedIndustry, detectedProduct);

    
    
    console.log(`\n📝 Enhanced prompts for ${competitorName}:`);

    console.log(`   Gemini prompts:`, enhancedPrompts.gemini);

    console.log(`   Perplexity prompts:`, enhancedPrompts.perplexity);

    console.log(`   Claude prompts:`, enhancedPrompts.claude);

    console.log(`   ChatGPT prompts:`, enhancedPrompts.chatgpt);

    
    
    console.log('\n🤖 Querying AI models in parallel for visibility analysis...');

    
    
    // Query all AI models in parallel for maximum speed

    const [

      geminiResponse, perplexityResponse, 

      claudeResponse, chatgptResponse,

      audienceProfile

    ] = await Promise.all([

      queryGeminiVisibility(competitorName, detectedIndustry, enhancedPrompts.gemini).catch(err => {

        console.error(`❌ Gemini error for ${competitorName}:`, err.message);

        console.error(`   Stack trace:`, err.stack);

        return { 

          analysis: 'Analysis unavailable', 

          visibilityScore: 0, 

          keyMetrics: {},

          breakdown: {}

        };

      }),

      queryPerplexity(competitorName, detectedIndustry, enhancedPrompts.perplexity).catch(err => {

        console.error(`❌ Perplexity error for ${competitorName}:`, err.message);

        console.error(`   Stack trace:`, err.stack);

        return { 

          analysis: 'Analysis unavailable', 

          visibilityScore: 0, 

          keyMetrics: {},

          breakdown: {}

        };

      }),

      queryClaude(competitorName, detectedIndustry, enhancedPrompts.claude).catch(err => {

        console.error(`❌ Claude error for ${competitorName}:`, err.message);

        console.error(`   Stack trace:`, err.stack);

        return { 

          analysis: 'Analysis unavailable', 

          visibilityScore: 0, 

          keyMetrics: {},

          breakdown: {}

        };

      }),

      queryChatGPT(competitorName, detectedIndustry, enhancedPrompts.chatgpt).catch(err => {

        console.error(`❌ ChatGPT error for ${competitorName}:`, err.message);

        console.error(`   Stack trace:`, err.stack);

        return { 

          analysis: 'Analysis unavailable', 

          visibilityScore: 0, 

          keyMetrics: {},

          breakdown: {}

        };

      }),

      withTimeout(getAudienceProfile(competitorName), 12000, null).catch(() => null)

    ]);

    
    
    console.log(`\n🔍 Raw AI responses for ${competitorName}:`);

    console.log(`   Gemini:`, geminiResponse ? 'Success' : 'Failed');

    console.log(`   Perplexity:`, perplexityResponse ? 'Success' : 'Failed');

    console.log(`   Claude:`, claudeResponse ? 'Success' : 'Failed');

    console.log(`   ChatGPT:`, chatgptResponse ? 'Success' : 'Failed');

    
    
    // Ensure all responses have valid structure (no inflated defaults)

    const safeGeminiResponse = geminiResponse || { analysis: 'No analysis available', visibilityScore: 0, keyMetrics: {}, breakdown: {} };

    const safePerplexityResponse = perplexityResponse || { analysis: 'No analysis available', visibilityScore: 0, keyMetrics: {}, breakdown: {} };

    const safeClaudeResponse = claudeResponse || { analysis: 'No analysis available', visibilityScore: 0, keyMetrics: {}, breakdown: {} };

    const safeChatGPTResponse = chatgptResponse || { analysis: 'No analysis available', visibilityScore: 0, keyMetrics: {}, breakdown: {} };

    
    
    // Log response structures for debugging

    console.log(`\n🔍 Response structures for ${competitorName}:`);

    console.log(`   Gemini:`, JSON.stringify(safeGeminiResponse, null, 2));

    console.log(`   Perplexity:`, JSON.stringify(safePerplexityResponse, null, 2));

    console.log(`   Claude:`, JSON.stringify(safeClaudeResponse, null, 2));

    console.log(`   ChatGPT:`, JSON.stringify(safeChatGPTResponse, null, 2));

    
    
    // Calculate scores (no positive fallbacks)

    const scores = {

      gemini: (safeGeminiResponse.visibilityScore || 0),

      perplexity: (safePerplexityResponse.visibilityScore || 0),

      claude: (safeClaudeResponse.visibilityScore || 0),

      chatgpt: (safeChatGPTResponse.visibilityScore || 0)

    };

    
    
    const totalScore = (scores.gemini + scores.perplexity + scores.claude + scores.chatgpt) / 4;

    
    
    console.log(`\n📊 AI Visibility Scores for ${competitorName}:`);

    console.log(`   - Gemini: ${scores.gemini.toFixed(4)}`);

    console.log(`   - Perplexity: ${scores.perplexity.toFixed(4)}`);

    console.log(`   - Claude: ${scores.claude.toFixed(4)}`);

    console.log(`   - ChatGPT: ${scores.chatgpt.toFixed(4)}`);

    console.log(`   - Average: ${totalScore.toFixed(4)}`);

    
    
    const competitorAnalysis = {

      name: competitorName,

      citationCount: Math.floor(totalScore * 100),

      mentions: Math.floor(totalScore * 50), // Add mentions data for frontend graphs

      brandMentions: Math.floor(totalScore * 50), // Add brandMentions for frontend

      aiScores: scores,

      totalScore: Number(totalScore.toFixed(4)),

      breakdowns: {

        gemini: safeGeminiResponse.breakdown || {},

        perplexity: safePerplexityResponse.breakdown || {},

        claude: safeClaudeResponse.breakdown || {},

        chatgpt: safeChatGPTResponse.breakdown || {}

      },

      keyMetrics: {

        gemini: {

          ...safeGeminiResponse.keyMetrics || {},

          mentionsCount: Math.floor(totalScore * 50), // Add mentionsCount for frontend

          brandMentions: Math.floor(totalScore * 50) // Add brandMentions for frontend

        },

        perplexity: {

          ...safePerplexityResponse.keyMetrics || {},

          mentionsCount: Math.floor(totalScore * 50),

          brandMentions: Math.floor(totalScore * 50)

        },

        claude: {

          ...safeClaudeResponse.keyMetrics || {},

          mentionsCount: Math.floor(totalScore * 50),

          brandMentions: Math.floor(totalScore * 50)

        },

        chatgpt: {

          ...safeChatGPTResponse.keyMetrics || {},

          mentionsCount: Math.floor(totalScore * 50),

          brandMentions: Math.floor(totalScore * 50)

        }

      },

      scrapedData: null, // Not needed for single competitor

      analysis: {

        gemini: safeGeminiResponse.analysis || 'No analysis available',

        perplexity: safePerplexityResponse.analysis || 'No analysis available',

        claude: safeClaudeResponse.analysis || 'No analysis available',

        chatgpt: safeChatGPTResponse.analysis || 'No analysis available'

      },

      audienceProfile: audienceProfile || null

    };

    
    
    console.log(`\n✅ Single competitor analysis complete for ${competitorName}`);

    console.log(`📋 Final result: Score ${totalScore.toFixed(4)}/10`);

    
    
    return competitorAnalysis;
    
    

  } catch (error) {

    console.error('Single competitor analysis error:', error);

    throw new Error(`Failed to analyze competitor ${competitorName}: ${error.message}`);

  }

}



module.exports = {

  getVisibilityData,

  quickDetectCompetitors,

  queryCustomSearchAPI,

  detectCompetitors,

  queryGeminiVisibility,

  queryPerplexity,

  queryClaude,

  queryChatGPT,

  scrapeWebsite,

  analyzeVisibility,

  calculateVisibilityScore,

  getGeminiPrompts,

  getPerplexityPrompts,

  getClaudePrompts,

  getChatGPTPrompts,

  detectIndustryAndProduct,

  getConfiguredModelKeys,

  callModelSimple,

  computeCitationMetrics,

  detectMentionRobust,

  quickSentimentScore,

  sentimentWeightFromScore,

  computeProminenceFactorFromText,

  getEnhancedPrompts,

  analyzeSingleCompetitor

}; 