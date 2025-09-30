const axios = require('axios');

async function testAccuracy() {
  console.log('🧪 Testing competitor detection accuracy improvements...\n');
  
  const testCompanies = [
    { name: 'nike', industry: 'ecommerce' },
    { name: 'amazon', industry: 'ecommerce' },
    { name: 'tesla', industry: 'automotive' },
    { name: 'netflix', industry: 'streaming' }
  ];
  
  for (const test of testCompanies) {
    try {
      console.log(`\n🔍 Testing: ${test.name.toUpperCase()} (${test.industry})`);
      console.log('=' .repeat(50));
      
      const response = await axios.get(`http://localhost:5000/api/ai-visibility/${test.name}?industry=${test.industry}`);
      
      if (response.data.success) {
        const competitors = response.data.data.competitors || [];
        console.log(`✅ Status: ${response.status}`);
        console.log(`📊 Competitors found: ${competitors.length}`);
        console.log(`🎯 Competitor names:`, competitors.map(c => c.name).slice(0, 10));
        
        // Check for accuracy indicators
        const hasRelevantCompetitors = competitors.some(c => 
          c.name.toLowerCase().includes('adidas') || 
          c.name.toLowerCase().includes('puma') || 
          c.name.toLowerCase().includes('reebok')
        );
        
        if (test.name === 'nike' && hasRelevantCompetitors) {
          console.log('✅ ACCURACY: Found relevant sportswear competitors');
        } else if (test.name === 'nike') {
          console.log('⚠️  ACCURACY: May need better sportswear competitor detection');
        }
        
      } else {
        console.log(`❌ Failed: ${response.data.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.log(`❌ Error testing ${test.name}:`, error.message);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🏁 Accuracy testing completed!');
}

testAccuracy();
