# Unified Cache Implementation - Complete Guide

## Overview
This implementation provides **instant cross-page navigation** by running full analysis for all 3 pages in parallel and caching results. **No phases, no waiting** - everything happens simultaneously.

## Key Features

### 1. **Parallel Analysis (NO Phases)**
When user analyzes "Zara" from ANY page:
- ✅ Current page analysis runs in foreground (user sees results)
- ✅ Other 2 pages run in background (fire-and-forget, silent)
- ✅ All results cached for 1 hour
- ✅ Navigate to any other page = instant load from cache

### 2. **Dual Storage**
- **Frontend**: localStorage (50MB limit, size-based cleanup)
- **Backend**: In-memory Map (1000 entries, auto-cleanup every 10min)

### 3. **Smart Cache Management**
- **TTL**: 1 hour per session
- **Size Limits**: 
  - Frontend: 50MB, removes oldest when exceeded
  - Backend: 1000 entries, removes oldest 10% when exceeded
- **Auto-Cleanup**: Expired entries removed every 5min (frontend) / 10min (backend)

---

## Usage Scenarios

### Scenario 1: Start from Dashboard
```
User: Click "Analyze Zara" on Dashboard
System:
  1. Check cache → Miss
  2. Run dashboard analysis (foreground) → Show in UI
  3. Fire background jobs:
     - Competitor Insight analysis
     - Product Insight analysis
  4. Store all results in cache

User: Navigate to Competitor Insight
System:
  1. Check cache → HIT
  2. Load instantly from cache
  3. Display immediately
```

### Scenario 2: Start from Competitor Insight
```
User: Click "Analyze Zara" on Competitor Insight
System:
  1. Check cache → Miss
  2. Run competitor insight analysis (foreground) → Show in UI
  3. Fire background jobs:
     - Dashboard analysis
     - Product Insight analysis
  4. Store all results in cache

User: Navigate to Dashboard
System:
  1. Check cache → HIT
  2. Load instantly from cache
  3. Display immediately
```

### Scenario 3: Start from Product Insight
```
User: Click "Analyze Zara" on Product Insight
System:
  1. Check cache → Miss
  2. Run product insight analysis (foreground) → Show in UI
  3. Fire background jobs:
     - Dashboard analysis
     - Competitor Insight analysis
  4. Store all results in cache

User: Navigate to Competitor Insight
System:
  1. Check cache → HIT
  2. Load instantly from cache
  3. Display immediately
```

---

## File Structure

### New Files Created

#### 1. `src/services/unifiedCache.ts`
- Unified cache service with size-based cleanup
- 1-hour TTL per session
- localStorage persistence
- Auto-cleanup every 5 minutes
- Size monitoring and emergency cleanup

**Key Methods**:
- `get(target)`: Get cached analysis
- `getPage(target, page)`: Get specific page data
- `set(target, originalInput, data)`: Store analysis
- `setPage(target, originalInput, page, data)`: Store page-specific data
- `delete(target)`: Remove cached analysis
- `clearAll()`: Clear entire cache
- `getStats()`: Get cache statistics

#### 2. `src/services/backgroundAnalysisOrchestrator.ts`
- Background analysis orchestrator
- Runs all 3 pages in parallel (fire-and-forget)
- Stores results in unified cache
- Silent operation (no UI feedback)

**Key Methods**:
- `runFullAnalysis(options)`: Run all page analyses in background
- `getCurrentPageAnalysis(page, target, originalInput, industry)`: Get current page with cache fallback
- `clearAll()`: Clear all running analyses

### Modified Files

#### 1. `src/components/Overview.tsx`
**Changes**:
- Import `backgroundOrchestrator` and `unifiedCache`
- Replace phased analysis with unified approach
- Check cache first → instant load if available
- Run fresh analysis if cache miss
- Trigger background analysis for other pages

