/**
 * URL → Schema Extractor & Recommender (Article, Author, FAQ)
 * 
 * This module provides comprehensive schema extraction and recommendation
 * for Article/BlogPosting, Author (Person/Organization), and FAQPage schemas.
 */

const axios = require('axios');
const { JSDOM } = require('jsdom');

/**
 * Extract and recommend schema markup for a given URL
 * @param {string} url - The URL to analyze
 * @returns {Object} Schema analysis and recommendations
 */
async function extractAndRecommendSchema(url) {
  try {
    console.log(`[Schema Extractor] Starting analysis for: ${url}`);
    
    // Step 1: Fetch & parse HTML
    const { html, metadata } = await fetchAndParseHTML(url);
    console.log(`[Schema Extractor] HTML length: ${html.length}, Title: ${metadata.title}`);
    
    // Step 2: Extract existing schemas
    const foundSchemas = extractExistingSchemas(html);
    console.log(`[Schema Extractor] Found schemas:`, {
      article: foundSchemas.article.present,
      author: foundSchemas.author.present,
      faq: foundSchemas.faq.present,
      articleRaw: foundSchemas.article.raw.length,
      authorRaw: foundSchemas.author.raw.length,
      faqRaw: foundSchemas.faq.raw.length
    });
    
    // Step 3: Extract content for recommendations
    const contentData = extractContentData(html, metadata, url);
    
    // Step 4: Generate recommendations
    const recommendations = generateRecommendations(foundSchemas, contentData, url);
    
    // Step 5: Identify missing fields
    const missingFields = identifyMissingFields(foundSchemas, recommendations);
    
    // Step 6: Generate notes
    const notes = generateNotes(foundSchemas, contentData, missingFields);
    
    const result = {
      source_url: url,
      found: foundSchemas,
      recommended: recommendations,
      missing_fields: missingFields,
      notes: notes
    };
    
    console.log(`[Schema Extractor] Analysis complete for: ${url}`);
    console.log(`[Schema Extractor] Final result:`, {
      articlePresent: result.found.article.present,
      authorPresent: result.found.author.present,
      faqPresent: result.found.faq.present,
      articleIssues: result.found.article.issues,
      authorIssues: result.found.author.issues,
      faqIssues: result.found.faq.issues
    });
    return result;
    
  } catch (error) {
    console.error(`[Schema Extractor] Error analyzing ${url}:`, error.message);
    return {
      source_url: url,
      found: {
        article: { present: false, raw: [], issues: [`Error: ${error.message}`] },
        author: { present: false, raw: [], issues: [`Error: ${error.message}`] },
        faq: { present: false, raw: [], issues: [`Error: ${error.message}`] }
      },
      recommended: {
        article_jsonld: null,
        author_jsonld: null,
        faq_jsonld: null
      },
      missing_fields: {
        article: ['headline', 'description', 'author', 'datePublished'],
        author: ['name'],
        faq: []
      },
      notes: [`Failed to analyze URL: ${error.message}`]
    };
  }
}

/**
 * Fetch and parse HTML from URL
 */
async function fetchAndParseHTML(url) {
  const response = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SchemaExtractor/1.0)'
    }
  });
  
  const html = response.data;
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Extract metadata
  const metadata = {
    title: extractMetaContent(document, 'og:title') || 
           extractMetaContent(document, 'title') || 
           document.querySelector('title')?.textContent?.trim() || '',
    description: extractMetaContent(document, 'og:description') || 
                extractMetaContent(document, 'description') || '',
    image: extractMetaContent(document, 'og:image') || '',
    author: extractAuthor(document),
    publishDate: extractMetaContent(document, 'article:published_time') || 
                 extractMetaContent(document, 'datePublished') || '',
    modifiedDate: extractMetaContent(document, 'article:modified_time') || 
                  extractMetaContent(document, 'dateModified') || '',
    canonical: extractMetaContent(document, 'canonical') || url,
    siteName: extractMetaContent(document, 'og:site_name') || 
              extractMetaContent(document, 'application-name') || ''
  };
  
  return { html, metadata, document };
}

