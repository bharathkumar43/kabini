# Visual Flow Diagrams

## 🔄 Complete Analysis Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      USER ENTERS "ZARA"                              │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│               STEP 1: INDUSTRY DETECTION                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  detectIndustryAndProduct("Zara")                            │  │
│  │  → Industry: "Fashion"                                       │  │
│  │  → Product: "Clothing & Apparel"                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│            STEP 2: COMPETITOR DETECTION (PARALLEL)                   │
│                                                                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │  Method 1  │  │  Method 2  │  │  Method 3  │  │  Method 4  │   │
│  │    News    │  │  Database  │  │    Web     │  │     AI     │   │
│  │   Search   │  │   Search   │  │  Extract   │  │   Direct   │   │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘   │
│         │                │                │                │         │
│         ▼                ▼                ▼                ▼         │
│    H&M, Gap        H&M, Inditex     Uniqlo, Gap      H&M, Gap      │
│  Uniqlo, Mango    Forever 21        Bershka        Uniqlo, F21     │
│         │                │                │                │         │
│         └────────────────┴────────┬───────┴────────────────┘         │
│                                   ▼                                   │
│                        CONSOLIDATE & RANK                             │
│                    ┌──────────────────────┐                          │
│                    │  H&M (4 times)  ⭐⭐⭐⭐ │                          │
│                    │  Gap (3 times)  ⭐⭐⭐  │                          │
│                    │  Uniqlo (3 times) ⭐⭐⭐│                          │
│                    │  Forever 21 (2) ⭐⭐   │                          │
│                    └──────────────────────┘                          │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│            STEP 3: AI VISIBILITY ANALYSIS (PARALLEL)                 │
│                                                                       │
│  For EACH competitor (Zara, H&M, Gap, Uniqlo, etc.):                │
│                                                                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │   Gemini   │  │  ChatGPT   │  │ Perplexity │  │   Claude   │   │
│  │  4 prompts │  │  4 prompts │  │  4 prompts │  │  4 prompts │   │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘   │
│         │                │                │                │         │
│         ▼                ▼                ▼                ▼         │
│     Score: 8.5       Score: 8.2      Score: 7.8      Score: 8.0    │
│         │                │                │                │         │
│         └────────────────┴────────┬───────┴────────────────┘         │
│                                   ▼                                   │
│                        CALCULATE AVERAGE                              │
│                    ┌──────────────────────┐                          │
│                    │ Total Score: 8.1/10  │                          │
│                    │ Visibility: 81%      │                          │
│                    └──────────────────────┘                          │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  STEP 4: CACHE & DISPLAY                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Store in unified cache (frontend + backend)                 │  │
│  │  Display in UI:                                              │  │
│  │                                                              │  │
│  │  Competitor Table:                                           │  │
│  │  ┌────────┬──────┬──────┬──────┬──────┬──────┐             │  │
│  │  │Company │ChatGPT│Gemini│Perplx│Claude│ Avg  │             │  │
│  │  ├────────┼──────┼──────┼──────┼──────┼──────┤             │  │
│  │  │Zara    │ 8.2  │ 8.5  │ 7.8  │ 8.0  │ 81%  │             │  │
│  │  │H&M     │ 8.2  │ 7.5  │ 6.8  │ 7.9  │ 76%  │             │  │
│  │  │Gap     │ 6.5  │ 6.8  │ 6.2  │ 6.5  │ 65%  │             │  │
│  │  │Uniqlo  │ 7.1  │ 7.3  │ 6.9  │ 7.0  │ 71%  │             │  │
│  │  └────────┴──────┴──────┴──────┴──────┴──────┘             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Unified Cache Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│              USER ANALYZES "ZARA" ON DASHBOARD                       │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Check Cache?   │
              └────┬──────┬─────┘
                   │      │
            MISS   │      │  HIT
                   │      │
                   ▼      ▼
          ┌─────────┐  ┌──────────────┐
          │  RUN    │  │  LOAD FROM   │
          │ANALYSIS │  │    CACHE     │
          └────┬────┘  └──────┬───────┘
               │              │
               │              └─────────────┐
               ▼                            ▼
    ┌──────────────────────┐      ┌───────────────┐
    │ FOREGROUND ANALYSIS  │      │ DISPLAY INSTANT│
    │   (Dashboard)        │      │   <1 SECOND    │
    │   ~30-45 seconds     │      └───────────────┘
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │  DISPLAY RESULTS     │
    └──────────┬───────────┘
               │
               ├──────────────┬──────────────┐
               │              │              │
               ▼              ▼              ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  BACKGROUND  │  │  BACKGROUND  │  │   STORE IN   │
    │  Competitor  │  │   Product    │  │    CACHE     │
    │   Insight    │  │   Insight    │  │              │
    │  (silent)    │  │  (silent)    │  │ ┌──────────┐ │
    └──────────────┘  └──────────────┘  │ │ Frontend │ │
                                        │ │   Cache  │ │
                                        │ └──────────┘ │
                                        │ ┌──────────┐ │
                                        │ │ Backend  │ │
                                        │ │   Cache  │ │
                                        │ └──────────┘ │
                                        └──────────────┘
                              
