# Quick Implementation Guide

## ✨ How to Add Cross-Page Links in 5 Minutes

### Step 1: Import the Component

```tsx
import { NextStepSection, generateSuggestions } from './ui/NextStepCard';
```

### Step 2: Add to Your Page (Example: AIVisibilityAnalysis.tsx)

```tsx
export function CompetitorInsight() {
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // ... existing code ...

  // Determine if user is being outperformed
  const isOutperformed = analysisResult?.competitors?.some(
    c => c.visibility > analysisResult.userVisibility
  );

  return (
    <div>
      {/* ... existing analysis display ... */}
      
      {/* Add this at the bottom of your results section */}
      {analysisResult && (
        <NextStepSection
          cards={generateSuggestions('competitor-insight', {
            isOutperformed,
            analysisData: analysisResult
          })}
        />
      )}
    </div>
  );
}
```

### Step 3: Customize for Each Page

#### A) Competitor Insight (AIVisibilityAnalysis.tsx)
```tsx
// Around line 800, after results display
{analysisResult && (
  <NextStepSection
    cards={generateSuggestions('competitor-insight', {
      isOutperformed: analysisResult.userScore < analysisResult.competitorAverage,
      analysisData: analysisResult
    })}
  />
)}
```

#### B) Product Insights (ProductInsights.tsx)
```tsx
// Around line 900, after charts
{analysisResult && (
  <NextStepSection
    cards={generateSuggestions('product-insights', {
      hasAttributeGaps: computeAttributeGaps(analysisResult),
      lowAuthorityScore: getAuthorityScore(analysisResult) < 50,
      missingAttributes: getMissingAttributes(analysisResult),
      analysisData: analysisResult
    })}
  />
)}
```

#### C) Content Enhancement (FAQContentAnalyzer.tsx)
```tsx
// After content generation completes
{generatedContent && (
  <NextStepSection
    title="Content Ready! What's Next?"
    cards={generateSuggestions('content-enhancement', {
      content: generatedContent
    })}
  />
)}
```

#### D) Structure Analysis (ContentStructureAnalysisRoute.tsx)
```tsx
// After GEO score is calculated
{results && (
  <NextStepSection
    cards={generateSuggestions('structure-analysis', {
      geoScore: results.geoScore
    })}
  />
)}
```

#### E) Content Analysis (EcommerceContentAnalysis.tsx)
```tsx
// After gap analysis
{gaps && (
  <NextStepSection
    cards={generateSuggestions('content-analysis', {
      gapCount: gaps.length,
      identifiedGaps: gaps
    })}
  />
)}
```

---

## 🎨 Manual Card Examples (If You Want Full Control)

### Example 1: Warning Card
```tsx
import { NextStepCard } from './ui/NextStepCard';
import { AlertTriangle } from 'lucide-react';

<NextStepCard
  title="⚠️ Competitors are Outranking You"
  description="Your visibility is 13% vs competitor avg of 45%"
  icon={<AlertTriangle className="w-6 h-6" />}
  actionText="Improve Content Now"
  actionPath="/enhance-content"
  variant="warning"
  badge="Action Required"
/>
```

### Example 2: Success Card
```tsx
import { CheckCircle } from 'lucide-react';

<NextStepCard
  title="🎉 Excellent GEO Score!"
  description="Your content is well-optimized (87/100)"
  icon={<CheckCircle className="w-6 h-6" />}
  actionText="Compare with Competitors"
  actionPath="/ai-visibility-analysis"
  variant="success"
/>
```

### Example 3: Info Card with State
```tsx
import { BarChart3 } from 'lucide-react';

<NextStepCard
  title="📊 Deep Dive Available"
  description="Analyze sentiment and authority for all 5 competitors"
  icon={<BarChart3 className="w-6 h-6" />}
  actionText="View Product Insights"
  actionPath="/product-insights"
  actionState={{ competitors: analysisResult.competitors }}
  variant="info"
  badge="Recommended"
/>
```

---

## 🚀 Dashboard Quick Actions

Add these to Overview.tsx to create action cards:

