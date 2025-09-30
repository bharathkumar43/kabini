const axios = require('axios');

async function testApi() {
  try {
    console.log('Testing API...');
    const response = await axios.get('http://localhost:5000/api/ai-visibility/zara?industry=ecommerce&fast=false');
    console.log('Response status:', response.status);
    console.log('Competitors count:', response.data.data.competitors.length);
    console.log('Competitors:', response.data.data.competitors.map(c => c.name));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testApi();