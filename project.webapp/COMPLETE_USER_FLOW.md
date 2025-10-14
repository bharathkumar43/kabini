# Complete User Flow - Easy to Understand Navigation

## 🎯 Core User Goal
**"I want to improve my ecommerce website's visibility in AI search engines like ChatGPT, Gemini, and Perplexity"**

---

## 📍 User Flow Map - The Complete Journey

```
                    ┌─────────────────────────────────────┐
                    │         🏠 DASHBOARD                │
                    │  "Start here - Your AI visibility   │
                    │   overview and quick actions"       │
                    └────────────┬────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │  User asks:             │
                    │  "Where do I start?"    │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
   "I'm new"              "I have content"         "Show me competitors"
   START HERE             FIX MY CONTENT           COMPARE NOW
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌────────────────┐      ┌──────────────────┐
│   STRUCTURE   │      │    CONTENT     │      │   COMPETITOR     │
│   ANALYSIS    │      │   ANALYSIS     │      │    INSIGHT       │
│               │      │                │      │                  │
│ "Check if     │      │ "What's on     │      │ "How do I rank   │
│  my page is   │      │  my page vs    │      │  vs competitors?"│
│  AI-ready"    │      │  competitors?" │      │                  │
└───────┬───────┘      └────────┬───────┘      └────────┬─────────┘
        │                       │                        │
        ▼                       ▼                        ▼
   [Results]              [Results]                [Results]
        │                       │                        │
        └───────────────────────┼────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   All paths lead to:  │
                    │                       │
                    │  📊 PRODUCT INSIGHTS  │
                    │  "Deep dive analysis" │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Identify gaps/issues │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  ✨ CONTENT           │
                    │    ENHANCEMENT        │
                    │                       │
                    │  "Fix the problems"   │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  📋 STRUCTURE         │
                    │     ANALYSIS          │
                    │                       │
                    │  "Verify it's fixed"  │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  🔄 RE-TEST           │
                    │  Competitor Insight   │
                    │  "See improvement"    │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  🎉 SUCCESS!          │
                    │  Back to Dashboard    │
                    │  Track progress       │
                    └───────────────────────┘
```

---

## 🎨 Page-by-Page Linking Strategy

### 1. 🏠 DASHBOARD (Entry Point)

**Purpose:** Show overall AI visibility and guide users to their next action

**User Sees:**
- Current AI visibility score
- Recent analysis results
- Clear action buttons based on status

**Exit Points:**
```tsx
// If NO previous analysis → Guide to start
<WelcomeCard>
  <h2>👋 Welcome! Let's get started</h2>
  <p>Choose how you'd like to begin:</p>
  
  <ActionButton onClick={() => navigate('/ai-visibility-analysis')}>
    🎯 Compare with Competitors
    <subtitle>See how you rank in AI search</subtitle>
  </ActionButton>
  
  <ActionButton onClick={() => navigate('/content-structure-analysis')}>
    📋 Quick Health Check
    <subtitle>Is your site AI-ready? (2 min audit)</subtitle>
  </ActionButton>
  
  <ActionButton onClick={() => navigate('/ecommerce-content-analysis')}>
    🔍 Analyze My Content
    <subtitle>What's on your page vs competitors</subtitle>
  </ActionButton>
</WelcomeCard>

// If LOW visibility (< 30%) → Urgent action needed
<AlertCard variant="warning">
  <h3>⚠️ Low AI Visibility Detected (13%)</h3>
  <p>Competitors are ranking 3x more than you in AI search</p>
  
  <PrimaryButton onClick={() => navigate('/ai-visibility-analysis')}>
    See What Competitors Are Doing →
  </PrimaryButton>
</AlertCard>

// If MEDIUM visibility (30-60%) → Optimize
<InfoCard>
  <h3>📊 You're on the right track (42%)</h3>
  <p>Let's identify gaps to improve your ranking</p>
  
  <PrimaryButton onClick={() => navigate('/product-insights')}>
    Find Improvement Opportunities →
  </PrimaryButton>
</InfoCard>

// If HIGH visibility (> 60%) → Maintain
<SuccessCard>
  <h3>🎉 Great visibility! (68%)</h3>
  <p>Keep monitoring and stay ahead</p>
  
  <PrimaryButton onClick={() => navigate('/ai-visibility-analysis')}>
    Track Your Position →
  </PrimaryButton>
</SuccessCard>

// ALWAYS show: Quick Actions Grid
<QuickActionsGrid>
  <QuickAction icon="🎯" label="Competitor Analysis" path="/ai-visibility-analysis" />
  <QuickAction icon="📊" label="Product Deep Dive" path="/product-insights" />
  <QuickAction icon="✨" label="Enhance Content" path="/enhance-content" />
  <QuickAction icon="📋" label="Structure Audit" path="/content-structure-analysis" />
  <QuickAction icon="🔍" label="Content Analysis" path="/ecommerce-content-analysis" />
  <QuickAction icon="⚙️" label="Settings" path="/configuration" />
</QuickActionsGrid>
```

