const { extractAndRecommendSchema } = require('./backend/schemaExtractor');

async function testComprehensiveSchemaDetection() {
  console.log('🔍 Comprehensive Schema Detection Test\n');
  
  // Test URLs - some with schemas, some without
  const testUrls = [
    {
      url: 'https://www.cloudfuze.com/cloudfuze-large-enterprise-migrations/',
      description: 'CloudFuze page (from your screenshot)'
    },
    {
      url: 'https://schema.org/Article',
      description: 'Schema.org documentation (likely has schemas)'
    },
    {
      url: 'https://developers.google.com/search/docs/appearance/structured-data',
      description: 'Google documentation (likely has schemas)'
    }
  ];
  
  for (const test of testUrls) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${test.description}`);
    console.log(`URL: ${test.url}`);
    console.log(`${'='.repeat(80)}\n`);
    
    try {
      const result = await extractAndRecommendSchema(test.url);
      
      console.log('📊 Detection Results:');
      console.log('====================');
      console.log(`Article Schema: ${result.found.article.present ? '✅ FOUND' : '❌ NOT FOUND'}`);
      console.log(`Author Schema:  ${result.found.author.present ? '✅ FOUND' : '❌ NOT FOUND'}`);
      console.log(`FAQ Schema:     ${result.found.faq.present ? '✅ FOUND' : '❌ NOT FOUND'}`);
      
      if (result.found.article.present) {
        console.log(`\n📰 Article Schema Details:`);
        console.log(`- Raw schemas found: ${result.found.article.raw.length}`);
        console.log(`- Issues: ${result.found.article.issues.length > 0 ? result.found.article.issues.join(', ') : 'None'}`);
        if (result.found.article.raw.length > 0) {
          console.log(`- First schema type: ${result.found.article.raw[0]['@type']}`);
          console.log(`- Headline: ${result.found.article.raw[0].headline || 'Not found'}`);
        }
      }
      
      if (result.found.author.present) {
        console.log(`\n👤 Author Schema Details:`);
        console.log(`- Raw schemas found: ${result.found.author.raw.length}`);
        console.log(`- Issues: ${result.found.author.issues.length > 0 ? result.found.author.issues.join(', ') : 'None'}`);
        if (result.found.author.raw.length > 0) {
          console.log(`- First schema type: ${result.found.author.raw[0]['@type']}`);
          console.log(`- Name: ${result.found.author.raw[0].name || 'Not found'}`);
        }
      }
      
      if (result.found.faq.present) {
        console.log(`\n❓ FAQ Schema Details:`);
        console.log(`- Raw schemas found: ${result.found.faq.raw.length}`);
        console.log(`- Issues: ${result.found.faq.issues.length > 0 ? result.found.faq.issues.join(', ') : 'None'}`);
        if (result.found.faq.raw.length > 0) {
          console.log(`- Questions count: ${result.found.faq.raw[0].mainEntity ? result.found.faq.raw[0].mainEntity.length : 0}`);
        }
      }
      
      console.log(`\n📝 Notes:`);
      result.notes.forEach(note => console.log(`- ${note}`));
      
      console.log(`\n🔧 Recommendations Generated:`);
      console.log(`- Article: ${result.recommended.article_jsonld ? '✅ Generated' : '❌ Not needed'}`);
      console.log(`- Author:  ${result.recommended.author_jsonld ? '✅ Generated' : '❌ Not needed'}`);
      console.log(`- FAQ:     ${result.recommended.faq_jsonld ? '✅ Generated' : '❌ Not needed'}`);
      
    } catch (error) {
      console.error(`❌ Error testing ${test.url}:`, error.message);
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('🎯 Test Summary');
  console.log(`${'='.repeat(80)}`);
  console.log('The enhanced schema detector now checks for:');
  console.log('1. JSON-LD scripts (application/ld+json)');
  console.log('2. Microdata (itemscope, itemtype, itemprop)');
  console.log('3. RDFa (typeof, property, resource)');
  console.log('4. Inline HTML patterns (article, author, faq classes)');
  console.log('5. Meta tag patterns (Open Graph, Twitter Cards)');
  console.log('\nThis should provide much more accurate detection!');
}

testComprehensiveSchemaDetection();

