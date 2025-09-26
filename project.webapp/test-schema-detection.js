const { extractAndRecommendSchema } = require('./backend/schemaExtractor');

async function testSchemaDetection() {
  console.log('🧪 Testing Schema Detection...\n');
  
  // Test with a URL that likely has schemas
  const testUrl = 'https://www.cloudfuze.com/cloudfuze-large-enterprise-migrations/';
  
  try {
    console.log(`Testing URL: ${testUrl}\n`);
    const result = await extractAndRecommendSchema(testUrl);
    
    console.log('📊 Results:');
    console.log('===========');
    console.log(`Source URL: ${result.source_url}`);
    console.log(`Article Schema Found: ${result.found.article.present}`);
    console.log(`Author Schema Found: ${result.found.author.present}`);
    console.log(`FAQ Schema Found: ${result.found.faq.present}`);
    
    console.log('\n📝 Issues:');
    console.log('==========');
    if (result.found.article.issues.length > 0) {
      console.log('Article Issues:', result.found.article.issues);
    }
    if (result.found.author.issues.length > 0) {
      console.log('Author Issues:', result.found.author.issues);
    }
    if (result.found.faq.issues.length > 0) {
      console.log('FAQ Issues:', result.found.faq.issues);
    }
    
    console.log('\n📋 Notes:');
    console.log('=========');
    result.notes.forEach(note => console.log(`• ${note}`));
    
    console.log('\n🔍 Raw Schemas Found:');
    console.log('====================');
    console.log('Article Raw:', result.found.article.raw.length, 'items');
    console.log('Author Raw:', result.found.author.raw.length, 'items');
    console.log('FAQ Raw:', result.found.faq.raw.length, 'items');
    
    if (result.found.article.raw.length > 0) {
      console.log('\nFirst Article Schema:');
      console.log(JSON.stringify(result.found.article.raw[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSchemaDetection();

