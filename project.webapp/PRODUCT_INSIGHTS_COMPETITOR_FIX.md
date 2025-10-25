# Product Insights - Competitor Display Fix

## Issue
Product Insights page was showing only one competitor (Zara) instead of all competitors like other pages do.

## Root Cause
The Product Insights page was using cached data from the unified cache. The cached data only contained one competitor, possibly from a previous incomplete analysis or API response.

## Solution Implemented

### 1. **Enhanced Cache Clearing**
- Modified `clearAnalysisData()` to clear the unified cache when starting a new analysis
- This ensures fresh data is fetched when clicking "New Analysis"

### 2. **Added Refresh Button**
- Added a new **"Refresh"** button (green) next to the "New Analysis" button
- This button forces a fresh fetch of all data, bypassing the cache
- Shows "Refreshing..." text and spinning icon while fetching

### 3. **Enhanced Debug Logging**
Added comprehensive console logging to track competitor data:
- Logs how many competitors are in cached data
- Logs competitor names when using cache
- Logs how many competitors are returned from fresh API calls
- Logs competitor names when fetching fresh data
- Added logging to both Product Insight and Competitor Insight analysis flows

### 4. **Force Refresh Parameter**
- Modified `startAnalysis()` to accept a `forceRefresh` parameter
- When `forceRefresh=true`, it clears the cache before running analysis
- This ensures the Refresh button always gets fresh data

## How to Test

### Step 1: Check Console Logs
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Navigate to Product Insights page
4. Look for these log messages:
   ```
   [ProductInsights] Using cached product insight data
   [ProductInsights] Cached competitors count: X
   [ProductInsights] Cached competitors: Name1, Name2, Name3...
   ```

### Step 2: Use the Refresh Button
1. If you see only one competitor displayed
2. Click the **green "Refresh" button** (top right)
3. Watch the console logs:
   ```
   [ProductInsights] Force refresh - clearing cache for: [URL]
   [ProductInsights] Running fresh product insight analysis
   [BackgroundOrchestrator] Product Insight - API returned competitors: X
   [BackgroundOrchestrator] Product Insight - Competitor names: Name1, Name2, Name3...
   ```
4. The page should now display all competitors

### Step 3: Compare with Competitor Insight
1. Go to Competitor Insight page
2. Check how many competitors are shown
3. Note the competitor names in console:
   ```
   [BackgroundOrchestrator] Competitor Insight - API returned competitors: X
   [BackgroundOrchestrator] Competitor Insight - Competitor names: ...
   ```
4. Compare with Product Insights - they should have the same number

## Files Modified

1. **`src/components/ProductInsights.tsx`**
   - Added `RefreshCw` icon import
   - Added `forceRefresh` parameter to `startAnalysis()`
   - Enhanced cache clearing in `clearAnalysisData()`
   - Added comprehensive debug logging
   - Added Refresh button to UI
   - Fixed TypeScript type issues

2. **`src/services/backgroundAnalysisOrchestrator.ts`**
   - Added debug logging for competitor counts
   - Added competitor name logging
   - Applied to both Product Insight and Competitor Insight analysis

## Expected Behavior

### Before Fix
- Product Insights showed only 1 competitor (Zara)
- Cache was not being cleared properly
- No way to force fresh data fetch
- Difficult to debug what data was being used

### After Fix
- Product Insights shows ALL competitors (same as Competitor Insight)
- "New Analysis" button clears cache
- "Refresh" button forces fresh fetch with cache clear
- Console logs show exactly what data is being used
- Easy to debug and verify competitor data

## Troubleshooting

### If Refresh button doesn't fix it:

1. **Check API Response**
   - Look for `[BackgroundOrchestrator] Product Insight - API returned competitors:` in console
   - If this shows 1, the issue is in the backend API
   - If this shows multiple but UI shows 1, the issue is in data mapping

2. **Clear All Cache**
   - Open Console
   - Run: `localStorage.removeItem('kabini_unified_analysis_cache')`
   - Refresh page
   - Try analysis again

3. **Check Network Tab**
   - Open Developer Tools → Network tab
   - Look for `/api/ai-visibility/` calls
   - Check the response JSON
   - Verify `data.competitors` array has multiple entries

4. **Backend Logs**
   - Check backend server console
   - Look for competitor detection logs
   - Verify backend is returning multiple competitors

## Next Steps

1. Test the Refresh button functionality
2. Verify console logs show correct competitor counts
3. Compare Product Insights and Competitor Insight data
4. If issue persists, check backend API response
5. Consider adding a visible indicator of cache vs fresh data in the UI

## Additional Notes

- The unified cache has a 1-hour TTL
- Cache is shared across all analysis pages (Dashboard, Competitor Insight, Product Insight)
- Clearing cache for one target affects all pages for that target
- The Refresh button is the quickest way to get fresh data without starting over


