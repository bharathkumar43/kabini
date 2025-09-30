const axios = require('axios');

async function testCompetitorAccuracy() {
  try {
    console.log('🧪 Testing improved competitor detection accuracy...\n');
    
    // Test with a well-known company
    const company = 'nike';
    const industry = 'ecommerce';
    
    console.log(`🔍 Testing: ${company.toUpperCase()} (${industry})`);
    console.log('⏳ This may take 2-3 minutes for full analysis...\n');
    
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
      
      competitors.forEach((comp, index) => {
        console.log(`${index + 1}. ${comp.name} (Score: ${comp.totalScore || 'N/A'})`);
      });
      
      // Check for accuracy indicators
      console.log('\n🎯 ACCURACY ANALYSIS:');
      console.log('=' .repeat(60));
      
      const sportswearBrands = ['adidas', 'puma', 'reebok', 'under armour', 'new balance'];
      const foundSportswear = competitors.filter(comp => 
        sportswearBrands.some(brand => 
          comp.name.toLowerCase().includes(brand)
        )
      );
      
      if (foundSportswear.length > 0) {
        console.log(`✅ Found ${foundSportswear.length} relevant sportswear competitors:`);
        foundSportswear.forEach(comp => console.log(`   - ${comp.name}`));
      } else {
        console.log('⚠️  No obvious sportswear competitors found');
      }
      
      // Check for non-relevant results
      const nonRelevant = competitors.filter(comp => 
        comp.name.toLowerCase().includes('forbes') ||
        comp.name.toLowerCase().includes('wikipedia') ||
        comp.name.toLowerCase().includes('linkedin')
      );
      
      if (nonRelevant.length > 0) {
        console.log(`⚠️  Found ${nonRelevant.length} potentially non-relevant results:`);
        nonRelevant.forEach(comp => console.log(`   - ${comp.name}`));
      } else {
        console.log('✅ No obvious non-relevant results found');
      }
      
      console.log('\n📈 SUMMARY:');
      console.log(`   Total competitors: ${competitors.length}`);
      console.log(`   Relevant sportswear: ${foundSportswear.length}`);
      console.log(`   Non-relevant: ${nonRelevant.length}`);
      console.log(`   Analysis time: ${Math.round((endTime - startTime) / 1000)}s`);
      
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
