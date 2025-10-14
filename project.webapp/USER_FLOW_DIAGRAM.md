# User Flow Diagram - AI Visibility Optimization Platform

## 🎯 Primary User Journey

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                            🏠 DASHBOARD                                 │
│                      (Entry Point & Hub)                                │
│                                                                         │
│  Shows: Overall AI visibility score, quick actions, recent analyses    │
│                                                                         │
└────────────┬─────────────┬─────────────┬────────────┬──────────────────┘
             │             │             │            │
             │             │             │            │
             ▼             ▼             ▼            ▼
    ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌──────────┐
    │ Journey 1  │  │ Journey 2  │  │ Journey 3│  │ Journey 4│
    └────────────┘  └────────────┘  └──────────┘  └──────────┘
```

---

## 🔄 Journey 1: Complete Competitive Analysis

```
START: Dashboard (Low visibility score detected)
  │
  ├─→ Suggestion: "Your visibility is low. Let's see what competitors are doing."
  │
  ▼
┌──────────────────────────────────────────────────────┐
│  Step 1: COMPETITOR INSIGHT                          │
│  - Run analysis for your brand + auto-detect rivals  │
│  - View: Share of visibility, mentions, citations    │
│  - Result: "Competitors mentioned 3x more often"     │
└──────────────┬───────────────────────────────────────┘
               │
               ├─→ CTA: "Want deeper insights? → Product Insights"
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Step 2: PRODUCT INSIGHTS                            │
│  - View: Sentiment, authority, FAQs, attributes      │
│  - Discover: Competitors emphasize "fast shipping"   │
│  - Identify: Your content lacks "sustainable" keyword│
└──────────────┬───────────────────────────────────────┘
               │
               ├─→ CTA: "Fill content gaps → Content Enhancement"
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Step 3: CONTENT ENHANCEMENT                         │
│  - Generate: FAQ content, product descriptions       │
│  - Optimize: Keywords like "sustainable fashion"     │
│  - Create: Schema markup suggestions                 │
└──────────────┬───────────────────────────────────────┘
               │
               ├─→ CTA: "Verify your content → Structure Analysis"
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Step 4: STRUCTURE ANALYSIS                          │
│  - Audit: GEO score (Evidence, Answerability, etc)   │
│  - Check: Schema markup, meta tags, structured data  │
│  - Score: 85/100 (Excellent!)                        │
└──────────────┬───────────────────────────────────────┘
               │
               ├─→ CTA: "Re-test to see improvement → Dashboard"
               │
               ▼
       ┌──────────────────┐
       │   🎉 COMPLETE!    │
       │   Back to         │
       │   Dashboard       │
       └──────────────────┘
```

---

## 🎨 Journey 2: Content-First Approach

```
START: Dashboard (User wants to improve existing content)
  │
  ├─→ Quick Action: "Analyze My Content"
  │
  ▼
┌──────────────────────────────────────────────────────┐
│  Step 1: CONTENT ANALYSIS                            │
│  - Extract: On-page vs off-site content              │
│  - Discover: Competitor pricing, offers              │
│  - Find: Content gaps and opportunities              │
└──────────────┬───────────────────────────────────────┘
               │
               ├─→ CTA: "Found 5 gaps. Generate better content →"
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Step 2: CONTENT ENHANCEMENT                         │
│  - Address gaps identified in Content Analysis       │
│  - Generate improved descriptions                    │
│  - Add missing keywords and FAQs                     │
└──────────────┬───────────────────────────────────────┘
               │
               ├─→ CTA: "Check if structure is AI-ready →"
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Step 3: STRUCTURE ANALYSIS                          │
│  - Verify GEO compliance                             │
│  - Validate schema markup                            │
│  - Test rich results eligibility                     │
└──────────────┬───────────────────────────────────────┘
               │
               ├─→ CTA: "See how you rank vs competitors →"
               │
               ▼
       ┌──────────────────┐
       │  COMPETITOR       │
       │  INSIGHT          │
       │  (Benchmark)      │
       └──────────────────┘
```

---

## 🔍 Journey 3: Quick Audit

```
START: Dashboard (User needs fast health check)
  │
  ├─→ Quick Action: "Run Structure Audit"
  │
  ▼
┌──────────────────────────────────────────────────────┐
│  STRUCTURE ANALYSIS                                  │
│  - Quick GEO score check                             │
│  - Schema validation                                 │
│  - Identify critical issues                          │
└──────────────┬───────────────────────────────────────┘
               │
               ├─→ If score < 60: "Fix issues → Content Enhancement"
               ├─→ If score > 80: "Compare with rivals → Competitor Insight"
               │
               ▼
       ┌──────────────────┐
       │   ACTION TAKEN    │
       └──────────────────┘
