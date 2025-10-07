# Testing FAQ Data Fix

## Steps to see FAQ source data:

1. **Go to Product Insights page**
2. **Click "New Analysis" button** (top right corner)
   - This clears the old cached data
3. **Enter a company** (e.g., "Zara", "Nike", "Amazon")
4. **Click "Analyze"**
5. **Wait for analysis to complete** (~60-90 seconds)
6. **Scroll down to "FAQ / Conversational Mentions"**

## What you should see:

### Sources Bar Chart:
- **Reddit**: 0-5+ mentions (if AI models cite Reddit discussions)
- **Quora**: 0-5+ mentions (if AI models cite Quora answers)
- **Trustpilot**: Higher numbers (5-20+) because review sites are commonly cited
- **Forums**: 0-5+ mentions (if general forums are cited)

### Themes Bar Chart:
- **Safe checkout**: 0-5+
- **Fast shipping**: 0-10+
- **Return policy**: 0-5+
- **Trusted reviews**: Higher (10-20+) because "trust" and "review" appear frequently
- **Authenticity**: 0-5+

## Why it was showing zeros:

1. Old cached data doesn't have the new FAQ extraction logic
2. Backend improvements only apply to NEW analyses
3. FAQ data is extracted from AI model responses during analysis

## If still showing zeros after new analysis:

Check backend terminal logs for:
```
FAQ mentions: X questions extracted
```

This shows how many questions were extracted per competitor.

