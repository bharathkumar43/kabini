/**
 * Test Competitor Detection
 * Tests if competitors are properly detected for:
 * 1. cloudfuze
 * 2. zara
 */

require('dotenv').config();
const { getVisibilityData } = require('./aiVisibilityService');

async function testCompetitorDetection() {
  console.log('='.repeat(80));
  console.log('TESTING COMPETITOR DETECTION');
  console.log('='.repeat(80));
  console.log('');
  
  // Test cases
  const testCases = [
    { company: 'cloudfuze', industry: '' },
    { company: 'zara', industry: 'Fashion' }
  ];
  
  for (const testCase of testCases) {
    console.log('\n' + '─'.repeat(80));
    console.log(`\n🧪 TEST: ${testCase.company.toUpperCase()}`);
    console.log(`   Industry: ${testCase.industry || 'Auto-detect'}`);
    console.log('');
    
    try {
      const startTime = Date.now();
      
      console.log(`⏱️  Starting analysis...`);
      const result = await getVisibilityData(testCase.company, testCase.industry);
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log('');
      console.log(`✅ Analysis completed in ${duration}s`);
      console.log('');
      
      // Check results
      if (!result || !result.competitors || result.competitors.length === 0) {
        console.log('❌ FAILURE: No competitors found!');
        console.log('');
        console.log('   Possible reasons:');
        console.log('   1. Google Custom Search API not configured');
        console.log('   2. Company name not recognized');
        console.log('   3. Competitor detection methods failed');
        console.log('   4. AI validation rejected all candidates');
        console.log('');
        continue;
      }
      
      // Success - display results
      console.log(`✅ SUCCESS: Found ${result.competitors.length} competitors`);
      console.log('');
      console.log('📊 Competitors:');
      console.log('─'.repeat(80));
      
      result.competitors.forEach((comp, index) => {
        const avgScore = comp.totalScore || 0;
        const visibility = (avgScore * 10).toFixed(0);
        
        console.log(`${index + 1}. ${comp.name}`);
        console.log(`   Total Score: ${avgScore.toFixed(2)}/10`);
        console.log(`   Visibility: ${visibility}%`);
        
        if (comp.aiScores) {
          console.log(`   Platform Scores:`);
          console.log(`     - Gemini: ${(comp.aiScores.gemini || 0).toFixed(2)}`);
          console.log(`     - ChatGPT: ${(comp.aiScores.chatgpt || 0).toFixed(2)}`);
          console.log(`     - Perplexity: ${(comp.aiScores.perplexity || 0).toFixed(2)}`);
          console.log(`     - Claude: ${(comp.aiScores.claude || 0).toFixed(2)}`);
        }
        console.log('');
      });
      
      // Detection methods summary
      if (result.detectionMetadata) {
        console.log('🔍 Detection Methods Used:');
        console.log('─'.repeat(80));
        console.log(`   Industry News: ${result.detectionMetadata.industryNews || 0} found`);
        console.log(`   Public Database: ${result.detectionMetadata.publicDatabase || 0} found`);
        console.log(`   Web Search: ${result.detectionMetadata.webSearch || 0} found`);
        console.log(`   AI Direct: ${result.detectionMetadata.aiDirect || 0} found`);
        console.log('');
      }
      
      // Industry detection
      if (result.detectedIndustry || result.detectedProduct) {
        console.log('🏢 Industry Detection:');
        console.log('─'.repeat(80));
        console.log(`   Industry: ${result.detectedIndustry || 'Unknown'}`);
        console.log(`   Product: ${result.detectedProduct || 'Unknown'}`);
        console.log('');
      }
      
    } catch (error) {
      console.log('');
      console.log(`❌ ERROR: ${error.message}`);
      console.log('');
      console.log('Stack trace:');
      console.log(error.stack);
      console.log('');
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  
  // Check configuration
  console.log('📋 Configuration Check:');
  console.log('─'.repeat(80));
  console.log(`Google Custom Search API Key: ${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`Google Custom Search Engine ID: ${process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID ? '✅ Set' : '❌ Not set'}`);
  console.log(`Gemini API Key: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`Anthropic API Key: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`Perplexity API Key: ${process.env.PERPLEXITY_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log('');
  
  process.exit(0);
}

// Run tests
testCompetitorDetection().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


