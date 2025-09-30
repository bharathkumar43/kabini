// Test industry detection logic
function testIndustryDetection(companyName, industry) {
  console.log(`\n🧪 Testing industry detection for: ${companyName} (industry: ${industry})`);
  
  let detectedIndustryType = 'ecommerce'; // default
  
  // First, try to use the provided industry parameter
  if (industry && industry.trim().length > 0) {
    const industryLower = industry.toLowerCase();
    console.log(`   📝 Industry parameter: "${industry}" -> lowercase: "${industryLower}"`);
    
    if (industryLower.includes('media') || industryLower.includes('news') || industryLower.includes('journalism')) {
      detectedIndustryType = 'media';
      console.log(`   ✅ Matched media industry`);
    } else if (industryLower.includes('social') || industryLower.includes('community')) {
      detectedIndustryType = 'social';
      console.log(`   ✅ Matched social industry`);
    } else if (industryLower.includes('professional') || industryLower.includes('job') || industryLower.includes('career')) {
      detectedIndustryType = 'professional';
      console.log(`   ✅ Matched professional industry`);
    } else if (industryLower.includes('fashion') || industryLower.includes('clothing') || industryLower.includes('apparel')) {
      detectedIndustryType = 'fashion';
      console.log(`   ✅ Matched fashion industry`);
    } else if (industryLower.includes('automotive') || industryLower.includes('car') || industryLower.includes('vehicle')) {
      detectedIndustryType = 'automotive';
      console.log(`   ✅ Matched automotive industry`);
    } else if (industryLower.includes('tech') || industryLower.includes('technology') || industryLower.includes('software')) {
      detectedIndustryType = 'tech';
      console.log(`   ✅ Matched tech industry`);
    } else if (industryLower.includes('streaming') || industryLower.includes('entertainment') || industryLower.includes('video')) {
      detectedIndustryType = 'streaming';
      console.log(`   ✅ Matched streaming industry`);
    } else {
      console.log(`   ❌ No match found in industry parameter`);
    }
  } else {
    console.log(`   ❌ No industry parameter provided`);
  }
  
  // If no industry provided or not recognized, try company name detection
  if (detectedIndustryType === 'ecommerce') {
    console.log(`   🔍 Trying company name detection...`);
    
    if (companyName.toLowerCase().includes('fashion') || companyName.toLowerCase().includes('zara') || 
        companyName.toLowerCase().includes('h&m') || companyName.toLowerCase().includes('uniqlo') ||
        companyName.toLowerCase().includes('gap') || companyName.toLowerCase().includes('asos')) {
      detectedIndustryType = 'fashion';
      console.log(`   ✅ Matched fashion from company name`);
    } else if (companyName.toLowerCase().includes('tesla') || companyName.toLowerCase().includes('bmw') ||
               companyName.toLowerCase().includes('mercedes') || companyName.toLowerCase().includes('toyota')) {
      detectedIndustryType = 'automotive';
      console.log(`   ✅ Matched automotive from company name`);
    } else if (companyName.toLowerCase().includes('apple') || companyName.toLowerCase().includes('google') ||
               companyName.toLowerCase().includes('microsoft') || companyName.toLowerCase().includes('samsung')) {
      detectedIndustryType = 'tech';
      console.log(`   ✅ Matched tech from company name`);
    } else if (companyName.toLowerCase().includes('netflix') || companyName.toLowerCase().includes('disney') ||
               companyName.toLowerCase().includes('hulu') || companyName.toLowerCase().includes('spotify')) {
      detectedIndustryType = 'streaming';
      console.log(`   ✅ Matched streaming from company name`);
    } else if (companyName.toLowerCase().includes('forbes') || companyName.toLowerCase().includes('reuters') ||
               companyName.toLowerCase().includes('cnn') || companyName.toLowerCase().includes('bbc')) {
      detectedIndustryType = 'media';
      console.log(`   ✅ Matched media from company name`);
    } else if (companyName.toLowerCase().includes('reddit') || companyName.toLowerCase().includes('facebook') ||
               companyName.toLowerCase().includes('twitter') || companyName.toLowerCase().includes('instagram')) {
      detectedIndustryType = 'social';
      console.log(`   ✅ Matched social from company name`);
    } else if (companyName.toLowerCase().includes('linkedin') || companyName.toLowerCase().includes('indeed') ||
               companyName.toLowerCase().includes('glassdoor') || companyName.toLowerCase().includes('monster')) {
      detectedIndustryType = 'professional';
      console.log(`   ✅ Matched professional from company name`);
    } else {
      console.log(`   ❌ No match found in company name`);
    }
  }
  
  console.log(`   🎯 Final detected industry: ${detectedIndustryType}`);
  return detectedIndustryType;
}

// Test cases
console.log('🔍 Testing Industry Detection Logic\n');

testIndustryDetection('reddit', 'social');
testIndustryDetection('forbes', 'media');
testIndustryDetection('zara', 'fashion');
testIndustryDetection('tesla', 'automotive');
testIndustryDetection('apple', 'tech');
testIndustryDetection('netflix', 'streaming');
testIndustryDetection('linkedin', 'professional');
testIndustryDetection('unknown', 'ecommerce');