**Code Pattern**:
```typescript
// Check cache
const cachedDashboard = unifiedCache.getPage(target, 'dashboard');
if (cachedDashboard) {
  setAnalysisResult(cachedDashboard);
  // Still trigger background refresh for other pages
  backgroundOrchestrator.runFullAnalysis({...});
  return;
}

// Run fresh analysis
const result = await backgroundOrchestrator.getCurrentPageAnalysis('dashboard', ...);
setAnalysisResult(result);

// Fire background for other pages
backgroundOrchestrator.runFullAnalysis({...});
```

#### 2. `src/components/AIVisibilityAnalysis.tsx` (Competitor Insight)
**Changes**: Same pattern as Overview

#### 3. `src/components/ProductInsights.tsx`
**Changes**: Same pattern as Overview

#### 4. `backend/server.js`
**New Endpoints**:

- `GET /api/unified-cache/:target` - Get cached analysis
- `POST /api/unified-cache` - Store/update cached analysis
- `DELETE /api/unified-cache/:target` - Delete cached analysis
- `GET /api/unified-cache-stats` - Get cache statistics

**Backend Storage**:
- In-memory Map with 1-hour TTL
- Max 1000 entries
- Auto-cleanup every 10 minutes
- Size-based cleanup when limit reached

---

## Testing Guide

### Test 1: Dashboard → Competitor Insight

1. **Login**:
   ```
   Email: admin@example.com
   Password: admin123
   ```

2. **Dashboard Analysis**:
   - Go to Dashboard (Overview)
   - Enter: `zara` or `zara.com`
   - Click "Analyse"
   - Wait for results to appear
   - Check console: Should see background analysis starting

3. **Navigate to Competitor Insight**:
   - Click "Competitor Insight" in sidebar
   - Check console: Should see "Using cached competitor insight data"
   - Results should load **instantly** (no spinner)

4. **Verify Cache**:
   ```javascript
   // Open browser console
   unifiedCache.getStats()
   // Should show 1 entry with all 3 pages
   ```

### Test 2: Competitor Insight → Product Insight

1. **Clear Cache First**:
   ```javascript
   unifiedCache.clearAll()
   localStorage.clear()
   ```

2. **Competitor Insight Analysis**:
   - Go to Competitor Insight
   - Enter: `amazon.com`
   - Click "Analyse"
   - Wait for results

3. **Navigate to Product Insight**:
   - Click "Product Insights" in sidebar
   - Results should load **instantly**

### Test 3: Product Insight → Dashboard

1. **Clear Cache**:
   ```javascript
   unifiedCache.clearAll()
   ```

2. **Product Insight Analysis**:
   - Go to Product Insights
   - Enter: `nike.com`
   - Click "Analyse"
   - Wait for results

3. **Navigate to Dashboard**:
   - Click "Dashboard" in sidebar
   - Results should load **instantly**

### Test 4: Cache Expiration

1. **Run Analysis**:
   - Analyze any company on any page

2. **Check Expiration**:
   ```javascript
   const cache = unifiedCache.get('nike.com')
   console.log('Expires at:', new Date(cache.expiresAt))
   // Should be ~1 hour from now
   ```

3. **Wait 1 Hour** (or manually expire):
   ```javascript
   // Force expiration for testing
   const store = JSON.parse(localStorage.getItem('kabini_unified_analysis_cache'))
   Object.keys(store.analyses).forEach(key => {
     store.analyses[key].expiresAt = Date.now() - 1000
   })
   localStorage.setItem('kabini_unified_analysis_cache', JSON.stringify(store))
   ```

4. **Try to Load**:
   - Navigate to cached page
   - Should run fresh analysis (cache expired)

### Test 5: Size-Based Cleanup

1. **Fill Cache**:
   ```javascript
   // Analyze 10-15 different companies
   // Each analysis ~5MB
   ```

2. **Check Size**:
   ```javascript
   unifiedCache.getStats()
   // Should show size approaching 50MB
   ```

3. **Exceed Limit**:
   - Keep analyzing more companies
   - Console should show: "Size limit exceeded. Running cleanup..."
   - Oldest entries automatically removed

