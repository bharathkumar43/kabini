# 🔍 COMPETITOR INSIGHT - COMPLETE BACKEND AUDIT

## WHAT COMPETITOR INSIGHT UI DISPLAYS

### **Section 1: Share of Visibility & Placement Tracking**
**Shows:** Stacked bar chart showing 1st, 2nd, 3rd position mentions per competitor
**Needs from backend:**
- `placement.first` (count of 1st position mentions)
- `placement.second` (count of 2nd position mentions)
- `placement.third` (count of 3rd+ position mentions)

### **Section 2: Shopping Visibility (Transactional Mentions)**
**Shows:** Bar chart of shopping/buying mentions per competitor
**Needs from backend:**
- `shopping.total` (count of transactional mentions like "where to buy")

### **Section 3: Competitor Mentions (Overall + By Tool)**
**Shows:** Total mentions + breakdown by AI tool (Gemini, ChatGPT, Claude, Perplexity)
**Needs from backend:**
- `aiTraffic.totalMentions`
- `aiTraffic.byModel.gemini`
- `aiTraffic.byModel.chatgpt`
- `aiTraffic.byModel.claude`
- `aiTraffic.byModel.perplexity`

### **Section 4: Competitor Type Breakdown**
**Shows:** Pie chart of direct vs indirect competitors
**Needs from backend:**
- Just competitor names (frontend classifies based on scores)

### **Section 5: Sources Cited**
**Shows:** Donut charts per AI tool showing source distribution
**Needs from backend:**
- `sourcesByTool.gemini.counts` (Blogs, Reviews, News, etc.)
- `sourcesByTool.chatgpt.counts`
- `sourcesByTool.claude.counts`
- `sourcesByTool.perplexity.counts`

### **Section 6: Content Style Breakdown**
**Shows:** Bar chart of content styles (Professional, Casual, Technical)
**Needs from backend:**
- `contentStyle` (classification)

### **Section 7: Competitor Analysis Table**
**Shows:** Full table with all competitor scores and metrics
**Needs from backend:**
- Competitor names
- AI scores (chatgpt, gemini, claude, perplexity)
- Total scores
- All calculated metrics

### **SECTIONS NOT ON COMPETITOR INSIGHT (Moved to Product Insights):**
- ❌ Sentiment Table (moved to Product Insights)
- ❌ Authority Signals (moved to Product Insights)
- ❌ FAQ Mentions (moved to Product Insights)
- ❌ Product Attributes (moved to Product Insights)

---

## WHAT BACKEND IS CURRENTLY CALCULATING

### **✅ NEEDED for Competitor Insight:**

1. **Competitor list with AI scores** ✅
   - Names, aiScores (all 4), totalScore
   
2. **Placement tracking** ✅
   - 1st, 2nd, 3rd position counts
   - Currently: Extracted from AI responses
   
3. **Shopping visibility** ✅
   - Currently: `computeShoppingVisibilityCounts()` (already optimized - skipped for Dashboard)
   
4. **Mentions by tool** ✅
   - Currently: `computeAiTrafficShares()` (already optimized - skipped for Dashboard)
   
5. **Sources cited** ✅
   - Currently: `sourceCapturePromise` (already optimized - skipped for Dashboard)
   
6. **Content style** ✅
   - Currently: Part of source capture

---

### **❌ NOT NEEDED for Competitor Insight (Can Remove):**

1. **Website Scraping** (16 seconds wasted)
   - Currently: Scrapes each competitor's website
   - Used in: NOT displayed in Competitor Insight
   - **Recommendation**: ❌ REMOVE (already implemented!)

2. **Citation Metrics** (10-15 seconds wasted)
   - Currently: `computeCitationMetrics()`
   - Used in: NOT displayed in Competitor Insight
   - **Recommendation**: ❌ REMOVE (already implemented!)

3. **Detailed Sentiment with Quotes** (30-40 seconds wasted)
   - Currently: Runs 96+ extra prompts for sentiment quotes
   - Used in: NOT displayed in Competitor Insight (sentiment moved to Product Insights!)
   - **Recommendation**: ❌ REMOVE for Competitor Insight too!

4. **Authority Signals** (processing time)
   - Currently: Calculated and included in response
   - Used in: NOT displayed in Competitor Insight (moved to Product Insights!)
   - **Recommendation**: ❌ REMOVE for Competitor Insight

5. **FAQ Data** (processing time)
   - Currently: Calculated and included in response
   - Used in: NOT displayed in Competitor Insight (moved to Product Insights!)
   - **Recommendation**: ❌ REMOVE for Competitor Insight

6. **Product Attributes** (processing time)
   - Currently: Extracted from AI responses
   - Used in: NOT displayed in Competitor Insight (Product Insights only!)
   - **Recommendation**: ❌ REMOVE for Competitor Insight

---

## OPTIMIZED COMPETITOR INSIGHT FLOW

### **Current Flow (Wasteful):**
```
1. Get competitors (cached): 0 sec
2. Query 2 AIs (Gemini, ChatGPT): 18 sec
3. Compute AI traffic: 8 sec ✅ KEEP (shows Competitor Mentions)
4. Compute shopping visibility: 6 sec ✅ KEEP (shows Shopping Visibility)
5. Source capture: 20 sec ✅ KEEP (shows Sources Cited)
6. Detailed sentiment (96 prompts): 35 sec ❌ REMOVE (not displayed!)
7. Extract authority/FAQ/product attributes: 5 sec ❌ REMOVE (not displayed!)

TOTAL: ~92 seconds
```

