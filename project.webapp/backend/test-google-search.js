/**
 * Test Google Custom Search API
 */

require('dotenv').config();
const axios = require('axios');

async function testGoogleSearch() {
  console.log('Testing Google Custom Search API...\n');
  
  const apiKey = process.env.GOOGLE_API_KEY;
  const engineId = process.env.GOOGLE_CSE_ID;
  
  console.log('Configuration:');
  console.log('  GOOGLE_API_KEY:', apiKey ? `✅ Set (${apiKey.substring(0, 10)}...)` : '❌ Not set');
  console.log('  GOOGLE_CSE_ID:', engineId ? `✅ Set (${engineId})` : '❌ Not set');
  console.log('');
  
  if (!apiKey || !engineId) {
    console.log('❌ Google Custom Search not configured!');
    process.exit(1);
  }
  
  try {
    console.log('🔍 Testing search query: "zara competitors fashion"...\n');
    
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: apiKey,
        cx: engineId,
        q: 'zara competitors fashion',
        num: 5
      },
      timeout: 10000
    });
    
    if (response.status === 200) {
      console.log('✅ Google Custom Search API is WORKING!\n');
      console.log(`Found ${response.data.items?.length || 0} results:\n`);
      
      response.data.items?.forEach((item, index) => {
        console.log(`${index + 1}. ${item.title}`);
        console.log(`   URL: ${item.link}`);
        console.log(`   Snippet: ${item.snippet.substring(0, 100)}...`);
        console.log('');
      });
      
      console.log('✅ SUCCESS: Google Search is working correctly!');
      process.exit(0);
    }
  } catch (error) {
    console.log('❌ Google Custom Search API FAILED!\n');
    console.log('Error:', error.message);
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error details:', error.response.data?.error || 'Unknown');
      
      if (error.response.status === 400) {
        console.log('\n💡 Possible issues:');
        console.log('   - Invalid Search Engine ID (cx parameter)');
        console.log('   - Search engine not configured for "Search the entire web"');
      } else if (error.response.status === 403) {
        console.log('\n💡 Possible issues:');
        console.log('   - API key quota exceeded');
        console.log('   - Custom Search API not enabled in Google Cloud Console');
        console.log('   - Billing not enabled');
      } else if (error.response.status === 401) {
        console.log('\n💡 Possible issues:');
        console.log('   - Invalid API key');
        console.log('   - API key restrictions preventing access');
      }
    }
    
    process.exit(1);
  }
}

testGoogleSearch();














