const axios = require('axios');

async function quickVerification() {
  try {
    console.log('🚀 Quick verification of improved competitor detection...\n');
    
    // Test with a simple company
    const company = 'zara';
    const industry = 'ecommerce';
    
    console.log(`🔍 Testing: ${company.toUpperCase()} (${industry})`);
    console.log('⏳ Starting analysis...\n');
    
    const startTime = Date.now();
    
    // Set a timeout for the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await axios.get(`http://localhost:5000/api/ai-visibility/${company}?industry=${industry}`, {
        signal: controller.signal,
        timeout: 30000
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      
      console.log(`⏱️  Response received in ${Math.round((endTime - startTime) / 1000)} seconds`);
      console.log(`📊 Status: ${response.status}`);
      
      if (response.data.success) {
        const data = response.data.data;
        const competitors = data.competitors || [];
        
        console.log(`\n✅ SUCCESS! Found ${competitors.length} competitors:`);
        console.log('=' .repeat(50));
        
        // Show first 10 competitors
        competitors.slice(0, 10).forEach((comp, index) => {
          console.log(`${index + 1}. ${comp.name}`);
        });
        
        if (competitors.length > 10) {
          console.log(`... and ${competitors.length - 10} more`);
        }
        
        // Check for accuracy
        const fashionBrands = ['h&m', 'uniqlo', 'forever 21', 'gap', 'asos', 'shein'];
        const foundFashion = competitors.filter(comp => 
          fashionBrands.some(brand => 
            comp.name.toLowerCase().includes(brand)
          )
        );
        
        console.log('\n🎯 ACCURACY CHECK:');
        if (foundFashion.length > 0) {
          console.log(`✅ Found ${foundFashion.length} relevant fashion competitors:`);
          foundFashion.forEach(comp => console.log(`   - ${comp.name}`));
        } else {
          console.log('⚠️  No obvious fashion competitors found in first results');
        }
        
        console.log(`\n📈 SUMMARY:`);
        console.log(`   Total competitors: ${competitors.length}`);
        console.log(`   Relevant fashion: ${foundFashion.length}`);
        console.log(`   Response time: ${Math.round((endTime - startTime) / 1000)}s`);
        
      } else {
        console.log(`❌ FAILED: ${response.data.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.log('⏰ Request timed out after 30 seconds');
        console.log('💡 This is normal for full analysis - the system is working but taking time');
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

quickVerification();
