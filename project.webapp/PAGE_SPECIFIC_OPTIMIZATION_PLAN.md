# Page-Specific Optimization Plan

## Current Problem

**ALL pages are running the SAME full backend analysis:**
- Queries all 4 AI models (Gemini, ChatGPT, Claude, Perplexity)
- Asks 3-4 questions to each AI model
- For EVERY competitor (8 competitors × 4 AIs × 4 questions = 128 API calls!)
- Takes 60-90 seconds
- **Even though each page only uses PART of this data!**

## What Each Page Actually Needs

### **Dashboard Page**
**Shows:**
- Overall AI Visibility Score
- AI Platform Presence (scores by each AI)
- Share of AI Voice
- Competitor Benchmark
- Top Products
- Sentiment (summary)

**Needs from Backend:**
- ✅ Competitor list
- ✅ AI scores (chatgpt, gemini, claude, perplexity) for each
- ✅ Total mentions count
- ❌ Does NOT need: Detailed placement data, shopping visibility, sources cited, content style

### **Competitor Insight Page**
**Shows:**
- Share of Visibility & Placement (1st, 2nd, 3rd positions)
- Shopping Visibility
- Competitor Mentions by Tool
- Competitor Type Breakdown
- Sources Cited
- Content Style
- Sentiment (detailed)
- Authority Signals
- FAQ Mentions
- Full competitor table

**Needs from Backend:**
- ✅ Competitor list
- ✅ Full AI analysis (all 4 models, all prompts)
- ✅ Placement tracking
- ✅ Shopping mentions
- ✅ Source citations
- ✅ Content style analysis
- **THIS PAGE NEEDS THE MOST COMPREHENSIVE DATA**

### **Product Insight Page**
**Shows:**
- AI Visibility Score
- AI Readiness Score
- Product Analysis by Platforms (attribute bubble chart)
- Sentiment (product-focused)
- Authority Signals (product trust)
- FAQ (product questions)

**Needs from Backend:**
- ✅ Competitor list
- ✅ Product attributes (Luxury, Affordable, Fast Shipping, etc.)
- ✅ Content structure analysis (for readiness score)
- ✅ Basic sentiment data
- ❌ Does NOT need: Detailed placement, shopping visibility breakdown

## Proposed Optimization

### **Option 1: Page-Specific Backend Endpoints** (Best)

Create 3 different backend functions:

**1. `getDashboardData(company, industry)`**
- Only queries Gemini (fastest, most reliable)
- Only 1 prompt per competitor
- Returns: competitors, scores, basic metrics
- Time: ~15-20 seconds

**2. `getCompetitorInsightData(company, industry)`**
- Queries all 4 AI models
- Multiple prompts (comprehensive)
- Returns: everything (placement, sources, content style, etc.)
- Time: ~60-90 seconds

**3. `getProductInsightData(company, industry)`**
- Queries Gemini + 1 other AI (for attributes)
- Focused prompts on product attributes
- Returns: competitors, attributes, basic sentiment
- Time: ~30-40 seconds

### **Option 2: pageType Parameter** (Easier to implement)

Modify existing `getVisibilityData()` function to accept `pageType`:

```javascript
async function getVisibilityData(company, industry, options = {}) {
  const pageType = options.pageType || 'full';
  
  if (pageType === 'dashboard') {
    // Lightweight: Only Gemini, 1 prompt per competitor
    // Skip: placement tracking, sources, content style
  }
  else if (pageType === 'productInsight') {
    // Medium: Gemini + ChatGPT, attribute-focused prompts
    // Skip: detailed placement, shopping breakdown
  }
  else if (pageType === 'competitorInsight') {
    // Full: All 4 AIs, all prompts, all analysis
  }
}
```

## Performance Improvement

### **Current (All pages run full analysis):**
```
Dashboard: 60-90 seconds ❌
Competitor Insight: 60-90 seconds ❌
Product Insight: 60-90 seconds ❌
```

### **After Optimization:**
```
Dashboard: 15-20 seconds ✅ (75% faster!)
Competitor Insight: 60-90 seconds ✅ (same - needs full data)
Product Insight: 30-40 seconds ✅ (50% faster!)
```

## Implementation Status

✅ **Step 1: Frontend passes pageType parameter** - DONE
- apiService.getAIVisibilityAnalysis() now accepts pageType
- backgroundOrchestrator passes correct pageType for each page

⏳ **Step 2: Backend uses pageType to optimize** - NEEDED
- Modify getVisibilityData() to check pageType
- Skip unnecessary AI queries based on page
- Return only needed data

## Next Steps

1. Modify `backend/aiVisibilityService.js` `getVisibilityData()` function
2. Add conditional logic based on pageType
3. Test each page to ensure all UI cards still display correctly
4. Verify performance improvements

Would you like me to implement the backend optimization now?