### **Optimized Flow:**
```
1. Get competitors (cached): 0 sec
2. Query 2 AIs in parallel with other metrics:
   
   PARALLEL EXECUTION (all run at same time):
   ├─ Query Gemini + ChatGPT for scores: 18 sec
   ├─ Compute AI traffic (mentions by tool): 8 sec
   ├─ Compute shopping visibility: 6 sec
   └─ Source capture (for source donuts): 20 sec
   
   (Takes 20 sec total since they run in parallel!)
   
3. Extract placement from AI responses: 2 sec
4. Classify content style: 1 sec

TOTAL: ~23 seconds (or 48 sec if competitors not cached)

IMPROVEMENT: 75% faster!
```

---

## PERMISSION REQUEST - COMPETITOR INSIGHT

**Should I REMOVE these from Competitor Insight backend:**

1. ❌ **Detailed Sentiment Prompts** (96 extra prompts)
   - Currently: 3 prompts × 8 competitors × 4 AIs = 96 prompts
   - Time: 30-40 seconds
   - Displayed in: NOT in Competitor Insight (moved to Product Insights!)
   - **Remove?** YES/NO

2. ❌ **Authority Signals Calculation**
   - Currently: Extracts reviews, backlinks, PR, certifications
   - Time: Processing overhead
   - Displayed in: NOT in Competitor Insight (moved to Product Insights!)
   - **Remove?** YES/NO

3. ❌ **FAQ Data Extraction**
   - Currently: Extracts FAQ mentions, sources, themes
   - Time: Processing overhead
   - Displayed in: NOT in Competitor Insight (moved to Product Insights!)
   - **Remove?** YES/NO

4. ❌ **Product Attributes**
   - Currently: Extracts Luxury, Affordable, etc.
   - Time: Processing overhead
   - Displayed in: NOT in Competitor Insight (Product Insights only!)
   - **Remove?** YES/NO

**What to KEEP for Competitor Insight:**

5. ✅ **AI Traffic / Mentions by Tool** 
   - Shows in: Competitor Mentions section
   - Keep? YES

6. ✅ **Shopping Visibility**
   - Shows in: Shopping Visibility section
   - Keep? YES

7. ✅ **Source Capture**
   - Shows in: Sources Cited section (donut charts)
   - Keep? YES

8. ✅ **Placement Tracking**
   - Shows in: Share of Visibility section
   - Keep? YES

9. ✅ **Content Style**
   - Shows in: Content Style section
   - Keep? YES

---

## RECOMMENDED OPTIMIZED BACKEND FOR COMPETITOR INSIGHT

### **What Should Run:**

**PHASE 1: Get Competitors** (0 sec - cached, or 25 sec fresh)

**PHASE 2: Core AI Analysis + All Metrics in PARALLEL** (20-25 sec)

Run all these **at the same time**:

**A. Query 2 AIs** (18-20 sec)
- Gemini: 2 prompts per competitor (visibility + positioning)
- ChatGPT: 1 prompt per competitor (market analysis)
- **24 AI calls** (8 competitors × 3 prompts)

**B. Compute AI Traffic** (runs in parallel, 8 sec)
- Counts mentions per AI tool
- For Competitor Mentions section

**C. Compute Shopping Visibility** (runs in parallel, 6 sec)
- Counts "where to buy" mentions
- For Shopping Visibility section

**D. Source Capture** (runs in parallel, 20 sec)
- Extracts sources cited (Forbes, Reddit, etc.)
- For Sources Cited donuts

**E. Extract Placement** (from step A responses, 2 sec)
- Counts 1st, 2nd, 3rd positions
- From AI responses

**F. Classify Content Style** (from step A responses, 1 sec)
- Professional, Casual, Technical
- From AI responses

**Total Time: ~25 seconds** (all run in parallel!)

**PHASE 3: Show UI** ✅

**TOTAL: 25-50 seconds** (depending on competitor cache)

---

## WHAT GETS REMOVED vs KEPT

### **REMOVE from Competitor Insight:**
- ❌ Website scraping (DONE ✅)
- ❌ Citation metrics (DONE ✅)
- ❌ Detailed sentiment prompts (PENDING - waiting for approval)
- ❌ Authority signals extraction (PENDING - not displayed)
- ❌ FAQ data extraction (PENDING - not displayed)
- ❌ Product attributes extraction (PENDING - not displayed)

### **KEEP for Competitor Insight:**
- ✅ Competitor detection (cached)
- ✅ Query Gemini + ChatGPT
- ✅ AI Traffic calculation (for Competitor Mentions)
- ✅ Shopping visibility (for Shopping Visibility chart)
- ✅ Source capture (for Sources Cited donuts)
- ✅ Placement extraction (for Share of Visibility)
- ✅ Content style (for Content Style section)

---

## YOUR APPROVAL NEEDED

**Please confirm - Should I remove from Competitor Insight backend:**

1. **Detailed Sentiment Prompts?** (saves 30-40 sec)
   - Currently: 96 extra AI prompts
   - Displayed in Competitor Insight? NO (moved to Product Insights)
   - Remove? **YOUR DECISION**

2. **Authority/FAQ/Product Attributes extraction?** (saves 5 sec processing)
   - Currently: Processed from AI responses
   - Displayed in Competitor Insight? NO (moved to Product Insights)
   - Remove? **YOUR DECISION**

**If YES to both:**
- Competitor Insight: 23-48 seconds (was 92 sec)
- Improvement: 75% faster!

**Please confirm and I'll implement!**


