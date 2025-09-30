const axios = require('axios');

async function debugCompetitorDetection() {
  try {
    console.log('🔍 Debugging competitor detection process...\n');
    
    const company = 'forbes';
    const industry = 'media';
    
    console.log(`Testing: ${company.toUpperCase()} (${industry})`);
    console.log('⏳ Starting analysis with debug info...\n');
    
    const response = await axios.get(`http://localhost:5000/api/ai-visibility/${company}?industry=${industry}`);
    
    if (response.data.success) {
      const competitors = response.data.data.competitors || [];
      console.log(`✅ Found ${competitors.length} competitors:`);
      
      competitors.forEach((comp, index) => {
        console.log(`${index + 1}. ${comp.name}`);
      });
      
      // Check if we're getting industry-specific competitors
      const mediaCompetitors = ['reuters', 'cnn', 'bbc', 'new york times', 'wall street journal', 'bloomberg'];
      const foundMedia = competitors.filter(comp => 
        mediaCompetitors.some(brand => comp.name.toLowerCase().includes(brand))
      );
      
      console.log(`\n🎯 Media competitors found: ${foundMedia.length}`);
      foundMedia.forEach(comp => console.log(`   - ${comp.name}`));
      
      const retailCompetitors = ['amazon', 'ebay', 'walmart', 'target', 'asos', 'uniqlo', 'mango', 'h&m', 'gap'];
      const foundRetail = competitors.filter(comp => 
        retailCompetitors.some(brand => comp.name.toLowerCase().includes(brand))
      );
      
      console.log(`\n🛍️ Retail competitors found: ${foundRetail.length}`);
      foundRetail.forEach(comp => console.log(`   - ${comp.name}`));
      
      if (foundMedia.length > foundRetail.length) {
        console.log('✅ GOOD: More media competitors than retail');
      } else {
        console.log('❌ BAD: More retail competitors than media - using generic fallback');
      }
      
    } else {
      console.log('❌ Failed:', response.data.error);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

debugCompetitorDetection();