---

## Console Logs to Monitor

### Success Patterns

```
[UnifiedCache] Cache HIT for: zara
[BackgroundOrchestrator] Background pages to analyze: ['competitorInsight', 'productInsight']
[BackgroundOrchestrator] ✅ Background analysis complete for: competitorInsight zara
[UnifiedCache] Set cache for: zara
[UnifiedCache] Total size: 8.45 MB
```

### Cache Miss Pattern

```
[UnifiedCache] Cache MISS for: nike.com
[BackgroundOrchestrator] Running fresh dashboard analysis
[BackgroundOrchestrator] ✅ Background analysis complete for: dashboard nike.com
```

### Cleanup Pattern

```
[UnifiedCache] Size limit exceeded. Running cleanup...
[UnifiedCache] Current size: 52.34 MB
[UnifiedCache] Cleanup complete. Removed 5 entries
[UnifiedCache] New size: 42.11 MB
```

---

## Performance Metrics

### Before (Phased Approach)
- Dashboard analysis: ~30-45 seconds
- Navigate to Competitor Insight: ~30-45 seconds again
- Total time for 2 pages: **60-90 seconds**

### After (Unified Cache)
- Dashboard analysis: ~30-45 seconds (same)
- Navigate to Competitor Insight: **< 1 second** (instant)
- Navigate to Product Insight: **< 1 second** (instant)
- Total time for 3 pages: **~30-45 seconds** (only initial wait)

**Time Saved**: **2-3x faster** for subsequent pages

---

## Cache Statistics API

### Get Stats
```javascript
// Frontend
const stats = unifiedCache.getStats()
console.log(stats)
// Output:
{
  totalEntries: 3,
  validEntries: 3,
  expiredEntries: 0,
  totalSize: "15.42 MB",
  totalSizeBytes: 16171008,
  maxSize: "50.00 MB",
  usagePercent: "30.84%",
  lastCleanup: "2025-10-20T10:30:00.000Z"
}
```

```javascript
// Backend API
fetch('/api/unified-cache-stats', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(stats => console.log(stats))
// Output:
{
  success: true,
  stats: {
    totalEntries: 15,
    userEntries: 3,
    validUserEntries: 3,
    maxSize: 1000,
    ttlMinutes: 60
  }
}
```

---

## Troubleshooting

### Issue: Cache not persisting
**Solution**:
- Check localStorage quota: `navigator.storage.estimate()`
- Clear old data: `localStorage.clear()`
- Check browser privacy settings (incognito blocks localStorage)

### Issue: Background analysis not running
**Solution**:
- Check console for errors
- Verify API endpoints are accessible
- Check network tab for failed requests

### Issue: Cache too large
**Solution**:
- Auto-cleanup will handle it
- Or manually clear: `unifiedCache.clearAll()`

### Issue: Stale data showing
**Solution**:
- Cache has 1-hour TTL
- Force refresh by clearing cache
- Or wait for auto-expiration

---

## Configuration

### Adjust TTL
```typescript
// src/services/unifiedCache.ts
const TTL_MS = 60 * 60 * 1000; // Change to desired time
```

### Adjust Size Limit
```typescript
// src/services/unifiedCache.ts
const MAX_CACHE_SIZE_MB = 50; // Change to desired size
```

### Adjust Backend Limits
```javascript
// backend/server.js
const CACHE_MAX_SIZE = 1000; // Max entries
const CACHE_TTL_MS = 60 * 60 * 1000; // TTL
```

---

## Summary

✅ **NO PHASES** - Everything runs in parallel
✅ **Instant Navigation** - Cache enables < 1 second page loads
✅ **Auto-Cleanup** - Size-based and time-based cleanup
✅ **Dual Storage** - Frontend + Backend persistence
✅ **Silent Background** - User never sees background jobs
✅ **Smart Caching** - Per-user, per-target, 1-hour TTL

**Result**: **2-3x faster** user experience with seamless cross-page navigation.


