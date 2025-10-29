# Competitor Analysis - 2 Card Layout Update

## Summary
Updated the **Competitor Insight** page to display competitor analysis as **2 separate cards** instead of 1 combined card, matching the layout style of the Dashboard page.

---

## Changes Made

### 1. **Updated Icons Import**
```typescript
// BEFORE:
import { ..., RefreshCw } from 'lucide-react';

// AFTER:
import { ..., RefreshCw, BarChart, Grid3X3 } from 'lucide-react';
```

Added `BarChart` and `Grid3X3` icons for the new cards.

---

### 2. **Enhanced DashboardCard Component**
```typescript
interface DashboardCardProps {
  title: string;
  icon: React.ReactNode;
  iconBgColor?: string;  // Made optional
  children: React.ReactNode;
  tooltip?: string;      // ADDED: Tooltip support
}
```

**Features:**
- ✅ Optional `tooltip` prop with hover tooltip display
- ✅ Optional `iconBgColor` for flexible styling
- ✅ Info icon (ⓘ) appears when tooltip is provided

---

### 3. **Added Helper Functions**
```typescript
const getBarClass = (score: number) => {
  // Returns bg-green-500, bg-blue-500, bg-yellow-500, or bg-red-500
  // Based on score range (0-10 or 0-100)
};

const getPillClass = (score: number) => {
  // Returns colored pill classes for table cells
  // e.g., 'text-green-600 bg-green-100'
};

const getScoreClass = (score: number) => {
  // Returns colored text classes for scores
  // e.g., 'text-green-600 font-semibold'
};

const formatScore = (score: number) => {
  return score.toFixed(4);
};
```

**Purpose:** Consistent color coding across both cards based on score ranges:
- 🟢 **Green (80-100)**: Excellent
- 🔵 **Blue (60-79)**: Good
- 🟡 **Yellow (40-59)**: Fair
- 🔴 **Red (0-39)**: Poor

---

### 4. **Replaced Single Card with 2-Card Layout**

#### **BEFORE:**
```tsx
<div className="bg-white rounded-lg shadow p-6">
  <h3>Competitor Analysis</h3>
  <AIVisibilityTable data={analysisResult} />
</div>
```

#### **AFTER:**
```tsx
{/* Card 1: Competitor Performance Overview (Bar Chart) */}
<DashboardCard
  title="Competitor Performance Overview"
  tooltip="Visual comparison of average AI visibility scores across competitors"
  icon={<BarChart className="w-4 h-4" />}
>
  {/* Animated bar chart visualization */}
  {/* Color-coded legend */}
</DashboardCard>

{/* Card 2: Competitors Comparison (Table) */}
<DashboardCard
  title="Competitors Comparison"
  tooltip="Detailed scoring breakdown for each company across multiple models"
  icon={<Grid3X3 className="w-4 h-4" />}
>
  {/* Detailed table with Gemini, Perplexity, Claude, ChatGPT scores */}
  {/* Average score column */}
</DashboardCard>
```

---

## Visual Layout

### **Card 1: Competitor Performance Overview**
```
┌────────────────────────────────────────────────┐
│ Competitor Performance Overview         [📊]   │
│ ────────────────────────────────────────────  │
│                                                │
│    0.0000  1.0000  1.0000  1.0000  0.0000    │
│    ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│    │    │ │████│ │████│ │████│ │    │       │
│    │    │ │████│ │████│ │████│ │    │       │
│    │    │ │████│ │████│ │████│ │    │       │
│    └────┘ └────┘ └────┘ └────┘ └────┘       │
│    Zara    H&M    Gap   Uniqlo  Nike         │
│                                                │
│  🟢 Excellent  🔵 Good  🟡 Fair  🔴 Poor      │
└────────────────────────────────────────────────┘
```

### **Card 2: Competitors Comparison**
```
┌────────────────────────────────────────────────┐
│ Competitors Comparison                  [⊞]    │
│ ────────────────────────────────────────────  │
│                                                │
│ Company  │ Gemini │ Perplexity │ Claude │ ... │
│ ─────────┼────────┼────────────┼────────┼──── │
│ 🔵 Zara  │ 0.0000 │   1.0000   │ 1.0000 │ ... │
│ 🔵 H&M   │ 1.0000 │   0.0000   │ 0.0000 │ ... │
│ ...                                            │
└────────────────────────────────────────────────┘
```

---

## Benefits

### ✅ **Consistency**
- Matches the Dashboard page layout
- Users see the same familiar structure across pages

### ✅ **Visual Hierarchy**
- Bar chart provides quick at-a-glance comparison
- Table provides detailed breakdown for deep analysis

### ✅ **Improved UX**
- Tooltips explain what each card shows
- Color-coded scores are easy to interpret
- Responsive design works on all screen sizes

### ✅ **Maintainability**
- Shared helper functions across components
- Consistent styling patterns
- Reusable `DashboardCard` component

---

## File Modified
- `kabini/project.webapp/src/components/AIVisibilityAnalysis.tsx`

---

## Testing Checklist

- [ ] Run analysis on Competitor Insight page
- [ ] Verify 2 separate cards are displayed:
  - [ ] "Competitor Performance Overview" with bar chart
  - [ ] "Competitors Comparison" with table
- [ ] Check color coding:
  - [ ] Bars match score ranges (green/blue/yellow/red)
  - [ ] Table pills match score ranges
- [ ] Verify tooltips appear on hover (ⓘ icons)
- [ ] Check responsive behavior on mobile/tablet/desktop
- [ ] Compare with Dashboard page for consistency

---

## Notes

- The old single card with `AIVisibilityTable` has been **removed**
- All competitor data still comes from the same `analysisResult.competitors` array
- The 2-card layout provides both **visual** (chart) and **detailed** (table) views
- Color scheme matches the Dashboard page for consistency

---

**Date**: 2025-10-24
**Status**: ✅ Complete