/**
 * Extract existing schemas from HTML
 */
function extractExistingSchemas(html) {
  const foundSchemas = {
    article: { present: false, raw: [], issues: [] },
    author: { present: false, raw: [], issues: [] },
    faq: { present: false, raw: [], issues: [] }
  };
  
  console.log(`[Schema Extractor] Extracting schemas from HTML (length: ${html.length})`);
  
  // 1. Extract JSON-LD scripts (most common format)
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
  console.log(`[Schema Extractor] Found ${jsonLdMatches ? jsonLdMatches.length : 0} JSON-LD scripts`);
  
  if (jsonLdMatches) {
    jsonLdMatches.forEach((match, index) => {
      try {
        const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        console.log(`[Schema Extractor] Processing JSON-LD script ${index + 1}:`, jsonContent.substring(0, 200) + '...');
        const schema = JSON.parse(jsonContent);
        
        if (Array.isArray(schema)) {
          console.log(`[Schema Extractor] Found array schema with ${schema.length} items`);
          schema.forEach(item => processSchemaItem(item, foundSchemas));
        } else {
          console.log(`[Schema Extractor] Found single schema:`, schema['@type']);
          processSchemaItem(schema, foundSchemas);
        }
      } catch (e) {
        console.warn('[Schema Extractor] Invalid JSON-LD found:', e.message);
        console.warn('[Schema Extractor] Content:', match.substring(0, 200) + '...');
      }
    });
  }
  
  // 2. Extract microdata (itemscope, itemtype, itemprop)
  extractMicrodata(html, foundSchemas);
  
  // 3. Extract RDFa (typeof, property, resource)
  extractRDFa(html, foundSchemas);
  
  // 4. Look for inline schema patterns in HTML
  extractInlineSchemas(html, foundSchemas);
  
  // 5. Check for common schema patterns in meta tags
  extractMetaSchemas(html, foundSchemas);
  
  console.log(`[Schema Extractor] Final extraction result:`, {
    article: foundSchemas.article.present,
    author: foundSchemas.author.present,
    faq: foundSchemas.faq.present,
    articleRaw: foundSchemas.article.raw.length,
    authorRaw: foundSchemas.author.raw.length,
    faqRaw: foundSchemas.faq.raw.length
  });
  
  return foundSchemas;
}

/**
 * Process individual schema item
 */
function processSchemaItem(schema, foundSchemas) {
  if (!schema || typeof schema !== 'object') {
    console.log('[Schema Extractor] Invalid schema item:', schema);
    return;
  }
  
  const schemaType = schema['@type'];
  console.log(`[Schema Extractor] Processing schema type: ${schemaType}`);
  
  if (schemaType === 'Article' || schemaType === 'BlogPosting') {
    console.log('[Schema Extractor] Found Article/BlogPosting schema');
    foundSchemas.article.present = true;
    foundSchemas.article.raw.push(schema);
    
    // Validate article schema
    const issues = validateArticleSchema(schema);
    foundSchemas.article.issues.push(...issues);
    console.log(`[Schema Extractor] Article schema issues:`, issues);
    
    // Extract author from article
    if (schema.author) {
      console.log('[Schema Extractor] Found author in article schema');
      foundSchemas.author.present = true;
      foundSchemas.author.raw.push(schema.author);
    }
  }
  
  if (schemaType === 'Person' || schemaType === 'Organization') {
    console.log(`[Schema Extractor] Found ${schemaType} schema`);
    foundSchemas.author.present = true;
    foundSchemas.author.raw.push(schema);
    
    const issues = validateAuthorSchema(schema);
    foundSchemas.author.issues.push(...issues);
    console.log(`[Schema Extractor] Author schema issues:`, issues);
  }
  
  if (schemaType === 'FAQPage') {
    console.log('[Schema Extractor] Found FAQPage schema');
    foundSchemas.faq.present = true;
    foundSchemas.faq.raw.push(schema);
    
    const issues = validateFAQSchema(schema);
    foundSchemas.faq.issues.push(...issues);
    console.log(`[Schema Extractor] FAQ schema issues:`, issues);
  }
  
  // Log any other schema types found
  if (!['Article', 'BlogPosting', 'Person', 'Organization', 'FAQPage'].includes(schemaType)) {
    console.log(`[Schema Extractor] Found other schema type: ${schemaType}`);
  }
}