┌─────────────────────────────────────────────────────────────────────┐
│       USER NAVIGATES TO COMPETITOR INSIGHT                           │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Check Cache?   │
              └────┬──────┬─────┘
                   │      │
                   │      │  HIT! ✅
                   │      │
                   │      ▼
                   │  ┌──────────────┐
                   │  │  LOAD FROM   │
                   │  │    CACHE     │
                   │  │  <1 SECOND   │
                   │  └──────┬───────┘
                   │         │
                   │         ▼
                   │  ┌──────────────┐
                   │  │   DISPLAY    │
                   │  │   RESULTS    │
                   │  └──────────────┘
                   │
                MISS (cache expired or cleared)
                   │
                   ▼
          ┌────────────────┐
          │   RUN FRESH    │
          │    ANALYSIS    │
          └────────────────┘
```

---

## 🔢 AI Visibility Score Calculation

```
┌─────────────────────────────────────────────────────────────────────┐
│                  FOR COMPETITOR "H&M"                                │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │   GENERATE 16-24 PROMPTS    │
         │                             │
         │  Gemini (4-6 prompts)       │
         │  ChatGPT (4-6 prompts)      │
         │  Perplexity (4-6 prompts)   │
         │  Claude (4-6 prompts)       │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │   QUERY ALL IN PARALLEL     │
         └─────────────┬───────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌────────────────┐          ┌────────────────┐
│  GEMINI API    │          │  CHATGPT API   │
│                │          │                │
│ Q1: "Leading   │          │ Q1: "Top       │
│     brands?"   │          │     retailers?"│
│ A1: "H&M is... │          │ A1: "H&M,      │
│                │          │     Gap..."    │
│ Q2: "Compare   │          │                │
│     H&M..."    │          │ Q2: "H&M vs    │
│ A2: "H&M       │          │     Zara?"     │
│     offers..." │          │ A2: "Both are..│
│                │          │                │
│ Q3-Q4...       │          │ Q3-Q4...       │
│                │          │                │
│ ▼              │          │ ▼              │
│ ANALYZE:       │          │ ANALYZE:       │
│ - Mentions: 5  │          │ - Mentions: 6  │
│ - Sentiment: + │          │ - Sentiment: + │
│ - Position: 1st│          │ - Position: 2nd│
│ - Context: ⭐⭐⭐│          │ - Context: ⭐⭐⭐⭐│
│                │          │                │
│ Score: 7.5/10  │          │ Score: 8.2/10  │
└────────┬───────┘          └────────┬───────┘
         │                           │
         │         ┌─────────────────┘
         │         │
         │         │   ┌────────────────┐   ┌────────────────┐
         │         │   │ PERPLEXITY API │   │   CLAUDE API   │
         │         │   │ Score: 6.8/10  │   │ Score: 7.9/10  │
         │         │   └────────┬───────┘   └────────┬───────┘
         │         │            │                    │
         └─────────┴────────────┴────────────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │   CALCULATE AVERAGE     │
                   │                         │
                   │  (7.5+8.2+6.8+7.9) / 4  │
                   │  = 7.6                  │
                   │                         │
                   │  Visibility: 76%        │
                   └─────────────┬───────────┘
                                 │
                                 ▼
                   ┌─────────────────────────┐
                   │   STORE RESULT          │
                   │                         │
                   │  {                      │
                   │    name: "H&M",         │
                   │    totalScore: 7.6,     │
                   │    aiScores: {          │
                   │      gemini: 7.5,       │
                   │      chatgpt: 8.2,      │
                   │      perplexity: 6.8,   │
                   │      claude: 7.9        │
                   │    }                    │
                   │  }                      │
                   └─────────────────────────┘
```

---

## 📊 Per-Platform Scoring Detail

```
┌─────────────────────────────────────────────────────────────────────┐
│             GEMINI RESPONSE ANALYSIS FOR "H&M"                       │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  Response Text:             │
         │                             │
         │  "H&M is a leading fast     │
         │   fashion retailer known    │
         │   for affordable trendy     │
         │   clothing. It competes     │
         │   with Zara and Gap in      │
         │   the global market. H&M    │
         │   has strong brand          │
         │   recognition and offers    │
         │   sustainable fashion       │
         │   options. H&M is           │
         │   recommended for budget    │
         │   shoppers..."              │
         └─────────────┬───────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌────────────────┐          ┌────────────────┐
│ COUNT MENTIONS │          │ANALYZE SENTIMENT│
│                │          │                │
│ "H&M" → 3 times│          │ Positive words:│
│                │          │ - leading      │
│ Score: 3 × 2.0 │          │ - strong       │
│      = 6.0     │          │ - recommended  │
│                │          │                │
└────────┬───────┘          │ Negative: 0    │
         │                  │                │
         │                  │ Sentiment: 0.8 │
         │                  │ Score: 0.8×3.0 │
         │                  │      = 2.4     │
         │                  └────────┬───────┘
         │                           │
         │         ┌─────────────────┘
         │         │
         ▼         ▼
