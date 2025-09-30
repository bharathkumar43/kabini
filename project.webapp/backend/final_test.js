const axios = require('axios');

async function finalTest() {
  try {
    console.log('Testing API for final result...');
    const response = await axios.get('http://localhost:5000/api/ai-visibility/zara?industry=ecommerce&fast=false', {
      timeout: 120000 // 2 minutes timeout
    });
    console.log('SUCCESS!');
    console.log('Status:', response.status);
    console.log('Competitors found:', response.data.data.competitors.length);
    console.log('Competitors:', response.data.data.competitors.map(c => c.name));
  } catch (error) {
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

finalTest();
