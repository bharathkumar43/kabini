const axios = require('axios');

async function quickTest() {
  try {
    console.log('🚀 Quick accuracy test...\n');
    
    const response = await axios.get('http://localhost:5000/api/ai-visibility/zara?industry=ecommerce');
    
    if (response.data.success) {
      const competitors = response.data.data.competitors || [];
      console.log(`✅ Found ${competitors.length} competitors:`);
      
      competitors.forEach((comp, index) => {
        console.log(`${index + 1}. ${comp.name}`);
      });
      
      // Check for fashion brands
      const fashionBrands = ['h&m', 'uniqlo', 'gap', 'asos', 'shein', 'mango'];
      const foundFashion = competitors.filter(comp => 
        fashionBrands.some(brand => comp.name.toLowerCase().includes(brand))
      );
      
      console.log(`\n🎯 Fashion competitors found: ${foundFashion.length}`);
      foundFashion.forEach(comp => console.log(`   - ${comp.name}`));
      
      const accuracy = foundFashion.length / competitors.length * 100;
      console.log(`📊 Accuracy: ${accuracy.toFixed(1)}%`);
      
    } else {
      console.log('❌ Failed:', response.data.error);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

quickTest();
