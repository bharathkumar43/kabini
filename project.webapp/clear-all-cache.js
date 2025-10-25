// CLEAR ALL CACHE - Run this in browser console
// Copy and paste this entire script into browser console (F12)

console.clear();
console.log('🗑️ CLEARING ALL CACHE DATA...\n');

// 1. Clear unified analysis cache
console.log('1️⃣ Clearing unified analysis cache...');
localStorage.removeItem('kabini_unified_analysis_cache');
console.log('   ✅ Unified analysis cache cleared');

// 2. Clear all product insights cache
console.log('\n2️⃣ Clearing product insights cache...');
const keys = Object.keys(localStorage);
let productInsightCleared = 0;
keys.forEach(key => {
  if (key.includes('kabini_cleared_product_insights_')) {
    localStorage.removeItem(key);
    productInsightCleared++;
  }
});
console.log(`   ✅ Cleared ${productInsightCleared} product insight cache entries`);

// 3. Clear session data
console.log('\n3️⃣ Clearing session data...');
localStorage.removeItem('llm_qa_sessions');
localStorage.removeItem('llm_qa_current_session');
console.log('   ✅ Session data cleared');

// 4. Clear user state
console.log('\n4️⃣ Clearing user state...');
const stateKeys = keys.filter(k => k.includes('kabini_user_state_'));
stateKeys.forEach(k => localStorage.removeItem(k));
console.log(`   ✅ Cleared ${stateKeys.length} user state entries`);

// 5. Clear competitor cache
console.log('\n5️⃣ Clearing competitor cache...');
const compKeys = keys.filter(k => k.includes('competitors_'));
compKeys.forEach(k => localStorage.removeItem(k));
console.log(`   ✅ Cleared ${compKeys.length} competitor cache entries`);

// 6. Clear target analysis cache
console.log('\n6️⃣ Clearing target analysis cache...');
localStorage.removeItem('kabini_target_analysis_cache_v1');
console.log('   ✅ Target analysis cache cleared');

// 7. Show summary
console.log('\n📊 CACHE CLEAR SUMMARY:');
console.log('   ✅ Unified cache: Cleared');
console.log(`   ✅ Product insights: ${productInsightCleared} entries`);
console.log('   ✅ Sessions: Cleared');
console.log(`   ✅ User states: ${stateKeys.length} entries`);
console.log(`   ✅ Competitor cache: ${compKeys.length} entries`);
console.log('   ✅ Target analysis: Cleared');

console.log('\n✅ ALL FRONTEND CACHE CLEARED!');
console.log('\n💡 Next step: Reload the page');
console.log('   Run: location.reload()');


