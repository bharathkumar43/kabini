const axios = require('axios');

async function testCompetitorAccuracy() {
  try {
    console.log('🧪 Testing improved competitor detection accuracy...\n');
    
    const company = 'zara';
    const industry = 'ecommerce';
    
    console.log(`🔍 Testing: ${company.toUpperCase()} (${industry})`);
    console.log('⏳ Starting analysis...\n');
    
    const startTime = Date.now();
    const response = await axios.get(`http://localhost:5000/api/ai-visibility/${company}?industry=${industry}`);
    const endTime = Date.now();
    
    console.log(`⏱️  Analysis completed in ${Math.round((endTime - startTime) / 1000)} seconds`);
    console.log(`📊 Status: ${response.status}`);
    
    if (response.data.success) {
      const data = response.data.data;
      const competitors = data.competitors || [];
      
      console.log(`\n✅ SUCCESS! Found ${competitors.length} competitors:`);
      console.log('=' .repeat(60));
      
      // Categorize competitors
      const fashionBrands = ['h&m', 'uniqlo', 'gap', 'forever 21', 'asos', 'shein', 'mango', 'cos', 'massimo dutti', 'bershka', 'pull&bear', 'stradivarius'];
      const nonRelevant = ['forbes', 'reuters', 'mailchimp', 'linkedin', 'reddit', 'quora', 'wikipedia', 'shopify', 'wordpress', 'apple', 'google', 'microsoft'];
      
      let relevantCount = 0;
      let nonRelevantCount = 0;
      
      competitors.forEach((comp, index) => {
        const compLower = comp.name.toLowerCase();
        const isFashion = fashionBrands.some(brand => compLower.includes(brand));
        const isNonRelevant = nonRelevant.some(brand => compLower.includes(brand));
        
        let status = '';
        if (isFashion) {
          status = '✅ FASHION';
          relevantCount++;
        } else if (isNonRelevant) {
          status = '❌ NON-RELEVANT';
          nonRelevantCount++;
        } else {
          status = '⚠️  UNKNOWN';
        }
        
        console.log(`${index + 1}. ${comp.name} ${status}`);
      });
      
      console.log('\n🎯 ACCURACY ANALYSIS:');
      console.log('=' .repeat(60));
      console.log(`✅ Relevant fashion competitors: ${relevantCount}`);
      console.log(`❌ Non-relevant results: ${nonRelevantCount}`);
      console.log(`⚠️  Unknown/Other: ${competitors.length - relevantCount - nonRelevantCount}`);
      
      const accuracy = relevantCount / competitors.length * 100;
      console.log(`📊 Accuracy: ${accuracy.toFixed(1)}%`);
      
      if (accuracy < 50) {
        console.log('⚠️  LOW ACCURACY: Many non-relevant competitors found');
      } else if (accuracy < 70) {
        console.log('⚠️  MODERATE ACCURACY: Some non-relevant competitors found');
      } else {
        console.log('✅ GOOD ACCURACY: Mostly relevant competitors found');
      }
      
    } else {
      console.log(`❌ FAILED: ${response.data.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

testCompetitorAccuracy();