/**
 * Extract microdata from HTML
 */
function extractMicrodata(html, foundSchemas) {
  console.log('[Schema Extractor] Extracting microdata...');
  
  // Look for itemscope with itemtype
  const microdataMatches = html.match(/itemscope[^>]*itemtype=["']([^"']+)["'][^>]*>/gi);
  if (microdataMatches) {
    console.log(`[Schema Extractor] Found ${microdataMatches.length} microdata items`);
    microdataMatches.forEach(match => {
      if (match.includes('schema.org/Article') || match.includes('schema.org/BlogPosting')) {
        console.log('[Schema Extractor] Found Article/BlogPosting microdata');
        foundSchemas.article.present = true;
        foundSchemas.article.issues.push('Microdata found (conversion to JSON-LD recommended)');
      }
      if (match.includes('schema.org/Person') || match.includes('schema.org/Organization')) {
        console.log('[Schema Extractor] Found Person/Organization microdata');
        foundSchemas.author.present = true;
        foundSchemas.author.issues.push('Microdata found (conversion to JSON-LD recommended)');
      }
      if (match.includes('schema.org/FAQPage')) {
        console.log('[Schema Extractor] Found FAQPage microdata');
        foundSchemas.faq.present = true;
        foundSchemas.faq.issues.push('Microdata found (conversion to JSON-LD recommended)');
      }
    });
  }
  
  // Also look for itemprop patterns that might indicate schema
  const itempropMatches = html.match(/itemprop=["']([^"']+)["'][^>]*>/gi);
  if (itempropMatches) {
    console.log(`[Schema Extractor] Found ${itempropMatches.length} itemprop attributes`);
    // Check if any of these are article-related
    const articleProps = ['headline', 'description', 'author', 'datePublished', 'dateModified'];
    const hasArticleProps = itempropMatches.some(match => 
      articleProps.some(prop => match.includes(`itemprop="${prop}"`))
    );
    if (hasArticleProps && !foundSchemas.article.present) {
      console.log('[Schema Extractor] Found article-related microdata properties');
      foundSchemas.article.present = true;
      foundSchemas.article.issues.push('Article microdata properties found (conversion to JSON-LD recommended)');
    }
  }
}

/**
 * Extract RDFa from HTML
 */
