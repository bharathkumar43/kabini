/**
 * Test API Keys Validation
 * Checks if configured API keys are actually working
 */

require('dotenv').config();
const axios = require('axios');

async function testAPIKeys() {
  console.log('='.repeat(80));
  console.log('API KEYS VALIDATION TEST');
  console.log('='.repeat(80));
  console.log('');
  
  const results = {
    googleSearch: { configured: false, working: false, error: null },
    gemini: { configured: false, working: false, error: null },
    openai: { configured: false, working: false, error: null },
    anthropic: { configured: false, working: false, error: null },
    perplexity: { configured: false, working: false, error: null }
  };
  
  // 1. Test Google Custom Search
  console.log('1️⃣  Testing Google Custom Search API...');
  console.log('─'.repeat(80));
  
  const googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const googleEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
  
  if (!googleApiKey || !googleEngineId) {
    console.log('❌ NOT CONFIGURED');
    console.log('   API Key:', googleApiKey ? '✅ Set' : '❌ Missing');
    console.log('   Engine ID:', googleEngineId ? '✅ Set' : '❌ Missing');
    console.log('');
  } else {
    results.googleSearch.configured = true;
    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: googleApiKey,
          cx: googleEngineId,
          q: 'test query',
          num: 1
        },
        timeout: 10000
      });
      
      if (response.status === 200 && response.data.items) {
        console.log('✅ WORKING!');
        console.log(`   Found ${response.data.items.length} search results`);
        results.googleSearch.working = true;
      } else {
        console.log('⚠️  Unexpected response');
        results.googleSearch.error = 'Unexpected response format';
      }
    } catch (error) {
      console.log('❌ FAILED');
      console.log(`   Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.error?.message || 'Unknown'}`);
      }
      results.googleSearch.error = error.message;
    }
    console.log('');
  }
  
  // 2. Test Gemini
  console.log('2️⃣  Testing Gemini API...');
  console.log('─'.repeat(80));
  
  const geminiKey = process.env.GEMINI_API_KEY;
  
  if (!geminiKey) {
    console.log('❌ NOT CONFIGURED');
    console.log('');
  } else {
    results.gemini.configured = true;
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
        {
          contents: [{
            parts: [{ text: 'Say hello in one word' }]
          }]
        },
        { timeout: 15000 }
      );
      
      if (response.status === 200 && response.data.candidates) {
        console.log('✅ WORKING!');
        console.log(`   Response: ${response.data.candidates[0]?.content?.parts[0]?.text || 'N/A'}`);
        results.gemini.working = true;
      }
    } catch (error) {
      console.log('❌ FAILED');
      console.log(`   Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.error?.message || 'Unknown'}`);
      }
      results.gemini.error = error.message;
    }
    console.log('');
  }
  
  // 3. Test OpenAI (ChatGPT)
  console.log('3️⃣  Testing OpenAI API (ChatGPT)...');
  console.log('─'.repeat(80));
  
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    console.log('❌ NOT CONFIGURED');
    console.log('');
  } else {
    results.openai.configured = true;
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Say hello in one word' }],
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      if (response.status === 200 && response.data.choices) {
        console.log('✅ WORKING!');
        console.log(`   Response: ${response.data.choices[0]?.message?.content || 'N/A'}`);
        results.openai.working = true;
      }
    } catch (error) {
      console.log('❌ FAILED');
      console.log(`   Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.error?.message || 'Unknown'}`);
      }
      results.openai.error = error.message;
    }
    console.log('');
  }
  
  // 4. Test Anthropic (Claude)
  console.log('4️⃣  Testing Anthropic API (Claude)...');
  console.log('─'.repeat(80));
  
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  
  if (!anthropicKey) {
    console.log('❌ NOT CONFIGURED');
    console.log('');
  } else {
    results.anthropic.configured = true;
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say hello in one word' }]
        },
        {
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      if (response.status === 200 && response.data.content) {
        console.log('✅ WORKING!');
        console.log(`   Response: ${response.data.content[0]?.text || 'N/A'}`);
        results.anthropic.working = true;
      }
    } catch (error) {
      console.log('❌ FAILED');
      console.log(`   Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.error?.message || 'Unknown'}`);
      }
      results.anthropic.error = error.message;
    }
    console.log('');
  }
  
  // 5. Test Perplexity
  console.log('5️⃣  Testing Perplexity API...');
  console.log('─'.repeat(80));
  
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  
  if (!perplexityKey) {
    console.log('❌ NOT CONFIGURED');
    console.log('');
  } else {
    results.perplexity.configured = true;
    try {
      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: 'Say hello in one word' }],
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${perplexityKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      if (response.status === 200 && response.data.choices) {
        console.log('✅ WORKING!');
        console.log(`   Response: ${response.data.choices[0]?.message?.content || 'N/A'}`);
        results.perplexity.working = true;
      }
    } catch (error) {
      console.log('❌ FAILED');
      console.log(`   Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Message: ${error.response.data?.error?.message || 'Unknown'}`);
      }
      results.perplexity.error = error.message;
    }
    console.log('');
  }
  
  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log('');
  
  const formatStatus = (api) => {
    if (!results[api].configured) return '❌ Not Configured';
    if (results[api].working) return '✅ Working';
    return `❌ Failed (${results[api].error})`;
  };
  
  console.log('API Status:');
  console.log('─'.repeat(80));
  console.log(`Google Custom Search: ${formatStatus('googleSearch')}`);
  console.log(`Gemini:               ${formatStatus('gemini')}`);
  console.log(`OpenAI (ChatGPT):     ${formatStatus('openai')}`);
  console.log(`Anthropic (Claude):   ${formatStatus('anthropic')}`);
  console.log(`Perplexity:           ${formatStatus('perplexity')}`);
  console.log('');
  
  // Critical recommendations
  console.log('⚠️  CRITICAL ISSUES:');
  console.log('─'.repeat(80));
  
  const issues = [];
  
  if (!results.googleSearch.configured) {
    issues.push('🚨 Google Custom Search NOT configured - Competitor detection will FAIL');
  } else if (!results.googleSearch.working) {
    issues.push(`🚨 Google Custom Search configured but NOT working: ${results.googleSearch.error}`);
  }
  
  if (!results.gemini.working && results.gemini.configured) {
    issues.push(`⚠️  Gemini API configured but NOT working: ${results.gemini.error}`);
  }
  
  if (!results.openai.working && results.openai.configured) {
    issues.push(`⚠️  OpenAI API configured but NOT working: ${results.openai.error}`);
  }
  
  if (!results.anthropic.working && results.anthropic.configured) {
    issues.push(`⚠️  Anthropic API configured but NOT working: ${results.anthropic.error}`);
  }
  
  if (!results.perplexity.working && results.perplexity.configured) {
    issues.push(`⚠️  Perplexity API configured but NOT working: ${results.perplexity.error}`);
  }
  
  if (issues.length === 0) {
    console.log('✅ All configured APIs are working!');
  } else {
    issues.forEach(issue => console.log(issue));
  }
  
  console.log('');
  console.log('='.repeat(80));
  
  // Exit with error code if critical APIs are broken
  if (!results.googleSearch.configured || !results.googleSearch.working) {
    process.exit(1);
  }
  
  process.exit(0);
}

testAPIKeys().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


