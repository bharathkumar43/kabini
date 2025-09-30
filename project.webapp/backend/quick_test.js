const axios = require('axios');

async function quickTest() {
  try {
    console.log('Quick API test...');
    const response = await axios.get('http://localhost:5000/api/ai-visibility/zara?industry=ecommerce&fast=false');
    console.log('SUCCESS!');
    console.log('Status:', response.status);
    console.log('Competitors found:', response.data.data.competitors.length);
    if (response.data.data.competitors.length > 0) {
      console.log('First few competitors:', response.data.data.competitors.slice(0, 3).map(c => c.name));
    }
  } catch (error) {
    console.log('FAILED:', error.message);
  }
}

quickTest();