---

### 2. 🎯 COMPETITOR INSIGHT (Primary Analysis)

**Purpose:** Compare your brand vs competitors in AI search results

**User Journey:**
1. User enters website/company name
2. System finds competitors
3. Shows visibility comparison
4. User needs to understand WHY competitors are ahead

**Exit Points:**
```tsx
// ALWAYS after analysis completes
<ResultsSection>
  {/* Main results display */}
  
  {/* Next steps section */}
  <NextStepsCard>
    <h3>What's Next?</h3>
    
    {/* Primary recommendation - ALWAYS SHOW */}
    <PrimaryNextStep variant="info">
      <Icon>📊</Icon>
      <Content>
        <Title>Deep Dive into Details</Title>
        <Description>
          See sentiment, authority signals, and FAQs for each competitor
        </Description>
        <Button onClick={() => navigate('/product-insights', { 
          state: { analysisData: analysisResult } 
        })}>
          Go to Product Insights →
        </Button>
      </Content>
    </PrimaryNextStep>
    
    {/* If user is behind competitors */}
    {userVisibility < competitorAverage && (
      <SecondaryNextStep variant="warning">
        <Icon>⚠️</Icon>
        <Content>
          <Title>Competitors are ahead by {gap}%</Title>
          <Description>
            Improve your content to catch up
          </Description>
          <Button onClick={() => navigate('/enhance-content')}>
            Enhance Your Content →
          </Button>
        </Content>
      </SecondaryNextStep>
    )}
    
    {/* If user wants to see detailed content comparison */}
    <TertiaryNextStep>
      <LinkButton onClick={() => navigate('/ecommerce-content-analysis')}>
        Or analyze content in detail →
      </LinkButton>
    </TertiaryNextStep>
  </NextStepsCard>
</ResultsSection>

// BREADCRUMB (top of page)
<Breadcrumb>
  Dashboard > Competitor Insight
</Breadcrumb>

// BACK BUTTON (top of page)
<BackButton onClick={() => navigate('/overview')}>
  ← Back to Dashboard
</BackButton>
```

---

### 3. 📊 PRODUCT INSIGHTS (Deep Analysis)

**Purpose:** Understand sentiment, authority, FAQs, and attributes for all competitors

**User Journey:**
1. Arrives from Competitor Insight (or directly)
2. Sees detailed breakdown of each competitor
3. Identifies specific gaps (missing attributes, low sentiment, weak authority)
4. Needs to FIX these gaps