function extractRDFa(html, foundSchemas) {
  console.log('[Schema Extractor] Extracting RDFa...');
  
  // Look for typeof patterns
  const typeofMatches = html.match(/typeof=["']([^"']+)["'][^>]*>/gi);
  if (typeofMatches) {
    console.log(`[Schema Extractor] Found ${typeofMatches.length} typeof attributes`);
    typeofMatches.forEach(match => {
      if (match.includes('schema:Article') || match.includes('schema:BlogPosting')) {
        console.log('[Schema Extractor] Found Article/BlogPosting RDFa');
        foundSchemas.article.present = true;
        foundSchemas.article.issues.push('RDFa found (conversion to JSON-LD recommended)');
      }
      if (match.includes('schema:Person') || match.includes('schema:Organization')) {
        console.log('[Schema Extractor] Found Person/Organization RDFa');
        foundSchemas.author.present = true;
        foundSchemas.author.issues.push('RDFa found (conversion to JSON-LD recommended)');
      }
      if (match.includes('schema:FAQPage')) {
        console.log('[Schema Extractor] Found FAQPage RDFa');
        foundSchemas.faq.present = true;
        foundSchemas.faq.issues.push('RDFa found (conversion to JSON-LD recommended)');
      }
    });
  }
  
  // Look for property patterns
  const propertyMatches = html.match(/property=["']([^"']+)["'][^>]*>/gi);
  if (propertyMatches) {
    console.log(`[Schema Extractor] Found ${propertyMatches.length} property attributes`);
    const articleProps = ['schema:headline', 'schema:description', 'schema:author', 'schema:datePublished'];
    const hasArticleProps = propertyMatches.some(match => 
      articleProps.some(prop => match.includes(`property="${prop}"`))
    );
    if (hasArticleProps && !foundSchemas.article.present) {
      console.log('[Schema Extractor] Found article-related RDFa properties');
      foundSchemas.article.present = true;
      foundSchemas.article.issues.push('Article RDFa properties found (conversion to JSON-LD recommended)');
    }
  }
}

/**
 * Extract inline schema patterns
 */