┌────────────────────────────┐
│   CHECK POSITION           │
│                            │
│ "H&M" first appears at     │
│ position 0 (first word)    │
│                            │
│ Position score: 1.0        │
│ Bonus: 1.0 × 1.5 = 1.5     │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│   ANALYZE CONTEXT          │
│                            │
│ Contexts around "H&M":     │
│ 1. "leading fashion"       │
│    → Leadership keyword ✅  │
│    Bonus: 2.5              │
│                            │
│ 2. "recommended for"       │
│    → Recommendation ✅      │
│    Bonus: 2.0              │
│                            │
│ Context score: 2.25        │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│   CALCULATE FINAL SCORE    │
│                            │
│  Score = (                 │
│    mentions×2.0 +          │
│    sentiment×3.0 +         │
│    position×1.5 +          │
│    context×2.5 +           │
│    base 1.0                │
│  ) / 10                    │
│                            │
│  = (6.0+2.4+1.5+2.25+1.0)  │
│    / 10                    │
│  = 13.15 / 10              │
│  = 1.315                   │
│  → Normalized: 7.5/10      │
└────────────────────────────┘
```

---

## 🎯 Complete Timeline

```
Time (seconds)    Action
─────────────────────────────────────────────────────────
0                 User enters "Zara" and clicks Analyze
│
├─ 1              Industry detection starts
├─ 3              Industry: Fashion, Product: Clothing
│
├─ 3              4 competitor detection methods launch (parallel)
│                 ├─ Method 1: News search
│                 ├─ Method 2: Database search
│                 ├─ Method 3: Web extraction
│                 └─ Method 4: AI detection
│
├─ 10             All methods complete
├─ 12             Consolidate & rank competitors
│                 Result: [Zara, H&M, Gap, Uniqlo, Forever 21, Mango]
│
├─ 12             AI visibility analysis starts (parallel for all)
│                 ├─ Query Gemini (4 prompts × 6 competitors)
│                 ├─ Query ChatGPT (4 prompts × 6 competitors)
│                 ├─ Query Perplexity (4 prompts × 6 competitors)
│                 └─ Query Claude (4 prompts × 6 competitors)
│
├─ 45             All AI responses received
├─ 48             Calculate scores for all competitors
├─ 50             Store in cache (frontend + backend)
├─ 52             Display in UI
│
└─ 52             COMPLETE! ✅
                  User sees full results

──── SUBSEQUENT PAGE LOADS ────
0                 User navigates to Competitor Insight
├─ 0.1            Check cache → HIT!
├─ 0.5            Load from cache
└─ 0.8            Display results ⚡ INSTANT!

──── BACKGROUND JOBS (SILENT) ────
52                Background: Competitor Insight analysis starts
├─ 82             Background: Competitor Insight complete → cache
│
├─ 82             Background: Product Insight analysis starts
└─ 112            Background: Product Insight complete → cache
                  
                  All 3 pages now cached and ready!
```

---

## 🎨 Cache Storage Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIFIED CACHE STRUCTURE                           │
└─────────────────────────────────────────────────────────────────────┘

Frontend (localStorage):
┌─────────────────────────────────────────────────────────────────────┐
│ kabini_unified_analysis_cache                                        │
│ {                                                                    │
│   analyses: {                                                        │
│     "zara": {                                                        │
│       target: "zara",                                                │
│       targetOriginal: "Zara",                                        │
│       timestamp: 1729425600000,                                      │
│       expiresAt: 1729429200000,  // +1 hour                          │
│       size: 8650000,  // ~8.65 MB                                    │
│       dashboard: {  /* Dashboard data */  },                         │
│       competitorInsight: {  /* Competitor data */  },                │
│       productInsight: {  /* Product data */  }                       │
│     },                                                               │
│     "hm": { ... },                                                   │
│     "nike": { ... }                                                  │
│   },                                                                 │
│   totalSize: 25500000,  // ~25.5 MB                                 │
│   lastCleanup: 1729425600000                                         │
│ }                                                                    │
└─────────────────────────────────────────────────────────────────────┘

Backend (in-memory Map):
┌─────────────────────────────────────────────────────────────────────┐
│ unifiedAnalysisCache (Map)                                           │
│                                                                       │
│ Key: "user@example.com:zara"                                         │
│ Value: {                                                             │
│   target: "zara",                                                    │
│   targetOriginal: "Zara",                                            │
│   userId: "user@example.com",                                        │
│   timestamp: 1729425600000,                                          │
│   expiresAt: 1729429200000,                                          │
│   dashboard: { company: "Zara", competitors: [...], ... },          │
│   competitorInsight: { /* data */ },                                 │
│   productInsight: { /* data */ }                                     │
│ }                                                                    │
│                                                                       │
│ Size: 150 entries (out of 1000 max)                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

**That's the complete visual flow! 🚀**














