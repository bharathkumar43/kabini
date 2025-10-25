# 📊 Dashboard Backend Audit - What's Being Calculated

## DASHBOARD UI - WHAT IT ACTUALLY SHOWS

### **Card 1: Overall AI Visibility Score**
**Needs:**
- `aiScores.chatgpt`
- `aiScores.gemini` 
- `aiScores.claude`
- `aiScores.perplexity`
- **Calculation**: Average of 4 scores × 10 = Score out of 100

### **Card 2: AI Platform Presence**
**Needs:**
- Same `aiScores` (to show which platforms are available)
- Shows checkmarks for platforms with score > 0

### **Card 3: Share of AI Voice**
**Needs:**
- `keyMetrics.gemini.brandMentions` (your mentions)
- `keyMetrics.gemini.brandMentions` (all competitors' mentions)
- **Calculation**: Your mentions / Total mentions × 100 = Share %
- Also uses `breakdowns.sentimentScore` for sentiment-adjusted share

### **Card 4: Competitor Benchmark**
**Needs:**
- List of competitor names
- Their scores
- Shows top competitors

### **Card 5: Top Products KPI**
- Uses Shopify data (not backend AI)

### **Card 6: Product Performance**
- Uses Shopify data (not backend AI)

### **Card 7: Sentiment Analysis Card**
**Needs:**
- `breakdowns.sentimentScore` from each AI
- Positive/Neutral/Negative percentages

---

## BACKEND - WHAT IT'S CURRENTLY CALCULATING

### **✅ NEEDED for Dashboard:**

1. **aiScores** (chatgpt, gemini, claude, perplexity) ✅
   - Used in: OverallAIVisibilityScoreCard, AIPlatformPresenceBreakdown

2. **breakdowns** (mentionsScore, sentimentScore, etc.) ✅
   - Used in: SentimentAnalysisCard

3. **keyMetrics** (brandMentions, mentionsCount) ✅
   - Used in: ShareOfAIVoiceCard

4. **Competitor list** ✅
   - Used in: CompetitorBenchmarkCard

---

## BACKEND - EXTRA CALCULATIONS (NOT SHOWN IN DASHBOARD UI)

### **❌ NOT NEEDED for Dashboard (Can be removed/skipped):**

1. **scrapedData** (website scraping for each competitor)
   - NOT displayed in Dashboard
   - Takes: ~2 seconds per competitor
   - **Recommendation**: Skip for Dashboard

2. **sourcesByTool** (source citations analysis)
   - NOT displayed in Dashboard (only in Competitor Insight)
   - Takes: Extra processing time
   - **Recommendation**: Skip for Dashboard

3. **sourceCapturePromise** (detailed source extraction)
   - Runs 12+ extra AI queries just for source analysis
   - NOT displayed in Dashboard
   - Takes: ~15-20 seconds
   - **Recommendation**: Skip for Dashboard

4. **sentResponses** (detailed sentiment with quotes)
   - Runs 3 prompts per competitor per AI tool
   - Creates detailed sentiment rows with quotes
   - Dashboard only shows sentiment SCORE, not quotes
   - Takes: ~20-30 seconds
   - **Recommendation**: Skip for Dashboard (just extract sentiment from main analysis)

5. **computeCitationMetrics** (detailed citation analysis)
   - NOT displayed in Dashboard
   - Takes: ~10-15 seconds
   - **Recommendation**: Skip for Dashboard

6. **computeShoppingVisibilityCounts** (shopping mentions)
   - NOT displayed in Dashboard (only in Competitor Insight)
   - Takes: Extra processing
   - **Recommendation**: Skip for Dashboard

7. **FAQ data** (conversational mentions analysis)
   - NOT displayed in Dashboard (only in Competitor/Product Insight)
   - Takes: Extra processing
   - **Recommendation**: Skip for Dashboard

8. **Authority signals** (reviews, backlinks, PR, certifications)
   - NOT displayed in Dashboard (only in Competitor/Product Insight)
   - Takes: Extra processing
   - **Recommendation**: Skip for Dashboard

9. **Product attributes** (Luxury, Affordable, etc.)
   - NOT displayed in Dashboard (only in Product Insight)
   - Takes: Extra processing
   - **Recommendation**: Skip for Dashboard

10. **aiTraffic** (detailed traffic metrics)
    - NOT displayed in Dashboard
    - **Recommendation**: Skip for Dashboard

11. **RAVI** (Relative AI Visibility Index)
    - NOT displayed in Dashboard
    - **Recommendation**: Skip for Dashboard

12. **contentOptimizationScore**
    - NOT displayed in Dashboard
    - **Recommendation**: Skip for Dashboard

13. **placement tracking** (1st, 2nd, 3rd position counts)
    - NOT displayed in Dashboard (only in Competitor Insight)
    - **Recommendation**: Skip for Dashboard

---

## CURRENT vs OPTIMIZED FLOW

### **CURRENT DASHBOARD FLOW (Slow):**

```
1. Detect competitors (20-30 sec)
2. For each competitor, query 4 AIs with 3-4 prompts each
3. Scrape websites (8 competitors × 2 sec = 16 sec)
4. Run source capture analysis (12+ extra prompts = 20 sec)
5. Run sentiment detail analysis (24+ prompts = 30 sec)
6. Run citation metrics (10 sec)
7. Run shopping visibility (5 sec)
8. Calculate placement, FAQ, authority, product attributes

TOTAL: 90-120 seconds
```

### **OPTIMIZED DASHBOARD FLOW (Fast):**

```
1. Detect competitors (20-30 sec) - PARALLEL with step 2
2. For each competitor, query 4 AIs with 1 simple prompt each
   - Gemini: "Analyze Zara's market visibility"
   - ChatGPT: "Analyze Zara's market visibility"
   - Claude: "Analyze Zara's market visibility"  
   - Perplexity: "Analyze Zara's market visibility"
3. Extract from responses:
   - AI scores (from visibility analysis)
   - Mention counts (count brand name in responses)
   - Basic sentiment (positive/negative word counts)
4. Skip: scraping, sources, detailed sentiment, citations, shopping, placement, FAQ, authority, product attributes

TOTAL: 30-40 seconds (60% faster!)
```

---

## DETAILED BREAKDOWN - WHAT TO REMOVE

### **1. Website Scraping (scrapedData)**
**Current**: Scrapes each competitor's website
**Purpose**: Get website content
**Used in**: Not displayed in Dashboard
**Time**: 2 sec × 8 competitors = 16 seconds
**Recommendation**: ❌ REMOVE for Dashboard

### **2. Source Capture Analysis (sourceCapturePromise)**
**Current**: Runs 12 extra AI prompts to extract sources
**Purpose**: Build source citation donuts
**Used in**: Only Competitor Insight page
**Time**: 20-30 seconds
**Recommendation**: ❌ REMOVE for Dashboard

### **3. Detailed Sentiment Analysis (sentResponses)**
**Current**: Runs 3 prompts per competitor per AI (96+ prompts!)
**Purpose**: Get sentiment quotes, tone, attributes
**Used in**: Dashboard shows sentiment score only, not quotes
**Time**: 30-40 seconds
**Recommendation**: ❌ REMOVE for Dashboard (extract sentiment from main analysis)

### **4. Citation Metrics (computeCitationMetrics)**
**Current**: Calculates detailed citation scores
**Purpose**: Citation analysis
**Used in**: Not displayed in Dashboard
**Time**: 10-15 seconds
**Recommendation**: ❌ REMOVE for Dashboard

### **5. Shopping Visibility (computeShoppingVisibilityCounts)**
**Current**: Counts shopping/transactional mentions
**Purpose**: "Where to buy" recommendations
**Used in**: Only Competitor Insight page
**Time**: 5-10 seconds
**Recommendation**: ❌ REMOVE for Dashboard

### **6. Placement/FAQ/Authority/Product Attributes**
**Current**: Calculated and added to response
**Purpose**: Various detailed metrics
**Used in**: Competitor Insight / Product Insight pages only
**Time**: Extra processing
**Recommendation**: ❌ REMOVE for Dashboard

---

## MY RECOMMENDATION FOR DASHBOARD

### **Keep (What Dashboard Actually Needs):**

1. ✅ **Competitor Detection** (20-30 sec)
   - Find 8 competitors
   - Cache the list

2. ✅ **Query 4 AIs** (1 simple prompt each per competitor)
   - Gemini: 1 prompt × 8 = 8 calls
   - ChatGPT: 1 prompt × 8 = 8 calls
   - Claude: 1 prompt × 8 = 8 calls
   - Perplexity: 1 prompt × 8 = 8 calls
   - **Total: 32 AI calls**

3. ✅ **Extract Basic Metrics**:
   - Count mentions of brand name
   - Calculate visibility scores
   - Count positive/negative words for sentiment
   - Calculate share of voice

### **Remove (Not Displayed in Dashboard UI):**

1. ❌ Website scraping (saves 16 seconds)
2. ❌ Source capture analysis (saves 20-30 seconds)
3. ❌ Detailed sentiment prompts (saves 30-40 seconds)
4. ❌ Citation metrics (saves 10-15 seconds)
5. ❌ Shopping visibility (saves 5-10 seconds)
6. ❌ Placement tracking (saves processing time)
7. ❌ FAQ data (saves processing time)
8. ❌ Authority signals (saves processing time)
9. ❌ Product attributes (saves processing time)

### **Total Time Saved: 80-110 seconds!**

---

## OPTIMIZED DASHBOARD TIME

**New Dashboard Flow:**
```
1. Detect competitors (parallel with step 2): 25 sec
2. Query 4 AIs (1 prompt each): 15 sec (runs in parallel with step 1)
3. Extract metrics: 2 sec

TOTAL: ~30 seconds (was 90-120 sec)
IMPROVEMENT: 75% faster!
```

---

## PERMISSION REQUEST

**Should I remove these calculations for Dashboard?**

1. ❌ Remove website scraping?
2. ❌ Remove source capture analysis?
3. ❌ Remove detailed sentiment prompts (keep basic sentiment from main prompts)?
4. ❌ Remove citation metrics?
5. ❌ Remove shopping visibility?
6. ❌ Remove placement/FAQ/authority/product attributes?

**What to keep:**
- ✅ Query all 4 AIs (Gemini, ChatGPT, Claude, Perplexity)
- ✅ Calculate AI visibility scores
- ✅ Calculate sentiment scores (from main AI responses)
- ✅ Calculate share of voice
- ✅ Competitor detection and caching

**Please confirm if I should proceed with these removals for Dashboard.**


