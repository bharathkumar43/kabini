const axios = require('axios');

async function testApi() {
  try {
    console.log('Testing API...');
    const response = await axios.get('http://localhost:5000/api/ai-visibility/zara?industry=ecommerce&fast=false');
    console.log('Response status:', response.status);
    console.log('Competitors count:', response.data.data.competitors.length);
    console.log('Competitors:', response.data.data.competitors.map(c => c.name));
  } catch (error) {
    console.error('Error details:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
  }
}

testApi();
