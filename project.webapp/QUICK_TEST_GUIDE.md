# Quick Test Guide - Unified Cache

## ✅ FASTEST WAY TO TEST

### 1. Start the Application
```bash
# Terminal 1 - Backend
cd kabini/project.webapp/backend
npm start

# Terminal 2 - Frontend
cd kabini/project.webapp
npm run dev
```

### 2. Login
- Open: http://localhost:5173/login
- Email: `admin@example.com`
- Password: `admin123`

### 3. Test Instant Navigation (3 Steps)

#### Step 1: Dashboard Analysis
1. Click **"Dashboard"** in sidebar
2. Enter: `zara` or `zara.com`
3. Click **"Analyse"**
4. ⏱️ Wait ~30-45 seconds for results
5. ✅ You'll see competitors and scores

#### Step 2: Instant Load - Competitor Insight
1. Click **"Competitor Insight"** in sidebar
2. ⚡ **Results load INSTANTLY** (<1 second)
3. No spinner, no waiting!
4. Same zara data displays immediately

#### Step 3: Instant Load - Product Insight
1. Click **"Product Insights"** in sidebar
2. ⚡ **Results load INSTANTLY again**
3. Product scores display immediately

---

## 🔍 Verify It's Working

### Open Browser Console (F12)
You should see:
```
✅ [UnifiedCache] Cache HIT for: zara
✅ [Overview] Using cached dashboard data
✅ [AIVisibilityAnalysis] Using cached competitor insight data
✅ [ProductInsights] Using cached product insight data
```

### Check Cache Stats
In console:
```javascript
unifiedCache.getStats()
```

Should show:
```javascript
{
  totalEntries: 1,
  validEntries: 1,
  totalSize: "~8-12 MB",
  usagePercent: "~16-24%",
  // ...
}
```

---

## 🎯 Expected Behavior

### First Analysis (Any Page)
- ⏱️ Takes ~30-45 seconds (normal)
- Shows spinner and "Analyzing..."
- Background jobs run silently

### Subsequent Page Navigation
- ⚡ Loads in <1 second
- No spinner
- No "Analyzing..." message
- Data appears instantly

---

## 🐛 Troubleshooting

### "Still seeing spinners on other pages"
**Check:**
```javascript
// In console:
unifiedCache.listTargets()
// Should show: ['zara'] or similar

// If empty, cache didn't work
// Check console for errors
```

### "Cache not persisting"
**Solution:**
```javascript
// Clear everything and retry:
localStorage.clear()
location.reload()
```

### "Background analysis not running"
**Check backend logs:**
```
[BackgroundOrchestrator] Background pages to analyze: [...]
[BackgroundOrchestrator] ✅ Background analysis complete for: ...
```

If missing, check:
- Backend is running
- No network errors (F12 → Network tab)
- User is authenticated

---

## 📊 Performance Comparison

### Test Same Company on All 3 Pages

#### OLD WAY (Without Cache):
```
Dashboard:          30-45s  ⏱️
Competitor Insight: 30-45s  ⏱️
Product Insight:    30-45s  ⏱️
────────────────────────────
TOTAL:             90-135s  🐌
```

#### NEW WAY (With Cache):
```
Dashboard:          30-45s  ⏱️
Competitor Insight:   <1s   ⚡
Product Insight:      <1s   ⚡
────────────────────────────
TOTAL:             ~30-45s  🚀
```

**Result: 2-3x FASTER!**

---

## ✅ Success Checklist

- [ ] Backend running (port 5000)
- [ ] Frontend running (port 5173)
- [ ] Logged in as admin
- [ ] Dashboard analysis completed (~30-45s)
- [ ] Competitor Insight loads instantly (<1s)
- [ ] Product Insight loads instantly (<1s)
- [ ] Console shows "Cache HIT" messages
- [ ] `unifiedCache.getStats()` shows 1 entry

If all checked → **Implementation working perfectly!** 🎉

---

## 🔄 Test Multiple Companies

Try these companies to fill cache:
1. `zara` or `zara.com`
2. `nike` or `nike.com`
3. `amazon` or `amazon.com`
4. `walmart` or `walmart.com`
5. `adidas` or `adidas.com`

Each should:
- Take ~30-45s first time
- Load instantly on other pages
- Store in cache (check `unifiedCache.listTargets()`)

---

## 📝 Quick Commands

```javascript
// Console commands for testing:

// Check cache stats
unifiedCache.getStats()

// List all cached companies
unifiedCache.listTargets()

// Get specific cache
unifiedCache.get('zara')

// Clear all cache (force fresh analysis)
unifiedCache.clearAll()

// Force expiration (for testing)
const store = JSON.parse(localStorage.getItem('kabini_unified_analysis_cache'))
store.analyses['zara'].expiresAt = Date.now() - 1000
localStorage.setItem('kabini_unified_analysis_cache', JSON.stringify(store))
```

---

## 🎯 That's It!

**3 Simple Steps:**
1. Analyze on one page (~30-45s)
2. Navigate to another page (<1s)
3. Navigate to third page (<1s)

**Total time: ~30-45 seconds instead of 90-135 seconds!**

Enjoy your **2-3x faster** analysis experience! 🚀