```tsx
// Add after header, before main analysis section
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
  <ActionCard
    title="Analyze Competitors"
    description="See how you rank in AI search"
    icon={<Eye className="w-8 h-8" />}
    onClick={() => navigate('/ai-visibility-analysis')}
    color="blue"
  />
  <ActionCard
    title="Audit Structure"
    description="Check your GEO score"
    icon={<Target className="w-8 h-8" />}
    onClick={() => navigate('/content-structure-analysis')}
    color="green"
  />
  <ActionCard
    title="Enhance Content"
    description="Generate AI-optimized copy"
    icon={<FileText className="w-8 h-8" />}
    onClick={() => navigate('/enhance-content')}
    color="purple"
  />
</div>

// ActionCard component (create in Overview.tsx)
function ActionCard({ title, description, icon, onClick, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700',
    green: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700',
    purple: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700',
  };

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color]} border rounded-xl p-6 text-left hover:shadow-md transition-all duration-200 group`}
    >
      <div className="flex items-center gap-4">
        <div className="group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-1">{title}</h3>
          <p className="text-sm opacity-75">{description}</p>
        </div>
      </div>
    </button>
  );
}
```

---

## 🔗 Breadcrumb Navigation (Optional but Recommended)

Create a simple breadcrumb component:

```tsx
// src/components/ui/Breadcrumbs.tsx
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center text-sm text-gray-600 mb-4">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="w-4 h-4 mx-2" />}
          {item.path ? (
            <button
              onClick={() => navigate(item.path)}
              className="hover:text-blue-600 hover:underline"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-medium text-gray-900">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

// Usage in any page:
<Breadcrumbs
  items={[
    { label: 'Dashboard', path: '/overview' },
    { label: 'Competitor Insight', path: '/ai-visibility-analysis' },
    { label: 'Product Insights' } // current page, no path
  ]}
/>
```

---

## 📊 Helper Functions for Analysis Detection

Add these utility functions to detect conditions:

```tsx
// src/utils/analysisHelpers.ts

export function isUserOutperformed(analysisResult: any): boolean {
  if (!analysisResult?.competitors) return false;
  
  const userScore = analysisResult.userVisibility || 0;
  const avgCompetitorScore = 
    analysisResult.competitors.reduce((sum: number, c: any) => 
      sum + (c.visibility || 0), 0) / analysisResult.competitors.length;
  
  return userScore < avgCompetitorScore;
}

export function hasAttributeGaps(analysisResult: any): boolean {
  if (!analysisResult?.competitors) return false;
  
  // Check if competitors have attributes that user is missing
  const allCompetitorAttributes = new Set();
  analysisResult.competitors.forEach((c: any) => {
    Object.keys(c.productAttributes || {}).forEach(attr => 
      allCompetitorAttributes.add(attr)
    );
  });
  
  return allCompetitorAttributes.size > 0;
}

export function getAuthorityScore(analysisResult: any): number {
  if (!analysisResult?.authority) return 0;
  
  return analysisResult.authority.reduce((sum: number, signal: any) => 
    sum + (signal.count || 0), 0);
}

export function getMissingAttributes(analysisResult: any): string[] {
  // Logic to find attributes competitors have but user doesn't
  const competitorAttrs = new Set<string>();
  const userAttrs = new Set<string>();
  
  analysisResult.competitors?.forEach((c: any) => {
    Object.keys(c.productAttributes || {}).forEach(attr => 
      competitorAttrs.add(attr)
    );
  });
  
  // Assuming first competitor is the user
  Object.keys(analysisResult.competitors?.[0]?.productAttributes || {})
    .forEach(attr => userAttrs.add(attr));
  
  return Array.from(competitorAttrs).filter(attr => !userAttrs.has(attr));
}
```

---

## ✅ Testing Checklist

After implementing:
- [ ] Navigate from Competitor Insight → shows Product Insights suggestion
- [ ] Navigate from Product Insights → shows Content Enhancement suggestion
- [ ] Navigate from Content Enhancement → shows Structure Analysis suggestion
- [ ] Navigate from Structure Analysis → shows relevant next step based on score
- [ ] All suggestion cards display correct variant colors
- [ ] Clicking cards navigates with correct state passed
- [ ] Cards only show when results are available

---

## 🎯 Priority Pages to Update First

1. **Competitor Insight** (AIVisibilityAnalysis.tsx)
   - Highest traffic page
   - Users need guidance after seeing results

2. **Product Insights** (ProductInsights.tsx)
   - Users often get stuck here
   - Clear action paths needed

3. **Dashboard** (Overview.tsx)
   - Entry point for all users
   - Quick action cards make huge difference

4. **Content Enhancement** (FAQContentAnalyzer.tsx)
   - After generating content, users don't know what to do next

5. **Structure Analysis** (ContentStructureAnalysisRoute.tsx)
   - Based on GEO score, guide users to fix or compare

---

## 💡 Pro Tips

1. **Use State Passing**: When navigating, pass analysis data so the next page can pre-populate or provide context
   ```tsx
   navigate('/product-insights', { 
     state: { 
       competitors: analysisResult.competitors,
       fromPage: 'competitor-insight'
     } 
   })
   ```

2. **Conditional Display**: Only show suggestions when they make sense
   ```tsx
   {analysisResult && analysisResult.competitors?.length > 0 && (
     <NextStepSection cards={...} />
   )}
   ```

3. **Track User Journey**: Add analytics to see which suggestions users click
   ```tsx
   onClick={() => {
     trackEvent('next_step_clicked', { from: 'competitor-insight', to: 'product-insights' });
     navigate('/product-insights');
   }}
   ```

4. **A/B Test Messages**: Try different descriptions to see what resonates
   ```tsx
   // Version A
   description: "Competitors mention key attributes more"
   
   // Version B
   description: "Add these 3 keywords to catch up: Fast Shipping, Sustainable, Luxury"
   ```

---

## 🚀 30-Second Quick Start

**Just want to get started NOW?**

1. Copy `NextStepCard.tsx` to your project ✅ (Already done!)
2. Open `AIVisibilityAnalysis.tsx`
3. Add at the bottom of your results section:

```tsx
import { NextStepSection, generateSuggestions } from './ui/NextStepCard';

// In your return statement, after results display:
{analysisResult && (
  <div className="mt-8">
    <NextStepSection
      cards={generateSuggestions('competitor-insight', analysisResult)}
    />
  </div>
)}
```

4. Save and test! 🎉

That's it! You now have smart next-step suggestions guiding users through your platform.

