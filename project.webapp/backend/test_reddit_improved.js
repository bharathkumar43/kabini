const axios = require('axios');

async function testRedditImproved() {
  try {
    console.log('🧪 Testing Reddit with improved industry detection...\n');
    
    const response = await axios.get('http://localhost:5000/api/ai-visibility/reddit?industry=social');
    
    if (response.data.success) {
      const competitors = response.data.data.competitors || [];
      console.log(`✅ Found ${competitors.length} competitors:`);
      
      competitors.forEach((comp, index) => {
        console.log(`${index + 1}. ${comp.name}`);
      });
      
      // Check for social media competitors
      const socialCompetitors = ['facebook', 'twitter', 'instagram', 'tiktok', 'snapchat', 'pinterest', 'discord', 'telegram'];
      const foundSocial = competitors.filter(comp => 
        socialCompetitors.some(brand => comp.name.toLowerCase().includes(brand))
      );
      
      console.log(`\n🎯 Social media competitors found: ${foundSocial.length}`);
      foundSocial.forEach(comp => console.log(`   - ${comp.name}`));
      
      // Check for retail competitors (should be fewer)
      const retailCompetitors = ['amazon', 'ebay', 'walmart', 'target', 'asos', 'uniqlo', 'mango', 'h&m', 'gap'];
      const foundRetail = competitors.filter(comp => 
        retailCompetitors.some(brand => comp.name.toLowerCase().includes(brand))
      );
      
      console.log(`\n🛍️ Retail competitors found: ${foundRetail.length}`);
      foundRetail.forEach(comp => console.log(`   - ${comp.name}`));
      
      if (foundSocial.length > foundRetail.length) {
        console.log('✅ GOOD: More social competitors than retail');
      } else {
        console.log('❌ BAD: More retail competitors than social - using generic fallback');
      }
      
    } else {
      console.log('❌ Failed:', response.data.error);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testRedditImproved();
