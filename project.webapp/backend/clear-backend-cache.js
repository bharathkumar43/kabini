// Clear Backend Cache
// This clears the in-memory competitor cache on the backend

// You can run this as an endpoint or add it to your server startup

// Option 1: Add this endpoint to server.js
/*
app.post('/api/admin/clear-cache', (req, res) => {
  if (global.competitorCache) {
    const size = global.competitorCache.size;
    global.competitorCache.clear();
    console.log(`🗑️ Cleared backend competitor cache: ${size} entries removed`);
    res.json({ success: true, message: `Cleared ${size} cache entries` });
  } else {
    res.json({ success: true, message: 'No cache to clear' });
  }
});
*/

// Option 2: Clear on server restart (automatic)
// The cache is in-memory, so restarting the server clears it automatically

console.log('Backend cache clearing options:');
console.log('1. Restart the backend server (clears all in-memory cache)');
console.log('2. Add the endpoint above to server.js for manual clearing');


