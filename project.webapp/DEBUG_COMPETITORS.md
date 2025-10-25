# Debug Competitors Issue

## Step 1: Check Console Logs

Please open your browser console (F12 → Console tab) and look for these messages after clicking Refresh:

```
[ProductInsights] Force refresh - clearing cache for: ...
[BackgroundOrchestrator] Product Insight - API returned competitors: X
[BackgroundOrchestrator] Product Insight - Competitor names: ...
```

**What does the "API returned competitors" number say?** 
- If it says `1`, the backend API is only returning 1 competitor
- If it says more than `1`, the issue is in the frontend

## Step 2: Run This in Console

Copy and paste this into your browser console to check the cache:

```javascript
// Check unified cache
const cache = localStorage.getItem('kabini_unified_analysis_cache');
if (cache) {
  const parsed = JSON.parse(cache);
  console.log('=== CACHE ANALYSIS ===');
  Object.entries(parsed.analyses).forEach(([key, val]) => {
    console.log(`\nTarget: ${key}`);
    console.log(`  Original: ${val.targetOriginal}`);
    console.log(`  Dashboard competitors: ${val.dashboard?.competitors?.length || 0}`);
    console.log(`  CompetitorInsight competitors: ${val.competitorInsight?.competitors?.length || 0}`);
    console.log(`  ProductInsight competitors: ${val.productInsight?.competitors?.length || 0}`);
    
    if (val.productInsight?.competitors) {
      console.log(`  ProductInsight names:`, val.productInsight.competitors.map(c => c.name || c).join(', '));
    }
    if (val.competitorInsight?.competitors) {
      console.log(`  CompetitorInsight names:`, val.competitorInsight.competitors.map(c => c.name || c).join(', '));
    }
  });
} else {
  console.log('No cache found');
}
```

## Step 3: Check Network Request

1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Clear the network log
4. Click the **Refresh** button on Product Insights
5. Look for a request to `/api/ai-visibility/...`
6. Click on that request
7. Go to the **Response** tab
8. Look for `data.competitors` array

**How many items are in the competitors array?**

## Step 4: Compare Inputs

Check what URL/company name you're using:
- **Competitor Insight page**: What URL did you enter?
- **Product Insights page**: What URL did you enter?

Are they exactly the same? (case, spelling, format)

## Step 5: Check Backend Logs

If you have access to the backend console/logs, look for:

```
🚀 Starting Optimized AI Visibility Analysis for: ...
🎯 Detected competitors: [array of names]
📊 Final count: X high-quality competitors
```

This will tell us if the backend is detecting multiple competitors but only sending one.


