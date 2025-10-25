// Run this in browser console to check cache differences
// Copy and paste this entire code block into the browser console

console.clear();
console.log('=== CACHE ANALYSIS FOR ALL PAGES ===\n');

const cache = localStorage.getItem('kabini_unified_analysis_cache');
if (!cache) {
  console.log('❌ No cache found');
} else {
  const parsed = JSON.parse(cache);
  
  Object.entries(parsed.analyses).forEach(([key, val]) => {
    console.log(`\n🎯 Target: ${key}`);
    console.log(`   Original Input: ${val.targetOriginal}`);
    console.log(`   Timestamp: ${new Date(val.timestamp).toLocaleString()}`);
    console.log(`   Expires: ${new Date(val.expiresAt).toLocaleString()}`);
    
    // Dashboard
    if (val.dashboard) {
      console.log(`\n   📊 DASHBOARD:`);
      console.log(`      Competitors: ${val.dashboard.competitors?.length || 0}`);
      if (val.dashboard.competitors) {
        console.log(`      Names:`, val.dashboard.competitors.map(c => c.name || c).join(', '));
      }
    }
    
    // Competitor Insight
    if (val.competitorInsight) {
      console.log(`\n   🔍 COMPETITOR INSIGHT:`);
      console.log(`      Competitors: ${val.competitorInsight.competitors?.length || 0}`);
      if (val.competitorInsight.competitors) {
        console.log(`      Names:`, val.competitorInsight.competitors.map(c => c.name || c).join(', '));
      }
    }
    
    // Product Insight
    if (val.productInsight) {
      console.log(`\n   📦 PRODUCT INSIGHT:`);
      console.log(`      Competitors: ${val.productInsight.competitors?.length || 0}`);
      if (val.productInsight.competitors) {
        console.log(`      Names:`, val.productInsight.competitors.map(c => c.name || c).join(', '));
      }
    }
    
    console.log('\n' + '='.repeat(60));
  });
  
  // Summary
  console.log('\n📊 SUMMARY:\n');
  Object.entries(parsed.analyses).forEach(([key, val]) => {
    const dashCount = val.dashboard?.competitors?.length || 0;
    const compCount = val.competitorInsight?.competitors?.length || 0;
    const prodCount = val.productInsight?.competitors?.length || 0;
    
    console.log(`${key}:`);
    console.log(`  Dashboard: ${dashCount} | Competitor Insight: ${compCount} | Product Insight: ${prodCount}`);
    
    if (dashCount !== compCount || compCount !== prodCount || dashCount !== prodCount) {
      console.log(`  ⚠️ MISMATCH DETECTED!`);
    } else {
      console.log(`  ✅ All pages have same count`);
    }
  });
}

console.log('\n\n💡 WHAT TO DO:\n');
console.log('1. If Product Insight has fewer competitors than the others:');
console.log('   → The cache was saved at different times');
console.log('   → Solution: Clear cache and run fresh analysis');
console.log('');
console.log('2. If all pages show 1 competitor:');
console.log('   → Backend is not detecting competitors');
console.log('   → Check backend console logs');
console.log('');
console.log('3. To clear cache and try fresh:');
console.log('   → Run: localStorage.removeItem("kabini_unified_analysis_cache")');
console.log('   → Refresh page and analyze again');