**Exit Points:**
```tsx
// BREADCRUMB (top of page)
<Breadcrumb>
  Dashboard > Competitor Insight > Product Insights
</Breadcrumb>

// BACK BUTTON (top of page)
<BackButton onClick={() => navigate('/ai-visibility-analysis')}>
  ← Back to Competitor Insight
</BackButton>

// After showing all charts and data
<GapAnalysisSection>
  <h3>🎯 Your Improvement Opportunities</h3>
  
  {/* Missing Attributes */}
  {missingAttributes.length > 0 && (
    <GapCard variant="warning">
      <Icon>🏷️</Icon>
      <Content>
        <Title>Missing Key Attributes</Title>
        <List>
          {missingAttributes.map(attr => (
            <li key={attr}>{attr} - mentioned {attr.competitorCount}x by competitors</li>
          ))}
        </List>
        <Description>
          Add these attributes to your content to match competitors
        </Description>
        <Button onClick={() => navigate('/enhance-content', {
          state: { 
            focusAttributes: missingAttributes,
            fromPage: 'product-insights' 
          }
        })}>
          Generate Content with These Attributes →
        </Button>
      </Content>
    </GapCard>
  )}
  
  {/* Low Authority Score */}
  {authorityScore < 50 && (
    <GapCard variant="error">
      <Icon>🔍</Icon>
      <Content>
        <Title>Low Authority Signals Detected</Title>
        <Description>
          Your site has {authoritySignalCount} authority signals vs competitor avg of {competitorAvgAuthority}.
          Add schema markup and structured data to boost trust.
        </Description>
        <Button onClick={() => navigate('/content-structure-analysis')}>
          Audit Structure & Add Schema →
        </Button>
      </Content>
    </GapCard>
  )}
  
  {/* Low Sentiment */}
  {sentimentScore < 3 && (
    <GapCard variant="warning">
      <Icon>😐</Icon>
      <Content>
        <Title>Sentiment Could Be Better</Title>
        <Description>
          Your content sentiment is {sentimentScore}/5. Improve tone and messaging.
        </Description>
        <Button onClick={() => navigate('/enhance-content', {
          state: { focusArea: 'sentiment' }
        })}>
          Improve Content Tone →
        </Button>
      </Content>
    </GapCard>
  )}
  
  {/* No major gaps - good standing */}
  {noGapsDetected && (
    <GapCard variant="success">
      <Icon>🎉</Icon>
      <Content>
        <Title>You're Competitive!</Title>
        <Description>
          Your content matches competitors well. Keep optimizing and monitoring.
        </Description>
        <ButtonGroup>
          <Button onClick={() => navigate('/enhance-content')}>
            Further Enhance Content →
          </Button>
          <SecondaryButton onClick={() => navigate('/content-structure-analysis')}>
            Verify Structure →
          </SecondaryButton>
        </ButtonGroup>
      </Content>
    </GapCard>
  )}
</GapAnalysisSection>

// ALWAYS show alternative paths
<AlternativeActions>
  <SmallLink onClick={() => navigate('/ecommerce-content-analysis')}>
    View detailed content comparison →
  </SmallLink>
  <SmallLink onClick={() => navigate('/overview')}>
    Back to dashboard →
  </SmallLink>
</AlternativeActions>
```

---

### 4. ✨ CONTENT ENHANCEMENT (Fix Problems)

**Purpose:** Generate AI-optimized content (FAQs, descriptions, keywords, schema)

**User Journey:**
1. Arrives knowing what gaps to fix (from Product Insights)
2. Generates improved content
3. Gets actionable content they can use
4. Needs to VERIFY it works

**Entry Points:**
```tsx
// If coming from Product Insights with context
useEffect(() => {
  const state = location.state;
  if (state?.focusAttributes) {
    // Pre-fill form with suggested attributes
    setSuggestedKeywords(state.focusAttributes);
    showSuggestionBanner(
      `💡 Tip: Add these attributes to match competitors: ${state.focusAttributes.join(', ')}`
    );
  }
  if (state?.focusArea === 'sentiment') {
    showSuggestionBanner(
      `💡 Focus on positive, engaging language to improve sentiment score`
    );
  }
}, [location.state]);
```

**Exit Points:**
```tsx
// BREADCRUMB (top of page)
<Breadcrumb>
  Dashboard > Content Enhancement
</Breadcrumb>

// CONTEXT BANNER (if came from another page)
{location.state?.fromPage && (
  <ContextBanner>
    <Info>You came from Product Insights to fix identified gaps</Info>
    <BackLink onClick={() => navigate('/product-insights')}>
      ← Back to Product Insights
    </BackLink>
  </ContextBanner>
)}

// After content is generated
<GeneratedContentSection>
  {/* Display generated content */}
  
  <SuccessBanner>
    <Icon>✅</Icon>
    <Text>Content generated successfully!</Text>
  </SuccessBanner>
  
  <NextStepsCard>
    <h3>Your content is ready! Now what?</h3>
    
    {/* Primary: Verify the content */}
    <PrimaryAction variant="info">
      <Icon>📋</Icon>
      <Content>
        <Title>1. Verify Structure & Schema</Title>
        <Description>
          Check if your content is properly structured for AI search engines (GEO audit)
        </Description>
        <Button onClick={() => navigate('/content-structure-analysis', {
          state: { generatedContent }
        })}>
          Run Structure Analysis →
        </Button>
      </Content>
    </PrimaryAction>
    
    {/* Secondary: Compare with competitors */}
    <SecondaryAction>
      <Icon>🔍</Icon>
      <Content>
        <Title>2. Compare with Competitors</Title>
        <Description>
          See how your new content stacks up against the competition
        </Description>
        <Button onClick={() => navigate('/ecommerce-content-analysis')}>
          Analyze Content →
        </Button>
      </Content>
    </SecondaryAction>
    
    {/* Tertiary: Test visibility */}
    <TertiaryAction>
      <Icon>🎯</Icon>
      <Content>
        <Title>3. Test Your New Visibility</Title>
        <Description>
          After implementing this content, re-run competitor analysis to see improvement
        </Description>
        <Button variant="outline" onClick={() => navigate('/ai-visibility-analysis')}>
          Re-test Visibility →
        </Button>
      </Content>
    </TertiaryAction>
  </NextStepsCard>
  
  {/* Quick actions */}
  <QuickLinks>
    <Link onClick={() => navigate('/overview')}>← Back to Dashboard</Link>
    <Link onClick={handleGenerateMore}>Generate more content</Link>
  </QuickLinks>
</GeneratedContentSection>
```

