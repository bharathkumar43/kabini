const axios = require('axios');

async function testPlatformCompany() {
  try {
    console.log('🧪 Testing platform company analysis (should not be filtered)...\n');
    
    const testCompanies = [
      { name: 'forbes', industry: 'media' },
      { name: 'reddit', industry: 'social' },
      { name: 'linkedin', industry: 'professional' }
    ];
    
    for (const test of testCompanies) {
      console.log(`🔍 Testing: ${test.name.toUpperCase()} (${test.industry})`);
      
      try {
        const response = await axios.get(`http://localhost:5000/api/ai-visibility/${test.name}?industry=${test.industry}`);
        
        if (response.data.success) {
          const competitors = response.data.data.competitors || [];
          console.log(`✅ Found ${competitors.length} competitors:`);
          
          // Check if the main company is included
          const mainCompanyIncluded = competitors.some(comp => 
            comp.name.toLowerCase().includes(test.name.toLowerCase())
          );
          
          if (mainCompanyIncluded) {
            console.log(`✅ Main company ${test.name} is included in results`);
          } else {
            console.log(`❌ Main company ${test.name} is NOT included in results`);
          }
          
          // Show first few competitors
          competitors.slice(0, 5).forEach((comp, index) => {
            console.log(`   ${index + 1}. ${comp.name}`);
          });
          
        } else {
          console.log(`❌ Failed: ${response.data.error || 'Unknown error'}`);
        }
        
      } catch (error) {
        console.log(`❌ Error testing ${test.name}:`, error.message);
      }
      
      console.log(''); // Empty line for readability
    }
    
  } catch (error) {
    console.log(`❌ General error:`, error.message);
  }
}

testPlatformCompany();
