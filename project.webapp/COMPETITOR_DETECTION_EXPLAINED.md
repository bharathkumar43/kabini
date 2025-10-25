# Competitor Detection & AI Visibility Score Calculation

## Complete Technical Explanation

---

## 📋 Table of Contents
1. [Competitor Detection Flow](#competitor-detection-flow)
2. [AI Visibility Score Calculation](#ai-visibility-score-calculation)
3. [Step-by-Step Example: "Zara"](#example-zara-analysis)
4. [Technical Deep Dive](#technical-deep-dive)

---

## 🔍 COMPETITOR DETECTION FLOW

### Overview
When you enter a company (e.g., "Zara"), the system goes through **4 parallel detection methods** to find competitors.

### **Step 1: Industry & Product Detection**
```javascript
// Input: "Zara"
// Auto-detect industry and product type

detectIndustryAndProduct("Zara")
// Output:
// - Industry: "Fashion"
// - Product: "Clothing & Apparel"
```

**How it works:**
- Uses AI (Gemini) to analyze company name
- Infers industry from company name patterns
- Detects product type from context

---

### **Step 2: Web Search for Competitor Context**
```javascript
// Build industry-specific search query
searchQuery = `"Zara" direct competitors business rivals fashion clothing brands`

queryCustomSearchAPI(searchQuery)
// Returns: Google Custom Search results
// - News articles about competitors
// - Industry comparison pages
// - Business analysis reports
```

**Search results contain:**
- Company mentions
- Industry comparisons
- Competitor listings
- Market analysis

---

### **Step 3: Parallel Competitor Detection (4 Methods)**

The system runs **4 detection methods simultaneously**:

#### **Method 1: Industry News Search** 📰
```javascript
searchIndustryNewsCompetitors("Zara")
```
- Searches: "Zara competitors industry news"
- Sources: TechCrunch, Forbes, Business Insider, etc.
- Extracts: Company names from news articles
- **Example results**: H&M, Gap, Uniqlo, Forever 21

#### **Method 2: Public Company Database** 🏢
```javascript
searchPublicCompanyDatabase("Zara")
```
- Searches: "Zara similar companies database"
- Sources: Crunchbase-like databases, LinkedIn
- Extracts: Officially listed competitors
- **Example results**: H&M, Inditex brands, Mango

#### **Method 3: Web Search Extraction** 🌐
```javascript
extractCompetitorNames("Zara", searchResults)
```
- Analyzes: Search result snippets
- Uses AI: Gemini to extract company names
- Context: "competitors", "rivals", "alternative to"
- **Example results**: Zara alternatives, similar brands

#### **Method 4: AI-Powered Detection** 🤖
```javascript
queryAIForCompetitors("Zara")
```
- Asks Gemini: "Who are Zara's main competitors?"
- Direct AI knowledge
- Industry-specific context
- **Example results**: H&M, Gap, Uniqlo, Bershka

---

### **Step 4: Consolidation & Ranking**

All 4 methods return competitor lists. System then:

1. **Deduplicates** using normalization:
   ```javascript
   // Normalize names to avoid duplicates
   "H&M" === "H & M" === "H and M" → "hm"
   "Forever 21" === "Forever21" → "forever21"
   ```

2. **Ranks by frequency**:
   ```javascript
   Competitor Rankings:
   1. H&M (found 4 times) ⭐⭐⭐⭐
   2. Gap (found 3 times) ⭐⭐⭐
   3. Uniqlo (found 3 times) ⭐⭐⭐
   4. Forever 21 (found 2 times) ⭐⭐
   5. Mango (found 2 times) ⭐⭐
   ```

3. **AI Validation**:
   ```javascript
   validateCompetitors("Zara", [competitors])
   ```
   - Asks Gemini: "Are these Zara's actual competitors?"
   - Filters out false positives
   - Confidence score per competitor

4. **Final Filtering**:
   ```javascript
   // Remove obvious non-competitors
   Filter out: Wikipedia, LinkedIn, Reddit, etc.
   Keep: Actual brands/companies
   ```

**Final Result:**
```javascript
Competitors = [
  "Zara",        // Main company
  "H&M",
  "Gap",
  "Uniqlo",
  "Forever 21",
  "Mango",
  "Bershka",
  "Pull&Bear"
]
```

---

## 📊 AI VISIBILITY SCORE CALCULATION

### Overview
For **each competitor**, the system queries **4 AI platforms** in parallel to calculate visibility scores.

### **The 4 AI Platforms**

1. **Gemini** (Google)
2. **ChatGPT** (OpenAI)
3. **Perplexity AI**
4. **Claude** (Anthropic)

---

### **Step 1: Generate Enhanced Prompts**

For each competitor, create industry-specific prompts:

```javascript
// For "H&M" in "Fashion" industry
enhancedPrompts = {
  gemini: [
    "Who are the leading fashion brands in 2024?",
    "What are the top clothing retailers globally?",
    "Compare H&M with other fast fashion brands",
    "How does H&M leverage AI in fashion retail?"
  ],
  chatgpt: [
    "Which fashion companies dominate the market?",
    "Best affordable fashion brands",
    "H&M vs competitors analysis",
    "AI adoption in fashion retail"
  ],
  perplexity: [...],
  claude: [...]
}
```

**Total prompts per competitor**: ~4-6 per platform = 16-24 prompts

---

### **Step 2: Query All AI Platforms in Parallel**

```javascript
// For H&M competitor
Promise.all([
  queryGeminiVisibility("H&M", "Fashion", prompts.gemini),
  queryChatGPT("H&M", "Fashion", prompts.chatgpt),
  queryPerplexity("H&M", "Fashion", prompts.perplexity),
  queryClaude("H&M", "Fashion", prompts.claude)
])
```

#### **What Each Platform Does:**

**Gemini:**
```javascript
// Sends 4-6 prompts to Gemini API
// Each response analyzed for:
// - Brand mentions count
// - Sentiment (positive/negative/neutral)
// - Position in response (1st, 2nd, 3rd...)
// - Context (recommendations, comparisons, etc.)

Example Response:
"H&M is a leading fast fashion retailer known for affordable 
trendy clothing. It competes with Zara and Gap..."

Analysis:
- Mentions: 1 (found "H&M")
- Sentiment: Positive ("leading", "affordable")
- Position: 1st (mentioned first)
```

**ChatGPT, Perplexity, Claude:**
- Same process as Gemini
- Different responses based on each platform's knowledge
- Independent scoring

---

### **Step 3: Calculate Per-Platform Visibility Score**

For each platform (e.g., Gemini):

```javascript
function calculateVisibilityScore(response, competitorName) {
  // 1. Count mentions
  const mentions = countBrandMentions(response, competitorName)
  // "H&M" appears 3 times → mentions = 3
  
  // 2. Analyze sentiment
  const sentiment = analyzeSentiment(response)
  // Positive words: "leading", "popular", "recommended"
  // → sentiment = 0.8 (scale 0-1)
  
  // 3. Check position
  const position = getFirstMentionPosition(response, competitorName)
  // H&M mentioned in first paragraph → position bonus
  
  // 4. Context analysis
  const context = analyzeContext(response)
  // Mentioned in "top brands" section → context bonus
  
  // 5. Calculate score
  const score = (
    mentions * 2.0 +           // More mentions = higher score
    sentiment * 3.0 +          // Positive sentiment = bonus
    positionBonus * 1.5 +      // Early mention = bonus
    contextBonus * 2.0         // Recommendation context = bonus
  ) / 10
  
  return score // 0-10 scale
}
```

**Example Gemini Score for H&M:**
```javascript
{
  visibilityScore: 7.5,  // Overall score (0-10)
  mentionsCount: 3,      // Times mentioned
  sentiment: "Positive", // Tone
  keyMetrics: {
    brandMentions: 3,
    sentimentScore: 0.8,
    positionScore: 0.9
  }
}
```

---

### **Step 4: Aggregate Scores Across All Platforms**

```javascript
// H&M scores from all platforms:
scores = {
  gemini: 7.5,
  chatgpt: 8.2,
  perplexity: 6.8,
  claude: 7.9
}

// Calculate average
totalScore = (7.5 + 8.2 + 6.8 + 7.9) / 4 = 7.6

// Convert to percentage for UI
aiVisibilityScore = 7.6 * 10 = 76%
```

**Final Result for H&M:**
```javascript
{
  name: "H&M",
  totalScore: 7.6,          // Average across all platforms
  aiVisibilityScore: 76,    // Percentage (0-100)
  aiScores: {
    gemini: 7.5,
    chatgpt: 8.2,
    perplexity: 6.8,
    claude: 7.9
  },
  breakdowns: {
    gemini: {
      analysis: "H&M is a leading fashion retailer...",
      visibilityScore: 7.5,
      mentionsCount: 3,
      sentiment: "Positive"
    },
    // ... same for other platforms
  }
}
```

---

## 📝 EXAMPLE: "ZARA" ANALYSIS

Let me walk through a complete example:

### **Input**
```
Company: "Zara"
```

### **Step 1: Industry Detection**
```
Industry: "Fashion"
Product: "Clothing & Apparel"
```

### **Step 2: Competitor Detection**
```
4 parallel methods run:
- Method 1 (News): H&M, Gap, Uniqlo, Mango
- Method 2 (Database): H&M, Inditex, Forever 21
- Method 3 (Web): Uniqlo, Gap, Bershka
- Method 4 (AI): H&M, Gap, Uniqlo, Forever 21

Consolidated: [Zara, H&M, Gap, Uniqlo, Forever 21, Mango, Bershka]
```

### **Step 3: AI Visibility Analysis**

For **each competitor**, query 4 AI platforms:

#### **Zara** (Main company)
```javascript
Gemini queries:
Q1: "Who are the leading fashion brands in 2024?"
A1: "Zara, H&M, and Uniqlo are among the top fast fashion brands..."
→ Mentions: 1, Position: 1st, Sentiment: Positive

Q2: "What are the top clothing retailers globally?"
A2: "Zara is known for trendy affordable fashion..."
→ Mentions: 1, Position: 1st, Sentiment: Positive

Q3: "Compare Zara with other fast fashion brands"
A3: "Zara leads in design turnaround time..."
→ Mentions: 3, Position: 1st, Sentiment: Very Positive

Q4: "How does Zara leverage AI in fashion retail?"
A4: "Zara uses AI for inventory management and trend prediction..."
→ Mentions: 2, Position: 1st, Sentiment: Positive

Gemini Score: 8.5/10

ChatGPT, Perplexity, Claude (similar process)
→ ChatGPT: 8.2/10
→ Perplexity: 7.8/10
→ Claude: 8.0/10

Final Zara Score:
totalScore = (8.5 + 8.2 + 7.8 + 8.0) / 4 = 8.1
aiVisibilityScore = 81%
```

#### **H&M** (Competitor)
```javascript
Gemini queries:
Q1: "Who are the leading fashion brands in 2024?"
A1: "Zara, H&M, and Uniqlo..."
→ Mentions: 1, Position: 2nd

Q2: "What are the top clothing retailers globally?"
A2: "H&M is a Swedish multinational..."
→ Mentions: 1, Position: 1st

Q3: "Compare H&M with other fast fashion brands"
A3: "H&M offers sustainable fashion..."
→ Mentions: 2, Position: 1st

Q4: "How does H&M leverage AI?"
A4: "H&M uses AI for sustainability tracking..."
→ Mentions: 1, Position: 1st

Gemini Score: 7.5/10

Final H&M Score:
totalScore = (7.5 + 8.2 + 6.8 + 7.9) / 4 = 7.6
aiVisibilityScore = 76%
```

### **Step 4: Display in UI**

**Dashboard Table:**
```
Competitor       | ChatGPT | Gemini | Perplexity | Claude | Avg Score
----------------|---------|--------|------------|--------|----------
Zara (YOU)      |   8.2   |  8.5   |    7.8     |  8.0   |  81%  🟢
H&M             |   8.2   |  7.5   |    6.8     |  7.9   |  76%  🟢
Gap             |   6.5   |  6.8   |    6.2     |  6.5   |  65%  🟡
Uniqlo          |   7.1   |  7.3   |    6.9     |  7.0   |  71%  🟢
Forever 21      |   5.8   |  6.0   |    5.5     |  5.7   |  58%  🟡
```

---

## 🔧 TECHNICAL DEEP DIVE

### Competitor Detection Methods

#### **Method 1: Industry News Search**
```javascript
async function searchIndustryNewsCompetitors(companyName) {
  const query = `"${companyName}" competitors industry news`
  const results = await queryCustomSearchAPI(query)
  
  // Extract company names from news articles
  const competitors = []
  for (const result of results) {
    const text = result.snippet + result.title
    // Use AI to extract company names
    const names = await extractCompanyNamesUsingAI(text)
    competitors.push(...names)
  }
  
  return competitors
}
```

#### **Method 2: Public Company Database**
```javascript
async function searchPublicCompanyDatabase(companyName) {
  const query = `"${companyName}" similar companies database`
  const results = await queryCustomSearchAPI(query)
  
  // Look for structured company listings
  const competitors = []
  for (const result of results) {
    if (result.url.includes('crunchbase') || 
        result.url.includes('linkedin')) {
      const names = extractCompanyNamesFromDatabase(result)
      competitors.push(...names)
    }
  }
  
  return competitors
}
```

#### **Method 3: Web Search Extraction**
```javascript
async function extractCompetitorNames(companyName, searchResults) {
  const prompt = `
    Extract competitor company names from these search results about ${companyName}.
    Only return actual company/brand names, not generic terms.
    
    Search results: ${searchResults.map(r => r.snippet).join('\n')}
  `
  
  const response = await callAI(prompt)
  const competitors = parseCompanyNames(response)
  return competitors
}
```

#### **Method 4: AI-Powered Detection**
```javascript
async function queryAIForCompetitors(companyName, industry) {
  const prompt = `
    Who are the main competitors of ${companyName} in the ${industry} industry?
    List only direct competitors (brands/companies), not platforms or tools.
  `
  
  const response = await callGemini(prompt)
  const competitors = parseCompanyNames(response)
  return competitors
}
```

---

### Visibility Score Calculation Details

#### **1. Mention Counting**
```javascript
function countBrandMentions(text, brandName) {
  // Build alias variations
  const aliases = buildAliases(brandName)
  // e.g., "H&M" → ["h&m", "hm", "h and m", "hennes & mauritz"]
  
  let count = 0
  const lowerText = text.toLowerCase()
  
  for (const alias of aliases) {
    // Count case-insensitive matches
    const regex = new RegExp(`\\b${alias}\\b`, 'gi')
    const matches = lowerText.match(regex) || []
    count += matches.length
  }
  
  return count
}
```

#### **2. Sentiment Analysis**
```javascript
function analyzeSentiment(text, brandName) {
  // Extract sentences mentioning the brand
  const sentences = extractBrandSentences(text, brandName)
  
  // Positive indicators
  const positiveWords = ['leading', 'top', 'best', 'popular', 
                         'recommended', 'trusted', 'excellent']
  
  // Negative indicators
  const negativeWords = ['poor', 'worst', 'avoid', 'problem', 
                          'issue', 'complaint']
  
  let positiveCount = 0
  let negativeCount = 0
  
  for (const sentence of sentences) {
    positiveCount += countWords(sentence, positiveWords)
    negativeCount += countWords(sentence, negativeWords)
  }
  
  // Calculate sentiment score (0-1)
  if (positiveCount + negativeCount === 0) return 0.5 // Neutral
  
  const sentiment = positiveCount / (positiveCount + negativeCount)
  return sentiment
}
```

#### **3. Position Scoring**
```javascript
function getFirstMentionPosition(text, brandName) {
  const position = text.toLowerCase().indexOf(brandName.toLowerCase())
  
  if (position === -1) return 0
  
  const textLength = text.length
  const relativePosition = position / textLength
  
  // Earlier mention = higher score
  // First 10% of text → 1.0 bonus
  // Last 10% of text → 0.1 bonus
  const positionScore = 1.0 - (relativePosition * 0.9)
  
  return positionScore
}
```

#### **4. Context Analysis**
```javascript
function analyzeContext(text, brandName) {
  // Extract context around brand mentions
  const contexts = extractContexts(text, brandName, windowSize=50)
  
  // High-value contexts
  const recommendationKeywords = ['recommend', 'best', 'top', 'choose']
  const comparisonKeywords = ['vs', 'versus', 'compared to', 'better than']
  const leadershipKeywords = ['leader', 'leading', 'dominant', 'market share']
  
  let contextScore = 0
  
  for (const context of contexts) {
    if (containsAny(context, recommendationKeywords)) {
      contextScore += 2.0 // Recommendation context is valuable
    }
    if (containsAny(context, comparisonKeywords)) {
      contextScore += 1.5 // Comparison context is good
    }
    if (containsAny(context, leadershipKeywords)) {
      contextScore += 2.5 // Leadership context is excellent
    }
  }
  
  return contextScore / contexts.length
}
```

#### **5. Final Score Calculation**
```javascript
function calculateVisibilityScore(response, competitorName) {
  const mentions = countBrandMentions(response, competitorName)
  const sentiment = analyzeSentiment(response, competitorName)
  const position = getFirstMentionPosition(response, competitorName)
  const context = analyzeContext(response, competitorName)
  
  // Weighted formula
  const score = (
    mentions * 2.0 +        // Weight: 20%
    sentiment * 3.0 +       // Weight: 30%
    position * 1.5 +        // Weight: 15%
    context * 2.5 +         // Weight: 25%
    1.0                     // Base: 10%
  ) / 10
  
  // Normalize to 0-10 scale
  const normalizedScore = Math.min(10, Math.max(0, score))
  
  return {
    totalScore: normalizedScore,
    breakdown: {
      mentions,
      sentiment,
      position,
      context
    }
  }
}
```

---

## 🎯 Summary

### **Competitor Detection:**
1. Detect industry & product
2. Run 4 parallel detection methods
3. Consolidate & rank by frequency
4. Validate with AI
5. Filter obvious non-competitors
6. Return top 8-10 competitors

### **AI Visibility Scoring:**
1. Generate enhanced prompts (4-6 per platform)
2. Query 4 AI platforms in parallel (Gemini, ChatGPT, Perplexity, Claude)
3. For each response:
   - Count mentions
   - Analyze sentiment
   - Check position
   - Evaluate context
4. Calculate per-platform score (0-10)
5. Average across all platforms
6. Display in UI as percentage (0-100%)

### **Performance:**
- Competitor detection: ~5-10 seconds
- AI visibility analysis: ~30-45 seconds per competitor
- Total for 8 competitors: ~4-6 minutes
- **With caching: Subsequent loads <1 second!**

---

**That's the complete flow! 🚀**


