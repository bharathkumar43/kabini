const axios = require('axios');

async function testReddit() {
  try {
    console.log('🧪 Testing Reddit analysis (should not be filtered)...\n');
    
    const response = await axios.get('http://localhost:5000/api/ai-visibility/reddit?industry=social');
    
    if (response.data.success) {
      const competitors = response.data.data.competitors || [];
      console.log(`✅ Found ${competitors.length} competitors:`);
      
      // Check if Reddit is included
      const redditIncluded = competitors.some(comp => 
        comp.name.toLowerCase().includes('reddit')
      );
      
      if (redditIncluded) {
        console.log(`✅ Reddit is included in results`);
      } else {
        console.log(`❌ Reddit is NOT included in results`);
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

testReddit();
