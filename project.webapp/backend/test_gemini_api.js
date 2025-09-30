const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  const apiKey = 'AIzaSyCMO28d7v8lI8W9VIOL-ENdMmlw9okPoJwCHeck';
  
  console.log('🧪 Testing Gemini API Key...');
  console.log(`API Key: ${apiKey.substring(0, 20)}...`);
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    console.log('✅ Gemini client initialized successfully');
    
    // Test 1: Simple text generation
    console.log('\n🔍 Test 1: Simple text generation...');
    try {
      const result = await model.generateContent('Hello, can you respond with "API working" if you can read this?');
      const response = result.response.candidates[0]?.content?.parts[0]?.text || '';
      console.log(`✅ Response: ${response}`);
    } catch (error) {
      console.log(`❌ Simple text generation failed: ${error.message}`);
    }
    
    // Test 2: JSON response
    console.log('\n🔍 Test 2: JSON response...');
    try {
      const result = await model.generateContent('Return a JSON object with "status": "working" and "test": "successful"');
      const response = result.response.candidates[0]?.content?.parts[0]?.text || '';
      console.log(`✅ JSON Response: ${response}`);
    } catch (error) {
      console.log(`❌ JSON response failed: ${error.message}`);
    }
    
    // Test 3: Competitor extraction (similar to our use case)
    console.log('\n🔍 Test 3: Competitor extraction...');
    try {
      const prompt = `Analyze these search results and extract ONLY direct competitor NAMES for "Reddit".

STRICT RULES FOR ACCURACY:
1) ONLY include companies that are DIRECT competitors to Reddit (same industry, similar products/services, same target customers)
2) Exclude Reddit itself
3) Exclude generic terms like "competitors", "companies", "businesses", "alternatives", "list"
4) Exclude news websites, blogs, or informational sites (e.g., "Reuters", "Forbes", "TechCrunch")
5) Exclude job sites, review sites, or directory sites (e.g., "Indeed", "Glassdoor", "LinkedIn")
6) Exclude government or educational institutions unless they directly compete
7) Only include actual business competitors that customers would choose between
8) Deduplicate and normalize brand names (e.g., "amazon.com" → "Amazon")
9) Focus on companies with similar business models and target markets
10) Return ONLY a JSON array (no extra text), target 5-8 high-quality competitors

Search results (title — snippet (link)):
Reddit — The front page of the internet (reddit.com)
Facebook — Connect with friends and the world around you (facebook.com)
Twitter — What's happening (twitter.com)
Instagram — A simple, fun & creative way to capture, edit & share photos, videos & messages (instagram.com)
TikTok — Make Your Day (tiktok.com)
Snapchat — The fastest way to share a moment! (snapchat.com)
Discord — Your place to talk (discord.com)
Pinterest — Discover recipes, home ideas, style inspiration and other ideas to try (pinterest.com)

Return JSON array only, e.g.: ["Company1", "Company2", "Company3"]`;

      const result = await model.generateContent(prompt);
      const response = result.response.candidates[0]?.content?.parts[0]?.text || '';
      console.log(`✅ Competitor extraction response: ${response}`);
      
      // Try to parse the JSON
      try {
        const clean = response.replace(/```json\s*/g, '').replace(/```/g, '').trim();
        const jsonMatch = clean.match(/\[[\s\S]*\]/);
        const raw = jsonMatch ? jsonMatch[0] : clean;
        const competitors = JSON.parse(raw);
        console.log(`✅ Parsed competitors: ${JSON.stringify(competitors)}`);
      } catch (parseError) {
        console.log(`❌ JSON parsing failed: ${parseError.message}`);
      }
      
    } catch (error) {
      console.log(`❌ Competitor extraction failed: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Gemini API initialization failed: ${error.message}`);
  }
}

testGeminiAPI();