---

### 5. 📋 STRUCTURE ANALYSIS (Verify AI-Readiness)

**Purpose:** Audit URL structure, GEO score, schema markup, and rich results eligibility

**User Journey:**
1. Arrives to check if page is AI-optimized
2. Gets GEO score and specific issues
3. Needs to either FIX problems or COMPARE with competitors

**Exit Points:**
```tsx
// BREADCRUMB
<Breadcrumb>
  Dashboard > Structure Analysis
</Breadcrumb>

// After audit completes
<AuditResults>
  {/* Display GEO score and findings */}
  
  <ScoreCard score={geoScore}>
    <ScoreDisplay>{geoScore}/100</ScoreDisplay>
    <ScoreLabel>
      {geoScore >= 80 ? 'Excellent! 🎉' :
       geoScore >= 60 ? 'Good 👍' :
       geoScore >= 40 ? 'Needs Work ⚠️' :
       'Critical Issues 🚨'}
    </ScoreLabel>
  </ScoreCard>
  
  {/* If score is LOW (<60) */}
  {geoScore < 60 && (
    <ActionCard variant="error">
      <Icon>🚨</Icon>
      <Content>
        <Title>Your content needs optimization</Title>
        <IssuesList>
          {issues.map(issue => (
            <Issue key={issue.id}>
              <IssueIcon>{issue.severity}</IssueIcon>
              <IssueText>{issue.description}</IssueText>
            </Issue>
          ))}
        </IssuesList>
        <Description>
          Fix these issues to improve your AI search visibility
        </Description>
        <Button onClick={() => navigate('/enhance-content', {
          state: { 
            issues,
            focusArea: 'structure',
            currentScore: geoScore 
          }
        })}>
          Fix These Issues →
        </Button>
      </Content>
    </ActionCard>
  )}
  
  {/* If score is MEDIUM (60-80) */}
  {geoScore >= 60 && geoScore < 80 && (
    <ActionCard variant="warning">
      <Icon>👍</Icon>
      <Content>
        <Title>Good structure! Room for improvement</Title>
        <Description>
          Your content is AI-ready but could be better. Address these suggestions:
        </Description>
        <SuggestionsList>
          {suggestions.map(s => <li key={s}>{s}</li>)}
        </SuggestionsList>
        <ButtonGroup>
          <Button onClick={() => navigate('/enhance-content', {
            state: { suggestions }
          })}>
            Implement Suggestions →
          </Button>
          <SecondaryButton onClick={() => navigate('/ai-visibility-analysis')}>
            Compare with Competitors →
          </SecondaryButton>
        </ButtonGroup>
      </Content>
    </ActionCard>
  )}
  
  {/* If score is HIGH (80+) */}
  {geoScore >= 80 && (
    <ActionCard variant="success">
      <Icon>🎉</Icon>
      <Content>
        <Title>Excellent! Your content is well-optimized</Title>
        <Description>
          Your structure is AI-ready. Now let's see how you compare to competitors.
        </Description>
        <ButtonGroup>
          <Button onClick={() => navigate('/ai-visibility-analysis')}>
            Check Competitor Rankings →
          </Button>
          <SecondaryButton onClick={() => navigate('/product-insights')}>
            Deep Dive Analysis →
          </SecondaryButton>
        </ButtonGroup>
      </Content>
    </ActionCard>
  )}
  
  {/* Always show: Audit another page */}
  <AlternativeActions>
    <Button variant="outline" onClick={handleNewAudit}>
      🔄 Audit Another Page
    </Button>
    <Link onClick={() => navigate('/overview')}>
      ← Back to Dashboard
    </Link>
  </AlternativeActions>
</AuditResults>
```

