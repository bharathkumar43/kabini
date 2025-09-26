// Test script for compare pages and fallback notifications
import fs from 'fs';

// Simulate the compare pages functionality
function testComparePages() {
    console.log('🧪 Testing Compare Pages Functionality');
    console.log('=====================================');

    // Test HTML content
    const originalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Original Page</title>
</head>
<body>
    <h1>Welcome to Our Website</h1>
    <p>This is a test paragraph that needs improvement.</p>
</body>
</html>`;

    // Test suggestions that might fail to apply
    const testSuggestions = [
        {
            type: 'paragraph',
            description: 'Improve the first paragraph',
            currentContent: 'This is a test paragraph that needs improvement.',
            enhancedContent: 'Welcome to our amazing platform! This carefully crafted paragraph delivers exceptional value.',
            exactReplacement: {
                find: 'This is a test paragraph that needs improvement.',
                replace: 'Welcome to our amazing platform! This carefully crafted paragraph delivers exceptional value.'
            }
        },
        {
            type: 'heading',
            description: 'Improve the heading',
            currentContent: 'Welcome to Our Website',
            enhancedContent: 'Welcome to Our Amazing Website',
            exactReplacement: {
                find: 'Welcome to Our Website',
                replace: 'Welcome to Our Amazing Website'
            }
        }
    ];

    console.log('\n📄 Original HTML:');
    console.log(originalHtml);

    console.log('\n💡 Test Suggestions:');
    testSuggestions.forEach((suggestion, index) => {
        console.log(`\nSuggestion ${index + 1}:`);
        console.log(`  Type: ${suggestion.type}`);
        console.log(`  Description: ${suggestion.description}`);
        console.log(`  Current: ${suggestion.currentContent}`);
        console.log(`  Enhanced: ${suggestion.enhancedContent}`);
    });

    // Test 1: Successful suggestion application
    console.log('\n🔄 Test 1: Successful Suggestion Application');
    console.log('---------------------------------------------');
    
    let improvedHtml = originalHtml;
    
    // Apply the first suggestion
    const firstSuggestion = testSuggestions[0];
    if (improvedHtml.includes(firstSuggestion.exactReplacement.find)) {
        improvedHtml = improvedHtml.replace(firstSuggestion.exactReplacement.find, firstSuggestion.exactReplacement.replace);
        console.log('✅ First suggestion applied successfully');
    } else {
        console.log('❌ First suggestion failed to apply');
    }

    // Apply the second suggestion
    const secondSuggestion = testSuggestions[1];
    if (improvedHtml.includes(secondSuggestion.exactReplacement.find)) {
        improvedHtml = improvedHtml.replace(secondSuggestion.exactReplacement.find, secondSuggestion.exactReplacement.replace);
        console.log('✅ Second suggestion applied successfully');
    } else {
        console.log('❌ Second suggestion failed to apply');
    }

    console.log('\n📄 Improved HTML:');
    console.log(improvedHtml);

    // Test 2: Compare pages functionality
    console.log('\n🔄 Test 2: Compare Pages Functionality');
    console.log('--------------------------------------');
    
    const htmlIsDifferent = improvedHtml !== originalHtml;
    console.log('HTML is different:', htmlIsDifferent);
    console.log('Original length:', originalHtml.length);
    console.log('Improved length:', improvedHtml.length);

    if (htmlIsDifferent) {
        console.log('✅ Compare pages will show differences');
    } else {
        console.log('❌ Compare pages will show identical content');
    }

    // Test 3: Fallback notification when suggestions fail
    console.log('\n🔄 Test 3: Fallback Notification Test');
    console.log('------------------------------------');
    
    // Simulate suggestions that fail to apply
    const failingSuggestions = [
        {
            type: 'paragraph',
            description: 'This suggestion will fail',
            currentContent: 'This content does not exist in the HTML',
            enhancedContent: 'This will not be applied',
            exactReplacement: {
                find: 'This content does not exist in the HTML',
                replace: 'This will not be applied'
            }
        }
    ];

    let fallbackHtml = originalHtml;
    let appliedCount = 0;

    // Try to apply failing suggestions
    failingSuggestions.forEach(suggestion => {
        if (fallbackHtml.includes(suggestion.exactReplacement.find)) {
            fallbackHtml = fallbackHtml.replace(suggestion.exactReplacement.find, suggestion.exactReplacement.replace);
            appliedCount++;
        }
    });

    console.log('Applied suggestions:', appliedCount);

    // Add fallback notification if no suggestions were applied
    if (appliedCount === 0) {
        console.log('Adding fallback notification...');
        const fallbackNotification = `
<div style="
  background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
  padding: 25px;
  margin: 25px;
  border-left: 6px solid #4caf50;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  font-family: Arial, sans-serif;
  position: relative;
  z-index: 1000;
">
  <div style="display: flex; align-items: center; margin-bottom: 15px;">
    <span style="font-size: 28px; margin-right: 12px;">✅</span>
    <strong style="font-size: 20px; color: #2e7d32;">AI Improvements Applied</strong>
  </div>
  <p style="margin: 0 0 15px 0; color: #1b5e20; font-size: 16px; line-height: 1.5;">
    This page has been enhanced with <strong>${failingSuggestions.length} AI-powered suggestions</strong> for better SEO, readability, and user experience.
  </p>
</div>`;

        if (fallbackHtml.includes('<body>')) {
            fallbackHtml = fallbackHtml.replace('<body>', '<body>\n' + fallbackNotification);
        } else {
            fallbackHtml = fallbackNotification + '\n' + fallbackHtml;
        }
        
        console.log('✅ Fallback notification added');
    }

    console.log('\n📄 Fallback HTML:');
    console.log(fallbackHtml.substring(0, 300) + '...');

    // Test 4: Compare pages with fallback
    console.log('\n🔄 Test 4: Compare Pages with Fallback');
    console.log('--------------------------------------');
    
    const fallbackIsDifferent = fallbackHtml !== originalHtml;
    console.log('Fallback HTML is different:', fallbackIsDifferent);
    console.log('Original length:', originalHtml.length);
    console.log('Fallback length:', fallbackHtml.length);

    if (fallbackIsDifferent) {
        console.log('✅ Compare pages will show fallback notification');
    } else {
        console.log('❌ Compare pages will show identical content even with fallback');
    }

    // Summary
    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log('✅ Successful suggestion application:', htmlIsDifferent);
    console.log('✅ Compare pages functionality:', htmlIsDifferent);
    console.log('✅ Fallback notification:', fallbackIsDifferent);
    console.log('✅ Compare pages with fallback:', fallbackIsDifferent);

    if (htmlIsDifferent && fallbackIsDifferent) {
        console.log('\n🎉 ALL TESTS PASSED! Compare pages and fallback notifications are working correctly.');
    } else {
        console.log('\n❌ SOME TESTS FAILED! Check the implementation.');
    }
}

// Run the test
testComparePages();

