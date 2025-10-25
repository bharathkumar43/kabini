# 📦 PRODUCT INSIGHT - COMPLETE BACKEND AUDIT

## WHAT PRODUCT INSIGHT UI DISPLAYS

### **Card 1: AI Visibility Score**
**Shows:** Score like "24/100" with rating (Poor/Good/Excellent)
**Needs from backend:**
- `targetScores.aiVisibilityScore` OR
- `competitor.mentions` (to calculate share of voice)

### **Card 2: AI Readiness Score**
**Shows:** Score like "24/100" - How AI-friendly your website is
**Needs from backend:**
- `targetScores.aiReadinessScore` from content analysis
- Comes from: Website structure analysis (schema, content quality, trust signals)

### **Card 3: Product Analysis by Platforms (BUBBLE CHART)**
**Shows:** Table with attributes (Luxury, Affordable, Fast Shipping, Organic, Sustainable, Variety)
- Bubble size = How often AI associates that attribute with competitor
**Needs from backend:**
- `competitor.productAttributes.Luxury`
- `competitor.productAttributes.Affordable`
- `competitor.productAttributes['Fast Shipping']`
- `competitor.productAttributes.Organic`
- `competitor.productAttributes.Sustainable`
- `competitor.productAttributes.Variety`

### **Card 4: Sentiment Analysis Table**
**Shows:** Table with Tone, Quote, Source, Attribute, Takeaway per competitor
**Needs from backend:**
- `competitor.sentiment[]` array with:
  - `sentiment.tone` (Positive/Neutral/Negative/Mixed)
  - `sentiment.quote` (Example quote)
  - `sentiment.source` (Source category)
  - `sentiment.attr` (Attribute/context)
  - `sentiment.takeaway` (Key insight)

### **Card 5: Authority Signals**
**Shows:** Stacked bars + donut chart showing trust factors
**Needs from backend:**
- `competitor.authority[]` array with:
  - `authority.signal` (Reviews, Backlinks, PR Coverage, Certifications/Awards)
  - `authority.count`
  - `authority.example`

### **Card 6: FAQ / Conversational Mentions**
**Shows:** Bar chart of FAQ mentions + sources + themes breakdown
**Needs from backend:**
- `competitor.faq[]` array with:
  - `faq.question`
  - `faq.source` (Reddit, Quora, Trustpilot, Forums)
  - `faq.theme` (Safe checkout, Fast shipping, Return policy, etc.)

---

## WHAT BACKEND IS CURRENTLY CALCULATING FOR PRODUCT INSIGHT

### **✅ NEEDED (Keep These):**

1. **Competitor List** ✅
   - Should check cache first!
   - Currently: Always running fresh (NEEDS FIX)

2. **AI Queries (Gemini, 2 prompts)** ✅
   - Currently: OPTIMIZED - Only Gemini
   - Gets: Product visibility and attributes

3. **Product Attributes** ✅
   - Currently: OPTIMIZED - Only for Product Insight
   - Extracts: Luxury, Affordable, Fast Shipping, etc.

4. **Detailed Sentiment** ✅
   - Currently: OPTIMIZED - Only for Product Insight
   - Gets: Tone, quotes, sources

5. **Authority Signals** ✅
   - Currently: OPTIMIZED - Only for Product Insight
   - Extracts: Reviews, backlinks, PR, certifications

6. **FAQ Data** ✅
   - Currently: OPTIMIZED - Only for Product Insight
   - Extracts: Questions, sources, themes

7. **Content Structure Analysis** ✅
   - Analyzes target website for AI Readiness Score
   - Currently: Separate API call in frontend

---

### **❌ NOT NEEDED for Product Insight (Can Remove):**

1. **AI Traffic Calculation** (8 seconds wasted)
   - Currently: `computeAiTrafficShares()`
   - Calculates: Mention counts by tool
   - Used in: Only Competitor Insight (Competitor Mentions section)
   - Displayed in Product Insight? ❌ NO
   - **Recommendation**: ❌ REMOVE for Product Insight

2. **Shopping Visibility** (6 seconds wasted)
   - Currently: `computeShoppingVisibilityCounts()`
   - Calculates: Transactional "where to buy" mentions
   - Used in: Only Competitor Insight (Shopping Visibility chart)
   - Displayed in Product Insight? ❌ NO
   - **Recommendation**: ❌ REMOVE for Product Insight

3. **Source Capture** (20 seconds wasted)
   - Currently: `sourceCapturePromise` (12+ extra AI calls)
   - Calculates: Detailed source citations for donut charts
   - Used in: Only Competitor Insight (Sources Cited section)
   - Displayed in Product Insight? ❌ NO
   - **Recommendation**: ❌ REMOVE for Product Insight

4. **Citation Metrics** (Already removed ✅)
   - Not calculated for Product Insight

5. **Placement Tracking** (from AI responses)
   - Currently: Extracted from responses
   - Used in: Only Competitor Insight (Share of Visibility chart)
   - Displayed in Product Insight? ❌ NO
   - **Recommendation**: ❌ Skip extraction for Product Insight