---

### 6. 🔍 CONTENT ANALYSIS (Detailed Comparison)

**Purpose:** Extract on-page vs off-site content, discover competitor pricing/offers, find content gaps

**User Journey:**
1. Arrives to understand content differences
2. Sees what's on their page vs competitors
3. Discovers gaps and opportunities
4. Needs to GENERATE better content

**Exit Points:**
```tsx
// BREADCRUMB
<Breadcrumb>
  Dashboard > Content Analysis
</Breadcrumb>

// After analysis completes
<ContentComparisonResults>
  {/* Display content extraction and comparison */}
  
  <GapSummary>
    <h3>🎯 Content Opportunities Found</h3>
    <Stats>
      <Stat>
        <Number>{gapCount}</Number>
        <Label>Content Gaps</Label>
      </Stat>
      <Stat>
        <Number>{competitorCount}</Number>
        <Label>Competitors Analyzed</Label>
      </Stat>
      <Stat>
        <Number>{opportunityScore}</Number>
        <Label>Opportunity Score</Label>
      </Stat>
    </Stats>
  </GapSummary>
  
  {/* If gaps found */}
  {gapCount > 0 && (
    <ActionCard variant="info">
      <Icon>💡</Icon>
      <Content>
        <Title>We found {gapCount} ways to improve your content</Title>
        <GapsList>
          {identifiedGaps.map(gap => (
            <GapItem key={gap.id}>
              <GapType>{gap.type}</GapType>
              <GapDescription>{gap.description}</GapDescription>
              <GapImpact>Impact: {gap.impact}</GapImpact>
            </GapItem>
          ))}
        </GapsList>
        <Button onClick={() => navigate('/enhance-content', {
          state: { 
            gaps: identifiedGaps,
            competitorData: analysisResult 
          }
        })}>
          Generate Better Content →
        </Button>
      </Content>
    </ActionCard>
  )}
  
  {/* See detailed competitor comparison */}
  <ActionCard variant="default">
    <Icon>📊</Icon>
    <Content>
      <Title>Want a complete competitive benchmark?</Title>
      <Description>
        See full visibility analysis across all AI search engines
      </Description>
      <ButtonGroup>
        <Button onClick={() => navigate('/ai-visibility-analysis')}>
          Full Competitor Analysis →
        </Button>
        <SecondaryButton onClick={() => navigate('/product-insights')}>
          Product Deep Dive →
        </SecondaryButton>
      </ButtonGroup>
    </Content>
  </ActionCard>
  
  {/* Check structure */}
  <AlternativeActions>
    <Link onClick={() => navigate('/content-structure-analysis')}>
      Audit your page structure →
    </Link>
    <Link onClick={() => navigate('/overview')}>
      Back to Dashboard →
    </Link>
  </AlternativeActions>
</ContentComparisonResults>
```

---

### 7. ⚙️ SETTINGS (Configuration)

**Purpose:** Manage account, API keys, model preferences

**Exit Points:**
```tsx
// BREADCRUMB
<Breadcrumb>
  Dashboard > Settings
</Breadcrumb>

// After saving settings
<SuccessBanner>
  ✅ Settings saved!
  
  <NextStepsLinks>
    <Link onClick={() => navigate('/overview')}>
      ← Back to Dashboard
    </Link>
    <Link onClick={() => navigate('/ai-visibility-analysis')}>
      Start an analysis →
    </Link>
  </NextStepsLinks>
</SuccessBanner>
```

---

### 8. 📜 HISTORY

**Purpose:** View past analyses

**Exit Points:**
```tsx
// BREADCRUMB
<Breadcrumb>
  Dashboard > History
</Breadcrumb>

// For each history item
<HistoryItem>
  {/* ... item details ... */}
  
  <Actions>
    <Button onClick={() => restoreAnalysis(item)}>
      View Details
    </Button>
    <Button onClick={() => {
      // Restore and navigate to appropriate page
      if (item.type === 'competitor-insight') {
        navigate('/ai-visibility-analysis', { state: { restored: item } });
      } else if (item.type === 'product-insights') {
        navigate('/product-insights', { state: { restored: item } });
      }
      // ... etc
    }}>
      Re-run Analysis
    </Button>
  </Actions>
</HistoryItem>
```