```

---

## 📊 Cross-Page Feature Matrix

| From Page              | To Page                | When to Suggest                              | CTA Text                          |
|------------------------|------------------------|----------------------------------------------|-----------------------------------|
| **Dashboard**          | Competitor Insight     | Low visibility score                         | "Analyze Competitors →"           |
| **Dashboard**          | Structure Analysis     | New user / no history                        | "Audit Your Content →"            |
| **Dashboard**          | Content Enhancement    | Previous analysis shows gaps                 | "Improve Content →"               |
| **Competitor Insight** | Product Insights       | After analysis completes                     | "Deep Dive into Products →"       |
| **Competitor Insight** | Content Enhancement    | User's score < competitor avg                | "Catch Up to Competitors →"       |
| **Product Insights**   | Content Enhancement    | Attribute/sentiment gaps found               | "Fill Content Gaps →"             |
| **Product Insights**   | Structure Analysis     | Low authority signals                        | "Boost Authority with Schema →"   |
| **Content Enhancement**| Structure Analysis     | After generating content                     | "Verify Structure (GEO) →"        |
| **Content Enhancement**| Content Analysis       | User wants to compare                        | "Compare with Competitors →"      |
| **Structure Analysis** | Content Enhancement    | GEO score < 60                               | "Fix Issues Now →"                |
| **Structure Analysis** | Competitor Insight     | GEO score > 80                               | "Benchmark vs Competitors →"      |
| **Content Analysis**   | Content Enhancement    | Gaps identified                              | "Generate Better Content →"       |
| **Content Analysis**   | Competitor Insight     | Want full competitive view                   | "Full Competitor Benchmark →"     |

---

## 🎯 Smart Suggestion Logic

### Condition-Based Navigation

```javascript
// Example: After Competitor Insight analysis
if (userScore < competitorAverage) {
  showSuggestion({
    type: 'warning',
    message: 'Competitors are ahead',
    action: 'Content Enhancement',
    reason: 'Improve your content to catch up'
  });
} else if (userScore > competitorAverage) {
  showSuggestion({
    type: 'success',
    message: 'You're doing great!',
    action: 'Product Insights',
    reason: 'Dive deeper to maintain your edge'
  });
}

// Example: After Product Insights
if (hasAttributeGaps) {
  showSuggestion({
    type: 'info',
    message: `Missing key attributes: ${missingAttributes.join(', ')}`,
    action: 'Content Enhancement',
    reason: 'Add these attributes to your content'
  });
}

if (lowAuthorityScore) {
  showSuggestion({
    type: 'warning',
    message: 'Low trust signals detected',
    action: 'Structure Analysis',
    reason: 'Add schema markup to boost authority'
  });
}

// Example: After Structure Analysis
if (geoScore < 60) {
  showSuggestion({
    type: 'error',
    message: 'Content not AI-optimized',
    action: 'Content Enhancement',
    reason: 'Restructure for better AI visibility'
  });
} else if (geoScore >= 80) {
  showSuggestion({
    type: 'success',
    message: 'Excellent structure!',
    action: 'Competitor Insight',
    reason: 'See how you compare to rivals'
  });
}
```

---

## 🔄 Return Loop

```
                    ┌─────────────┐
                    │  DASHBOARD  │◄─────────────┐
                    └──────┬──────┘              │
                           │                     │
                     Analyze                    │
                           │                    │
                           ▼                    │
                    ┌─────────────┐            │
                    │  RESULTS    │            │
                    │  (Any Page) │            │
                    └──────┬──────┘            │
                           │                    │
                     Implement                 │
                           │                    │
                           ▼                    │
                    ┌─────────────┐            │
                    │   ACTIONS   │            │
                    │  Taken      │            │
                    └──────┬──────┘            │
                           │                    │
                     Verify                    │
                           │                    │
                           ▼                    │
                    ┌─────────────┐            │
                    │  RE-ANALYZE │────────────┘
                    │  (See gains)│
                    └─────────────┘
```

---

## 🚀 Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create `NextStepCard` component
- [ ] Add suggestion logic helper functions
- [ ] Add state management for user journey tracking

### Phase 2: Dashboard Integration (Week 2)
- [ ] Add quick action cards on Dashboard
- [ ] Implement "What's Next?" recommendations
- [ ] Add journey progress indicator

### Phase 3: Analysis Pages (Week 3)
- [ ] Add next-step CTAs to Competitor Insight
- [ ] Add next-step CTAs to Product Insights
- [ ] Add next-step CTAs to Content Analysis

### Phase 4: Action Pages (Week 4)
- [ ] Add implementation guidance in Content Enhancement
- [ ] Add action items in Structure Analysis
- [ ] Add breadcrumb navigation to all pages

### Phase 5: Completion Loop (Week 5)
- [ ] Track user journey completion
- [ ] Show "Full Audit Complete" badge
- [ ] Add re-test prompts with comparison to previous results

---

## 📈 Expected Outcomes

After implementing these connections:
- **↑ 40%** increase in multi-page sessions
- **↑ 60%** journey completion rate
- **↓ 30%** bounce rate from analysis pages
- **↑ 50%** user returning to re-test after making changes

Users will naturally flow through: **Discover → Analyze → Fix → Verify → Improve**