6. **Content Style** (from AI responses)
   - Currently: Classified from responses
   - Used in: Only Competitor Insight (Content Style section)
   - Displayed in Product Insight? ❌ NO
   - **Recommendation**: ❌ Skip classification for Product Insight

---

## CURRENT PRODUCT INSIGHT FLOW (Needs Optimization)

### **Current Flow:**
```
1. Get competitors: 0 sec (uses cached) ✅
2. Scrape target website: 2 sec ✅
3. Query Gemini (2 prompts × 8): 14 sec ✅
4. Extract product attributes: 1 sec ✅
5. Run detailed sentiment (96 prompts): 35 sec ✅
6. Extract authority: 1 sec ✅
7. Extract FAQ: 1 sec ✅
8. Compute AI Traffic: 8 sec ❌ NOT DISPLAYED!
9. Compute Shopping: 6 sec ❌ NOT DISPLAYED!
10. Source Capture: 20 sec ❌ NOT DISPLAYED!
11. Extract placement: 1 sec ❌ NOT DISPLAYED!
12. Extract content style: 1 sec ❌ NOT DISPLAYED!

TOTAL: ~90 seconds
Wasted: ~36 seconds on unused metrics
```

### **Optimized Flow (After Removing Unused):**
```
1. Check competitor cache: INSTANT ✅
2. If not cached: Detect competitors (25 sec) → CACHE
3. Scrape target website: 2 sec ✅
4. Query Gemini (2 prompts × 8): 14 sec ✅
5. Extract product attributes: 1 sec ✅
6. Run detailed sentiment (96 prompts): 35 sec ✅
7. Extract authority: 1 sec ✅
8. Extract FAQ: 1 sec ✅
9. Skip: AI Traffic, Shopping, Sources, Placement, Content Style

TOTAL: 54 seconds (or 29 sec if competitors cached!)
Improvement: 40% faster!
```

---

## PERMISSION REQUEST - PRODUCT INSIGHT

**Should I REMOVE these from Product Insight backend:**

1. ❌ **AI Traffic Calculation** (`computeAiTrafficShares`)
   - Time: 8 seconds
   - Displayed in Product Insight? NO (only Competitor Insight)
   - Remove? **YES/NO**

2. ❌ **Shopping Visibility** (`computeShoppingVisibilityCounts`)
   - Time: 6 seconds
   - Displayed in Product Insight? NO (only Competitor Insight)
   - Remove? **YES/NO**

3. ❌ **Source Capture** (12+ extra AI calls)
   - Time: 20 seconds
   - Displayed in Product Insight? NO (only Competitor Insight)
   - Remove? **YES/NO**

4. ❌ **Placement Tracking Extraction**
   - Time: Processing overhead
   - Displayed in Product Insight? NO (only Competitor Insight)
   - Remove? **YES/NO**

5. ❌ **Content Style Classification**
   - Time: Processing overhead
   - Displayed in Product Insight? NO (only Competitor Insight)
   - Remove? **YES/NO**

**What to KEEP for Product Insight:**
- ✅ Competitor detection (with caching)
- ✅ Target website scraping (for AI Readiness)
- ✅ Gemini queries (product attributes)
- ✅ Product attributes extraction
- ✅ Detailed sentiment (with quotes)
- ✅ Authority signals
- ✅ FAQ data

**If YES to all: Product Insight will be 54 sec → 29 sec (46% faster)**

---

## RECOMMENDED OPTIMIZED BACKEND FOR PRODUCT INSIGHT

### **What Should Run:**

**STEP 1: Check Competitor Cache** (instant)
```
if (cached competitors exist) {
  ✅ Use them!
  Time: 0 sec
} else {
  🔍 Detect competitors
  💾 Cache for Dashboard & Competitor Insight to use
  Time: 25 sec
}
```

**STEP 2: Run Product-Specific Analysis in PARALLEL** (28 sec)

All these run **at the same time**:

**A. Scrape Target Website** (2 sec)
- Only YOUR website (not competitors)
- For: AI Readiness Score

**B. Query Gemini for Product Attributes** (14 sec)
- 2 prompts × 8 competitors = 16 AI calls
- Gets: Product attributes, visibility

**C. Run Detailed Sentiment** (35 sec)
- 3 prompts × 8 competitors × AI tools = 96 calls
- Gets: Sentiment with quotes

(Steps A, B, C run in parallel, total time: ~35 sec)

**STEP 3: Extract Product Metrics** (2 sec)
- Product attributes (Luxury, Affordable, etc.)
- Authority signals
- FAQ mentions

**STEP 4: Show Product Insight UI** ✅

**TOTAL: 29-54 seconds** (depending on competitor cache)

---

**Please confirm - Should I remove AI Traffic, Shopping, Sources, Placement, Content Style from Product Insight backend?**

**Say YES and I'll implement it now!** 🚀