---

### 9. 📈 STATISTICS

**Purpose:** Track trends and progress over time

**Exit Points:**
```tsx
// BREADCRUMB
<Breadcrumb>
  Dashboard > Statistics
</Breadcrumb>

// Show trends
<TrendCard>
  {/* Display statistics */}
  
  {trend === 'improving' && (
    <ActionCard variant="success">
      <Icon>📈</Icon>
      <Content>
        <Title>You're improving! +{improvement}%</Title>
        <Description>Keep optimizing to maintain this growth</Description>
        <Button onClick={() => navigate('/ai-visibility-analysis')}>
          Run Latest Analysis →
        </Button>
      </Content>
    </ActionCard>
  )}
  
  {trend === 'declining' && (
    <ActionCard variant="warning">
      <Icon>📉</Icon>
      <Content>
        <Title>Visibility declining -{decline}%</Title>
        <Description>Competitors may have updated their content</Description>
        <Button onClick={() => navigate('/ai-visibility-analysis')}>
          Check Competition →
        </Button>
      </Content>
    </ActionCard>
  )}
</TrendCard>
```

---

## 🎯 Key Principles for Easy Understanding

### 1. **Always Show "Where Am I?"**
```tsx
// Every page should have:
- Breadcrumb navigation at top
- Page title with icon and description
- Back button (if not entry point)
```

### 2. **Always Show "What's Next?"**
```tsx
// Every results page should have:
- Clear next step section
- 1-3 action buttons (primary, secondary, tertiary)
- Brief explanation of why this is recommended
```

### 3. **Use Visual Hierarchy**
```tsx
// Priority of actions:
1. PRIMARY (Big blue button) - Most recommended
2. SECONDARY (Outlined button) - Alternative path
3. TERTIARY (Text link) - Optional action
```

### 4. **Context Awareness**
```tsx
// Pass state between pages:
navigate('/enhance-content', {
  state: {
    fromPage: 'product-insights',
    gaps: identifiedGaps,
    suggestedAttributes: ['Fast Shipping', 'Sustainable']
  }
});

// In target page, use the context:
const state = location.state;
if (state?.gaps) {
  showBanner(`💡 Fixing ${state.gaps.length} gaps identified in Product Insights`);
}
```

### 5. **Progress Indicators**
```tsx
// Show user their journey:
<ProgressIndicator>
  <Step completed>1. Analyze ✓</Step>
  <Step current>2. Identify Gaps</Step>
  <Step>3. Fix Content</Step>
  <Step>4. Verify</Step>
  <Step>5. Re-test</Step>
</ProgressIndicator>
```

---

## 🔄 Complete User Journey Example

### Scenario: New user wants to improve AI visibility

**Step 1: Dashboard (Entry)**
```
User lands → Sees "Low visibility" warning
→ Clicks "Compare with Competitors"
```

**Step 2: Competitor Insight**
```
User enters website → Runs analysis
→ Sees "You: 13%, Competitors: 45%"
→ Clicks "Deep Dive into Products"
```

**Step 3: Product Insights**
```
User sees gaps:
- Missing "Fast Shipping" attribute (mentioned 12x by competitors)
- Low authority score (3 vs avg 8)
- Sentiment 2.5/5 vs avg 4.2/5

→ Clicks "Generate Content with These Attributes"
```

**Step 4: Content Enhancement**
```
Banner shows: "💡 Adding: Fast Shipping, Sustainable, 24/7 Support"
User generates product description + FAQ
→ Sees "Content ready!"
→ Clicks "Verify Structure & Schema"
```

**Step 5: Structure Analysis**
```
User gets GEO score: 87/100
→ Sees "Excellent! Your content is well-optimized"
→ Clicks "Check Competitor Rankings"
```

**Step 6: Re-test (Back to Competitor Insight)**
```
User runs analysis again
→ New visibility: 28% (up from 13%!)
→ Sees improvement message
→ Clicks "Back to Dashboard"
```

**Step 7: Dashboard**
```
Dashboard now shows:
- "Visibility improved +15%! 📈"
- "Keep optimizing to reach 50%"
- Suggestions for next steps
```

---

This creates an intuitive, guided experience where users always know:
1. Where they are
2. What they can do next
3. Why it's recommended
4. How to get back

Would you like me to implement this on specific pages?

