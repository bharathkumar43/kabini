// Test script for single suggestion application
import fs from 'fs';
import path from 'path';

// Import the applySuggestionsWithDOM function
import { applySuggestionsWithDOM } from './src/utils/analysis.ts';

// Read the test HTML file
const testHtml = fs.readFileSync('./test-single-suggestion.html', 'utf8');

// Create a test suggestion
const testSuggestion = {
  type: 'paragraph',
  description: 'Improve the first paragraph for better engagement',
  currentContent: 'This is a test paragraph that needs improvement. The content is not very engaging and could be enhanced for better user experience.',
  enhancedContent: 'Welcome to our amazing platform! This carefully crafted paragraph delivers exceptional value and creates an engaging experience that will captivate your audience and drive meaningful results.',
  exactReplacement: {
    find: 'This is a test paragraph that needs improvement. The content is not very engaging and could be enhanced for better user experience.',
    replace: 'Welcome to our amazing platform! This carefully crafted paragraph delivers exceptional value and creates an engaging experience that will captivate your audience and drive meaningful results.'
  }
};

console.log('🧪 Testing Single Suggestion Application');
console.log('=====================================');

console.log('\n📄 Original HTML:');
console.log(testHtml.substring(0, 200) + '...');

console.log('\n💡 Test Suggestion:');
console.log(JSON.stringify(testSuggestion, null, 2));

console.log('\n🔄 Applying suggestion...');

try {
  const result = applySuggestionsWithDOM(testHtml, [testSuggestion]);
  
  console.log('\n✅ Application Result:');
  console.log('Original length:', testHtml.length);
  console.log('Result length:', result.length);
  console.log('Changes detected:', result !== testHtml);
  
  console.log('\n📄 Result HTML:');
  console.log(result.substring(0, 300) + '...');
  
  // Check if the enhanced content is present
  const hasEnhancedContent = result.includes('Welcome to our amazing platform!');
  console.log('\n🎯 Enhanced content found:', hasEnhancedContent);
  
  if (hasEnhancedContent) {
    console.log('✅ SUCCESS: Single suggestion application is working correctly!');
  } else {
    console.log('❌ FAILURE: Enhanced content not found in result');
  }
  
} catch (error) {
  console.error('❌ Error applying suggestion:', error);
}
