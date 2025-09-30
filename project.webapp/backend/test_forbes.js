const axios = require('axios');

async function testForbes() {
  try {
    console.log('🧪 Testing Forbes analysis (should not be filtered)...\n');
    
    const response = await axios.get('http://localhost:5000/api/ai-visibility/forbes?industry=media');
    
    if (response.data.success) {
      const competitors = response.data.data.competitors || [];
      console.log(`✅ Found ${competitors.length} competitors:`);
      
      // Check if Forbes is included
      const forbesIncluded = competitors.some(comp => 
        comp.name.toLowerCase().includes('forbes')
      );
      
      if (forbesIncluded) {
        console.log(`✅ Forbes is included in results`);
      } else {
        console.log(`❌ Forbes is NOT included in results`);
      }
      
      competitors.forEach((comp, index) => {
        console.log(`${index + 1}. ${comp.name}`);
      });
      
    } else {
      console.log('❌ Failed:', response.data.error);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testForbes();