function extractInlineSchemas(html, foundSchemas) {
  console.log('[Schema Extractor] Extracting inline schema patterns...');
  
  // Look for common schema patterns in HTML structure
  const patterns = {
    article: [
      /<article[^>]*>/gi,
      /<main[^>]*>/gi,
      /<section[^>]*class=["'][^"']*article[^"']*["'][^>]*>/gi,
      /<div[^>]*class=["'][^"']*post[^"']*["'][^>]*>/gi,
      /<div[^>]*class=["'][^"']*entry[^"']*["'][^>]*>/gi
    ],
    author: [
      /<div[^>]*class=["'][^"']*author[^"']*["'][^>]*>/gi,
      /<span[^>]*class=["'][^"']*author[^"']*["'][^>]*>/gi,
      /<p[^>]*class=["'][^"']*author[^"']*["'][^>]*>/gi,
      /<div[^>]*class=["'][^"']*byline[^"']*["'][^>]*>/gi
    ],
    faq: [
      /<div[^>]*class=["'][^"']*faq[^"']*["'][^>]*>/gi,
      /<section[^>]*class=["'][^"']*faq[^"']*["'][^>]*>/gi,
      /<div[^>]*class=["'][^"']*question[^"']*["'][^>]*>/gi,
      /<div[^>]*class=["'][^"']*answer[^"']*["'][^>]*>/gi
    ]
  };
  
  Object.entries(patterns).forEach(([type, patternList]) => {
    patternList.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`[Schema Extractor] Found ${matches.length} ${type} pattern matches`);
        if (type === 'article' && !foundSchemas.article.present) {
          foundSchemas.article.present = true;
          foundSchemas.article.issues.push('Article-like HTML structure found (consider adding schema)');
        } else if (type === 'author' && !foundSchemas.author.present) {
          foundSchemas.author.present = true;
          foundSchemas.author.issues.push('Author-like HTML structure found (consider adding schema)');
        } else if (type === 'faq' && !foundSchemas.faq.present) {
          foundSchemas.faq.present = true;
          foundSchemas.faq.issues.push('FAQ-like HTML structure found (consider adding schema)');
        }
      }
    });
  });
}

/**
 * Extract schema patterns from meta tags
 */
function extractMetaSchemas(html, foundSchemas) {
  console.log('[Schema Extractor] Extracting meta schema patterns...');
  
  // Look for Open Graph and Twitter Card meta tags that might indicate article content
  const ogArticle = html.match(/<meta[^>]*property=["']og:type["'][^>]*content=["']article["'][^>]*>/gi);
  const twitterCard = html.match(/<meta[^>]*name=["']twitter:card["'][^>]*content=["']summary_large_image["'][^>]*>/gi);
  
  if (ogArticle && ogArticle.length > 0) {
    console.log('[Schema Extractor] Found Open Graph article type');
    if (!foundSchemas.article.present) {
      foundSchemas.article.present = true;
      foundSchemas.article.issues.push('Open Graph article type found (consider adding Article schema)');
    }
  }
  
  if (twitterCard && twitterCard.length > 0) {
    console.log('[Schema Extractor] Found Twitter Card');
    if (!foundSchemas.article.present) {
      foundSchemas.article.present = true;
      foundSchemas.article.issues.push('Twitter Card found (consider adding Article schema)');
    }
  }
  
  // Look for author meta tags
  const authorMeta = html.match(/<meta[^>]*(name|property)=["'](author|article:author)["'][^>]*>/gi);
  if (authorMeta && authorMeta.length > 0) {
    console.log('[Schema Extractor] Found author meta tags');
    if (!foundSchemas.author.present) {
      foundSchemas.author.present = true;
      foundSchemas.author.issues.push('Author meta tags found (consider adding Person schema)');
    }
  }
}

/**
 * Extract content data for recommendations
 */
function extractContentData(html, metadata, url) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Extract headings that look like questions
  const questionHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .map(h => h.textContent.trim())
    .filter(text => text.endsWith('?') && text.length > 10 && text.length < 200);
  
  // Extract FAQ sections
  const faqSections = Array.from(document.querySelectorAll('[class*="faq"], [id*="faq"], [class*="question"], [id*="question"]'))
    .map(el => el.textContent.trim())
    .filter(text => text.length > 20);
  
  // Extract author information
  const authorInfo = extractAuthorInfo(document);
  
  // Extract images
  const images = Array.from(document.querySelectorAll('img[src]'))
    .map(img => {
      const src = img.src;
      return src.startsWith('http') ? src : new URL(src, url).href;
    })
    .filter(src => src && !src.includes('data:'));
  
  // Extract logo
  const logo = extractLogo(document, url);
  
  return {
    questionHeadings,
    faqSections,
    authorInfo,
    images,
    logo,
    metadata
  };
}

/**
 * Generate schema recommendations
 */
function generateRecommendations(foundSchemas, contentData, url) {
  const recommendations = {
    article_jsonld: null,
    author_jsonld: null,
    faq_jsonld: null
  };
  
  // Generate Article/BlogPosting recommendation
  if (!foundSchemas.article.present || foundSchemas.article.issues.length > 0) {
    recommendations.article_jsonld = generateArticleSchema(contentData, url);
  }
  
  // Generate Author recommendation
  if (!foundSchemas.author.present || foundSchemas.author.issues.length > 0) {
    recommendations.author_jsonld = generateAuthorSchema(contentData);
  }
  
  // Generate FAQ recommendation
  if (!foundSchemas.faq.present || foundSchemas.faq.issues.length > 0) {
    recommendations.faq_jsonld = generateFAQSchema(contentData);
  }
  
  return recommendations;
}

/**
 * Generate Article/BlogPosting schema
 */
function generateArticleSchema(contentData, url) {
  const { metadata, images, logo } = contentData;
  
  // Determine if this is a blog post (prefer BlogPosting)
  const isBlog = /blog|post|article/i.test(url) || 
                 /blog|post|article/i.test(metadata.title) ||
                 /blog|post|article/i.test(metadata.description);
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': isBlog ? 'BlogPosting' : 'Article',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': metadata.canonical || url
    }
  };
  
  // Add headline
  if (metadata.title) {
    schema.headline = metadata.title;
  }
  
  // Add description
  if (metadata.description) {
    schema.description = metadata.description;
  }
  
  // Add image
  if (images.length > 0) {
    schema.image = images.slice(0, 3); // Max 3 images
  }
  
  // Add author
  if (metadata.author || contentData.authorInfo.name) {
    schema.author = {
      '@type': 'Person',
      name: metadata.author || contentData.authorInfo.name
    };
    
    if (contentData.authorInfo.url) {
      schema.author.url = contentData.authorInfo.url;
    }
    if (contentData.authorInfo.image) {
      schema.author.image = contentData.authorInfo.image;
    }
    if (contentData.authorInfo.sameAs && contentData.authorInfo.sameAs.length > 0) {
      schema.author.sameAs = contentData.authorInfo.sameAs;
    }
  }
  
  // Add publisher
  if (metadata.siteName || logo) {
    schema.publisher = {
      '@type': 'Organization',
      name: metadata.siteName || 'Website'
    };
    
    if (logo) {
      schema.publisher.logo = {
        '@type': 'ImageObject',
        url: logo
      };
    }
  }
  
  // Add dates
  if (metadata.publishDate) {
    schema.datePublished = metadata.publishDate;
  }
  if (metadata.modifiedDate) {
    schema.dateModified = metadata.modifiedDate;
  }
  
  // Add URL
  schema.url = url;
  
  return schema;
}

/**
 * Generate Author schema
 */
function generateAuthorSchema(contentData) {
  const { authorInfo } = contentData;
  
  if (!authorInfo.name) {
    return null;
  }
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': authorInfo.isOrganization ? 'Organization' : 'Person',
    name: authorInfo.name
  };
  
  if (authorInfo.url) {
    schema.url = authorInfo.url;
  }
  
  if (authorInfo.image) {
    if (authorInfo.isOrganization) {
      schema.logo = {
        '@type': 'ImageObject',
        url: authorInfo.image
      };
    } else {
      schema.image = authorInfo.image;
    }
  }
  
  if (authorInfo.sameAs && authorInfo.sameAs.length > 0) {
    schema.sameAs = authorInfo.sameAs;
  }
  
  return schema;
}

/**
 * Generate FAQ schema
 */
function generateFAQSchema(contentData) {
  const { questionHeadings, faqSections } = contentData;
  
  // Extract questions from headings
  const questions = questionHeadings.slice(0, 6); // Max 6 questions
  
  if (questions.length === 0) {
    return null;
  }
  
  const mainEntity = questions.map(question => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: `Answer to: ${question}` // In a real implementation, you'd extract actual answers
    }
  }));
  
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity
  };
}

/**
 * Identify missing fields
 */
function identifyMissingFields(foundSchemas, recommendations) {
  const missingFields = {
    article: [],
    author: [],
    faq: []
  };
  
  // Check article fields
  if (foundSchemas.article.present) {
    const article = foundSchemas.article.raw[0];
    if (!article.headline) missingFields.article.push('headline');
    if (!article.description) missingFields.article.push('description');
    if (!article.author) missingFields.article.push('author');
    if (!article.datePublished) missingFields.article.push('datePublished');
    if (!article.image) missingFields.article.push('image');
    if (!article.publisher) missingFields.article.push('publisher');
  } else {
    missingFields.article.push('headline', 'description', 'author', 'datePublished', 'image', 'publisher');
  }
  
  // Check author fields
  if (foundSchemas.author.present) {
    const author = foundSchemas.author.raw[0];
    if (!author.name) missingFields.author.push('name');
    if (!author.url) missingFields.author.push('url');
    if (!author.image && !author.logo) missingFields.author.push('image');
  } else {
    missingFields.author.push('name', 'url', 'image');
  }
  
  // Check FAQ fields
  if (foundSchemas.faq.present) {
    const faq = foundSchemas.faq.raw[0];
    if (!faq.mainEntity || !Array.isArray(faq.mainEntity) || faq.mainEntity.length === 0) {
      missingFields.faq.push('mainEntity');
    }
  } else {
    missingFields.faq.push('mainEntity');
  }
  
  return missingFields;
}

/**
 * Generate explanatory notes
 */
function generateNotes(foundSchemas, contentData, missingFields) {
  const notes = [];
  
  if (foundSchemas.article.present) {
    notes.push('Article schema found on page');
    if (foundSchemas.article.issues.length > 0) {
      notes.push(`Article schema issues: ${foundSchemas.article.issues.join(', ')}`);
    }
  } else {
    notes.push('No article schema found - recommendation provided');
  }
  
  if (foundSchemas.author.present) {
    notes.push('Author schema found on page');
    if (foundSchemas.author.issues.length > 0) {
      notes.push(`Author schema issues: ${foundSchemas.author.issues.join(', ')}`);
    }
  } else {
    notes.push('No author schema found - recommendation provided');
  }
  
  if (foundSchemas.faq.present) {
    notes.push('FAQ schema found on page');
    if (foundSchemas.faq.issues.length > 0) {
      notes.push(`FAQ schema issues: ${foundSchemas.faq.issues.join(', ')}`);
    }
  } else {
    notes.push('No FAQ schema found - recommendation provided');
  }
  
  if (missingFields.article.length > 0) {
    notes.push(`Missing article fields: ${missingFields.article.join(', ')}`);
  }
  
  if (missingFields.author.length > 0) {
    notes.push(`Missing author fields: ${missingFields.author.join(', ')}`);
  }
  
  if (missingFields.faq.length > 0) {
    notes.push(`Missing FAQ fields: ${missingFields.faq.join(', ')}`);
  }
  
  return notes;
}

// Helper functions
function extractMetaContent(document, property) {
  const meta = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
  return meta ? meta.getAttribute('content') : null;
}

function extractAuthor(document) {
  const authorMeta = extractMetaContent(document, 'author') || 
                    extractMetaContent(document, 'article:author');
  return authorMeta || '';
}

function extractAuthorInfo(document) {
  const authorInfo = {
    name: '',
    url: '',
    image: '',
    sameAs: [],
    isOrganization: false
  };
  
  // Try to find author name
  const authorMeta = extractMetaContent(document, 'author') || 
                    extractMetaContent(document, 'article:author');
  if (authorMeta) {
    authorInfo.name = authorMeta;
  }
  
  // Try to find author URL
  const authorLink = document.querySelector('a[rel="author"]');
  if (authorLink) {
    authorInfo.url = authorLink.href;
  }
  
  return authorInfo;
}

function extractLogo(document, baseUrl) {
  const logoSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'meta[property="og:image"]',
    'img[alt*="logo" i]',
    'img[class*="logo" i]'
  ];
  
  for (const selector of logoSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const url = element.href || element.content || element.src;
      if (url) {
        return url.startsWith('http') ? url : new URL(url, baseUrl).href;
      }
    }
  }
  
  return null;
}

function validateArticleSchema(schema) {
  const issues = [];
  const required = ['@context', '@type', 'headline', 'description', 'author', 'datePublished'];
  
  required.forEach(field => {
    if (!schema[field]) {
      issues.push(`Missing required field: ${field}`);
    }
  });
  
  return issues;
}

function validateAuthorSchema(schema) {
  const issues = [];
  
  if (!schema.name) {
    issues.push('Missing required field: name');
  }
  
  return issues;
}

function validateFAQSchema(schema) {
  const issues = [];
  
  if (!schema.mainEntity || !Array.isArray(schema.mainEntity) || schema.mainEntity.length === 0) {
    issues.push('Missing or empty mainEntity array');
  } else {
    schema.mainEntity.forEach((item, index) => {
      if (!item['@type'] || item['@type'] !== 'Question') {
        issues.push(`Item ${index} is not a Question`);
      }
      if (!item.name) {
        issues.push(`Item ${index} missing name`);
      }
      if (!item.acceptedAnswer || !item.acceptedAnswer.text) {
        issues.push(`Item ${index} missing acceptedAnswer`);
      }
    });
  }
  
  return issues;
}

module.exports = {
  extractAndRecommendSchema
};
