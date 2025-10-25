// (moved) Period Badges route defined after app/db initialization

// Load environment from .env (project root or backend/.env)

require('dotenv').config();

const express = require('express');

const cors = require('cors');

const path = require('path');

const { v4: uuidv4 } = require('uuid');

const Database = require('./database');

const AuthService = require('./auth');

const LocalAuthService = require('./localAuth');

const GoogleAuthService = require('./googleAuth');

const JSONStorage = require('./jsonStorage');

const MemoryStorage = require('./memoryStorage');

const EmailService = require('./emailService');

const emailVerificationService = require('./emailVerificationService');

const { LLMService, getGeminiEmbedding } = require('./llmService');

// const FanoutQueryDensity = require('./fanoutQueryDensity');

// const GEOFanoutDensity = require('./geoFanoutDensity');

const {

  getPerplexityAnswer,

  getPerplexityAnswersSelenium,

  getChatGPTAnswers,

  getChatGPTAnswersSelenium,

  getGeminiAnswersSelenium,

  getClaudeAnswersSelenium,

  getChatGPTAnswersRobust,

} = require('./browserAutomation');

const { compareAnswers } = require('./platformAutomation');

const CompetitorAnalysisService = require('./competitorAnalysis');

const CompetitorDiscoveryService = require('./competitorDiscovery');

const SmartCompetitorDiscoveryService = require('./smartCompetitorDiscovery');

const CitationAnalysisService = require('./citationAnalysis');

const WebsiteCrawler = require('./websiteCrawler');

// Webflow publisher (disabled)

// const { publishWebflowItem } = require('./publishers/webflowPublisher');

const crypto = require('crypto');



const axios = require('axios');

const fetch = require('node-fetch');

const unfluff = require('unfluff');

const aiVisibilityService = require('./aiVisibilityService');

const { JSDOM } = require('jsdom');

const { generateMetadata } = require('./metadataExtractor');



const app = express();

const PORT = process.env.PORT || 5000;



// Environment variable validation

console.log('🔐 [Server] Environment Configuration Check:');

console.log('🔐 [Server] AUTH_TYPE:', process.env.AUTH_TYPE || 'Not set (defaulting to azure)');

console.log('🔐 [Server] ENABLE_LOCAL_AUTH:', process.env.ENABLE_LOCAL_AUTH || 'Not set (defaulting to false)');

console.log('🔐 [Server] AZURE_CLIENT_ID:', process.env.AZURE_CLIENT_ID ? 'Configured' : 'Missing');

console.log('🔐 [Server] AZURE_TENANT_ID:', process.env.AZURE_TENANT_ID ? 'Configured' : 'Missing');

console.log('🔐 [Server] GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Missing');

console.log('🔐 [Server] JWT_SECRET:', process.env.JWT_SECRET ? 'Configured' : 'Missing');

console.log('🔐 [Server] DB_HOST:', process.env.DB_HOST || 'localhost');

console.log('🔐 [Server] DB_NAME:', process.env.DB_NAME || 'kabini_ai');



// Validate required environment variables

if (!process.env.JWT_SECRET) {

  console.error('❌ [Server] JWT_SECRET is not set. Authentication will fail.');

  console.error('❌ [Server] Please set JWT_SECRET in your .env file.');

}



if (process.env.AUTH_TYPE === 'azure' && (!process.env.AZURE_CLIENT_ID || !process.env.AZURE_TENANT_ID)) {

  console.error('❌ [Server] Azure authentication is enabled but AZURE_CLIENT_ID or AZURE_TENANT_ID is missing.');

  console.error('❌ [Server] Please configure Azure authentication or set AUTH_TYPE=local in your .env file.');

}



if (process.env.ENABLE_LOCAL_AUTH === 'true' && !process.env.JWT_SECRET) {

  console.error('❌ [Server] Local authentication is enabled but JWT_SECRET is missing.');

  console.error('❌ [Server] Please set JWT_SECRET in your .env file.');

}



// Initialize services

const db = new Database();

const authService = new AuthService();

const localAuthService = new LocalAuthService();

const googleAuthService = new GoogleAuthService();

const emailService = new EmailService();

const llmService = new LLMService();

const competitorAnalysisService = new CompetitorAnalysisService();

const competitorDiscoveryService = new CompetitorDiscoveryService();

const smartCompetitorDiscoveryService = new SmartCompetitorDiscoveryService();

const citationAnalysisService = new CitationAnalysisService();

const websiteCrawler = new WebsiteCrawler();





// Check authentication type

const AUTH_TYPE = process.env.AUTH_TYPE || 'azure';

const ENABLE_LOCAL_AUTH = process.env.ENABLE_LOCAL_AUTH === 'true';



console.log('ENABLE_LOCAL_AUTH:', process.env.ENABLE_LOCAL_AUTH);



// Middleware

app.use(cors());

app.use(express.json({ limit: '50mb' }));

app.use(express.urlencoded({ extended: true, limit: '50mb' }));



// Serve static files from public directory

app.use(express.static(path.join(__dirname, '../public')));



// Authentication middleware

const authenticateToken = async (req, res, next) => {

  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {

    console.warn('[Auth] No token provided for', req.originalUrl);

    return res.status(403).json({ error: 'No token provided' });

  }

  try {

    let user;

    if (AUTH_TYPE === 'local') {

      user = localAuthService.extractUserFromToken(token);

    } else {

      // Try to determine the token type and use appropriate service

      try {

        // First try Microsoft/Azure token

        user = authService.extractUserFromToken(token);

      } catch (azureError) {

        try {

          // If Azure fails, try Google token

          user = googleAuthService.extractUserFromToken(token);

        } catch (googleError) {

          // If both fail, throw the original error

          throw azureError;

        }

      }

    }

    

    // Verify user exists in database

    const dbUser = await db.getUserById(user.id);

    if (!dbUser) {

      return res.status(403).json({ error: 'User not found in database' });

    }

    

    req.user = user;

    next();

  } catch (err) {

    console.warn('[Auth] Invalid or expired token for', req.originalUrl, '-', err.message);

    return res.status(403).json({ error: 'Invalid or expired token' });

  }

};



// Initialize database connection

db.connect().catch(console.error);



// Create default admin user if local auth is enabled

if (ENABLE_LOCAL_AUTH) {

  db.connect().then(() => {

    localAuthService.createDefaultAdmin(db);

  }).catch(console.error);

}



// Health check endpoint

app.get('/api/health', (req, res) => {

  res.json({ 

    status: 'healthy', 

    timestamp: new Date().toISOString(),

    auth: AUTH_TYPE,

    localAuthEnabled: ENABLE_LOCAL_AUTH

  });

});

// Unified Cache Storage - Backend persistence for cross-page analysis
// In-memory store with 1-hour TTL and size limits
const unifiedAnalysisCache = new Map();
const CACHE_MAX_SIZE = 1000; // Max 1000 entries
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Auto-cleanup expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, value] of unifiedAnalysisCache.entries()) {
    if (value.expiresAt < now) {
      unifiedAnalysisCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[Unified Cache] Auto-cleaned ${cleaned} expired entries. Remaining: ${unifiedAnalysisCache.size}`);
  }
  
  // Also cleanup competitor cache
  if (global.competitorCache) {
    let competitorCleaned = 0;
    for (const [key, value] of global.competitorCache.entries()) {
      if (value.expiresAt < now) {
        global.competitorCache.delete(key);
        competitorCleaned++;
      }
    }
    if (competitorCleaned > 0) {
      console.log(`[Competitor Cache] Auto-cleaned ${competitorCleaned} expired entries. Remaining: ${global.competitorCache.size}`);
    }
  }
}, 10 * 60 * 1000);

// GET cached analysis
app.get('/api/unified-cache/:target', authenticateToken, async (req, res) => {
  try {
    const { target } = req.params;
    const normalizedKey = `${req.user.email}:${target.toLowerCase()}`;
    
    const cached = unifiedAnalysisCache.get(normalizedKey);
    
    if (!cached) {
      return res.json({ success: true, cached: null });
    }
    
    // Check if expired
    if (cached.expiresAt < Date.now()) {
      unifiedAnalysisCache.delete(normalizedKey);
      return res.json({ success: true, cached: null });
    }
    
    res.json({ success: true, cached });
  } catch (error) {
    console.error('[Unified Cache] GET error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST/PUT cached analysis
app.post('/api/unified-cache', authenticateToken, async (req, res) => {
  try {
    const { target, originalInput, page, data } = req.body;
    
    if (!target || !page || !data) {
      return res.status(400).json({ success: false, error: 'Missing required fields: target, page, data' });
    }
    
    const normalizedKey = `${req.user.email}:${target.toLowerCase()}`;
    const now = Date.now();
    
    // Get existing or create new
    let cached = unifiedAnalysisCache.get(normalizedKey);
    
    if (!cached) {
      cached = {
        target: target.toLowerCase(),
        targetOriginal: originalInput || target,
        userId: req.user.email,
        timestamp: now,
        expiresAt: now + CACHE_TTL_MS,
        dashboard: null,
        competitorInsight: null,
        productInsight: null
      };
    } else {
      // Update expiration
      cached.expiresAt = now + CACHE_TTL_MS;
    }
    
    // Update specific page data
    if (page === 'dashboard' || page === 'competitorInsight' || page === 'productInsight') {
      cached[page] = data;
    }
    
    unifiedAnalysisCache.set(normalizedKey, cached);
    
    // Size-based cleanup if over limit
    if (unifiedAnalysisCache.size > CACHE_MAX_SIZE) {
      // Remove oldest 10% of entries
      const entries = Array.from(unifiedAnalysisCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = Math.ceil(entries.length * 0.1);
      for (let i = 0; i < toRemove; i++) {
        unifiedAnalysisCache.delete(entries[i][0]);
      }
      console.log(`[Unified Cache] Size limit reached. Removed ${toRemove} oldest entries. New size: ${unifiedAnalysisCache.size}`);
    }
    
    res.json({ success: true, cached });
  } catch (error) {
    console.error('[Unified Cache] POST error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE cached analysis
app.delete('/api/unified-cache/:target', authenticateToken, async (req, res) => {
  try {
    const { target } = req.params;
    const normalizedKey = `${req.user.email}:${target.toLowerCase()}`;
    
    const deleted = unifiedAnalysisCache.delete(normalizedKey);
    
    res.json({ success: true, deleted });
  } catch (error) {
    console.error('[Unified Cache] DELETE error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET cache stats
app.get('/api/unified-cache-stats', authenticateToken, async (req, res) => {
  try {
    const now = Date.now();
    const allEntries = Array.from(unifiedAnalysisCache.values());
    const userEntries = allEntries.filter(e => e.userId === req.user.email);
    const validEntries = userEntries.filter(e => e.expiresAt > now);
    
    res.json({
      success: true,
      stats: {
        totalEntries: unifiedAnalysisCache.size,
        userEntries: userEntries.length,
        validUserEntries: validEntries.length,
        maxSize: CACHE_MAX_SIZE,
        ttlMinutes: CACHE_TTL_MS / 60000
      }
    });
  } catch (error) {
    console.error('[Unified Cache] STATS error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});



// Simple test endpoint for AI visibility

app.get('/api/ai-visibility/test', (req, res) => {

  res.json({

    success: true,

    data: {

      competitors: [

        {

          name: 'Test Competitor 1',

          mentions: 50,

          brandMentions: 30,

          citationCount: 100,

          totalScore: 8.5,

          aiScores: { gemini: 8.5, perplexity: 8.5, claude: 8.5, chatgpt: 8.5 },

          keyMetrics: {

            gemini: { mentionsCount: 50, brandMentions: 30 },

            perplexity: { mentionsCount: 50, brandMentions: 30 },

            claude: { mentionsCount: 50, brandMentions: 30 },

            chatgpt: { mentionsCount: 50, brandMentions: 30 }

          }

        }

      ]

    }

  });

});
// Local Authentication Routes

if (ENABLE_LOCAL_AUTH) {

  // Register new user

  app.post('/api/auth/register', async (req, res) => {

    try {

      const { email, password, name, displayName } = req.body;

      

      if (!email || !password || !name) {

        return res.status(400).json({ 

          error: 'Missing required fields: email, password, name' 

        });

      }



      // Validate email format

      if (!localAuthService.validateEmail(email)) {

        return res.status(400).json({ error: 'Invalid email format' });

      }



      // Validate email domain (check for disposable emails)

      const domainValidation = await emailVerificationService.validateEmailDomain(email);

      if (!domainValidation.valid) {

        return res.status(400).json({ error: domainValidation.error });

      }



      // Validate password

      if (!localAuthService.validatePassword(password)) {

        return res.status(400).json({ 

          error: 'Password must be at least 8 characters with uppercase, lowercase, and number' 

        });

      }



      // Check if user already exists

      const existingUser = await db.getUserByEmail(email);

      if (existingUser) {

        return res.status(409).json({ error: 'User already exists' });

      }



      // Hash password

      const hashedPassword = await localAuthService.hashPassword(password);

      

      // Create user with email_verified = false

      const userData = {

        id: uuidv4(),

        email,

        name,

        displayName: displayName || name,

        password: hashedPassword,

        roles: ['user'],

        isActive: true,

        emailVerified: false, // Email not verified initially

        createdAt: new Date().toISOString(),

        updatedAt: new Date().toISOString()

      };

      // Fallback path: basic ecommerce enrichment when clearly a product page
      try {
        const hasProductSchema = /"@type"\s*:\s*"Product"/i.test(fullPageHtml);
        const hasPrice = /(?:[$₹€£]|INR|USD|EUR|GBP)\s?\d[\d.,]*/i.test(fullPageHtml) || /product:price:amount/i.test(fullPageHtml);
        const hasAddToCart = /add to (cart|bag|basket)|buy now|checkout/i.test(fullPageHtml);
        if (hasProductSchema || (hasPrice && hasAddToCart)) {
          const h1Match = fullPageHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
          const name = (h1Match && h1Match[1]) || (pageTitle || '').trim();
          const currencyMatch = fullPageHtml.match(/product:price:currency[^>]*content=["']([^"']+)/i) || fullPageHtml.match(/(?:priceCurrency|currency)"?\s*[:=]\s*"([A-Z]{3})"/i);
          const amountMatch = fullPageHtml.match(/product:price:amount[^>]*content=["']([^"']+)/i) || fullPageHtml.match(/(?:price|priceAmount)"?\s*[:=]\s*"?([0-9][0-9.,]*)"?/i);
          const priceCurrency = (currencyMatch && currencyMatch[1]) || 'USD';
          const priceAmountRaw = (amountMatch && amountMatch[1]) || '';
          const priceNumeric = priceAmountRaw.replace(/[^0-9.]/g, '');
          if (name && priceNumeric) {
            structuredData.productSchema = {
              '@context': 'https://schema.org',
              '@type': 'Product',
              name,
              description: pageDescription || content.substring(0,160),
              offers: { '@type': 'Offer', price: priceNumeric, priceCurrency, url }
            };
          }
        }
      } catch (e) {
        console.warn('[Content Analysis] Fallback ecommerce enrichment failed:', e?.message);
      }

      

      await db.createUser(userData);

      

      // Generate email verification token

      const verificationToken = emailVerificationService.generateVerificationToken(email);

      const expiresAt = new Date();

      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

      

      // Save verification token to database

      await db.createEmailVerificationToken(userData.id, verificationToken, expiresAt.toISOString());

      

      // Send verification email

      try {

        const emailResult = await emailVerificationService.sendVerificationEmail(email, name, verificationToken);

        if (!emailResult.success) {

          console.error('❌ Failed to send verification email:', emailResult.error);

          // Don't fail registration, but log the error

        } else {

          console.log(`✅ Verification email sent to ${email}`);

        }

      } catch (emailError) {

        console.error('❌ Failed to send verification email:', emailError);

        // Don't fail registration if email fails

      }

      

      // Generate limited tokens (for unverified users)

      const accessToken = localAuthService.generateJWT({ ...userData, emailVerified: false });

      const refreshToken = localAuthService.generateRefreshToken(userData);

      

      // Calculate expiration time

      const tokenExpiresAt = new Date();

      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7);

      

      // Save session

      await db.saveUserSession(userData.id, refreshToken, tokenExpiresAt.toISOString());

      

      // Remove password from response

      const { password: _, ...userResponse } = userData;

      

      res.json({

        success: true,

        user: userResponse,

        accessToken,

        refreshToken,

        expiresAt: tokenExpiresAt.toISOString(),

        emailVerificationRequired: true,

        message: 'Account created successfully! Please check your email to verify your account.'

      });

      

    } catch (error) {

      console.error('Registration error:', error);

      res.status(500).json({ 

        error: 'Registration failed',

        details: error.message 

      });

    }

  });



  // Email verification endpoint

  app.post('/api/auth/verify-email', async (req, res) => {

    try {

      const { token } = req.body;

      

      if (!token) {

        return res.status(400).json({ error: 'Verification token is required' });

      }



      // Get user by verification token

      const user = await db.getUserByVerificationToken(token);

      if (!user) {

        return res.status(400).json({ error: 'Invalid or expired verification token' });

      }



      // Check if token is expired

      const now = new Date();

      const tokenExpiresAt = new Date(user.token_expires_at);

      if (now > tokenExpiresAt) {

        return res.status(400).json({ error: 'Verification token has expired' });

      }



      // Mark email as verified

      await db.updateEmailVerificationStatus(user.id, true);

      

      // Mark token as used

      await db.markEmailVerificationTokenAsUsed(token);

      

      console.log(`✅ Email verified for user: ${user.email}`);

      

      res.json({

        success: true,

        message: 'Email verified successfully! You can now access all features.',

        user: {

          id: user.id,

          email: user.email,

          name: user.name,

          displayName: user.display_name,

          emailVerified: true

        }

      });

      

    } catch (error) {

      console.error('Email verification error:', error);

      res.status(500).json({ 

        error: 'Email verification failed',

        details: error.message 

      });

    }

  });



  // Resend verification email endpoint

  app.post('/api/auth/resend-verification', async (req, res) => {

    try {

      const { email } = req.body;

      

      if (!email) {

        return res.status(400).json({ error: 'Email is required' });

      }



      // Get user by email

      const user = await db.getUserByEmail(email);

      if (!user) {

        return res.status(404).json({ error: 'User not found' });

      }



      if (user.email_verified) {

        return res.status(400).json({ error: 'Email is already verified' });

      }



      // Generate new verification token

      const verificationToken = emailVerificationService.generateVerificationToken(email);

      const expiresAt = new Date();

      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

      

      // Save verification token to database

      await db.createEmailVerificationToken(user.id, verificationToken, expiresAt.toISOString());

      

      // Send verification email

      try {

        const emailResult = await emailVerificationService.sendVerificationEmail(email, user.name, verificationToken);

        if (!emailResult.success) {

          console.error('❌ Failed to resend verification email:', emailResult.error);

          return res.status(500).json({ error: 'Failed to send verification email' });

        } else {

          console.log(`✅ Verification email resent to ${email}`);

        }

      } catch (emailError) {

        console.error('❌ Failed to resend verification email:', emailError);

        return res.status(500).json({ error: 'Failed to send verification email' });

      }

      

      res.json({

        success: true,

        message: 'Verification email sent successfully! Please check your inbox.'

      });

      

    } catch (error) {

      console.error('Resend verification error:', error);

      res.status(500).json({ 

        error: 'Failed to resend verification email',

        details: error.message 

      });

    }

  });



  // Local login

  app.post('/api/auth/local-login', async (req, res) => {

    try {

      const { email, password } = req.body;

      

      if (!email || !password) {

        return res.status(400).json({ 

          error: 'Missing required fields: email, password' 

        });

      }



      // Get user by email

      const user = await db.getUserByEmail(email);

      if (!user) {

        return res.status(401).json({ error: 'Invalid email or password. Please check your credentials and try again.' });

      }



      // Check if user is active

      if (!user.is_active) {

        return res.status(401).json({ error: 'Your account has been deactivated. Please contact support for assistance.' });

      }



      // Check if email is verified

      if (!user.email_verified) {

        return res.status(401).json({ 

          error: 'Please verify your email address before logging in. Check your inbox for a verification email.',

          emailVerificationRequired: true,

          email: user.email

        });

      }



      // Verify password

      const isValidPassword = await localAuthService.comparePassword(password, user.password);

      if (!isValidPassword) {

        return res.status(401).json({ error: 'Invalid email or password. Please check your credentials and try again.' });

      }



      // Update last login

      await db.updateUserLastLogin(user.id);

      

      // Generate tokens

      const accessToken = localAuthService.generateJWT(user);

      const refreshToken = localAuthService.generateRefreshToken(user);

      

      // Calculate expiration time

      const expiresAt = new Date();

      expiresAt.setDate(expiresAt.getDate() + 7);

      

      // Save session

      await db.saveUserSession(user.id, refreshToken, expiresAt.toISOString());

      

      // Remove password from response

      const { password: _, ...userResponse } = user;

      

      res.json({

        success: true,

        user: userResponse,

        accessToken,

        refreshToken,

        expiresAt: expiresAt.toISOString()

      });

      

    } catch (error) {

      console.error('Local login error:', error);

      res.status(401).json({ 

        error: 'Authentication failed. Please try again or contact support if the problem persists.',

        details: error.message 

      });

    }

  });

}
// Azure Authentication routes (existing)

app.post('/api/auth/login', async (req, res) => {

  try {

    console.log('🔐 [Server] ===== MICROSOFT LOGIN REQUEST STARTED =====');

    console.log('🔐 [Server] Request received at:', new Date().toISOString());

    console.log('🔐 [Server] Request headers:', req.headers);

    

    const { msalToken, clientId, tenantId } = req.body;

    

    console.log('🔐 [Server] Request body parsed:', {

      hasMsalToken: !!msalToken,

      hasClientId: !!clientId,

      hasTenantId: !!tenantId,

      clientId: clientId,

      tenantId: tenantId,

      msalTokenLength: msalToken?.length,

      msalTokenPreview: msalToken ? msalToken.substring(0, 20) + '...' : 'N/A'

    });

    

    if (!msalToken || !clientId || !tenantId) {

      console.log('❌ [Server] Missing required fields:', {

        hasMsalToken: !!msalToken,

        hasClientId: !!clientId,

        hasTenantId: !!tenantId

      });

      return res.status(400).json({ 

        error: 'Missing required fields: msalToken, clientId, tenantId' 

      });

    }



    console.log('✅ [Server] All required fields present, processing Microsoft login request...');

    

    // For access tokens, we skip JWT validation and use the token directly

    // to call Microsoft Graph API

    console.log('🔐 [Server] About to call Microsoft Graph API with access token...');

    

    let userInfo;

    try {

      // Get user info from Microsoft Graph API using the access token

      console.log('🔐 [Server] Calling authService.getUserInfo()...');

      userInfo = await authService.getUserInfo(msalToken);

      console.log('✅ [Server] User info retrieved successfully from Microsoft Graph:', {

        id: userInfo.id,

        email: userInfo.mail || userInfo.userPrincipalName,

        name: userInfo.displayName,

        givenName: userInfo.givenName,

        surname: userInfo.surname,

        userPrincipalName: userInfo.userPrincipalName

      });

    } catch (graphError) {

      console.error('❌ [Server] Microsoft Graph API error:', graphError);

      console.error('❌ [Server] Graph error details:', {

        message: graphError.message,

        stack: graphError.stack

      });

      return res.status(401).json({ 

        error: 'Failed to get user information from Microsoft',

        details: graphError.message 

      });

    }

    

    // Create or update user in our database

    console.log('🔐 [Server] Creating user data object...');

    const userData = {

      id: userInfo.id,

      email: userInfo.mail || userInfo.userPrincipalName,

      name: userInfo.givenName + ' ' + userInfo.surname,

      displayName: userInfo.displayName,

      tenantId: tenantId, // Use the provided tenant ID

      roles: ['user'] // Default role, can be enhanced with role mapping

    };

    

    console.log('🔐 [Server] User data object created:', userData);

    console.log('🔐 [Server] About to create/update user in database...');

    

    await db.createOrUpdateUser(userData);

    console.log('✅ [Server] User created/updated in database successfully');

    

    // Generate our application tokens

    console.log('🔐 [Server] Generating application JWT tokens...');

    const accessToken = authService.generateJWT(userData);

    const refreshToken = authService.generateRefreshToken(userData);

    

    console.log('🔐 [Server] Tokens generated:', {

      hasAccessToken: !!accessToken,

      hasRefreshToken: !!refreshToken,

      accessTokenLength: accessToken?.length,

      refreshTokenLength: refreshToken?.length

    });

    

    // Calculate expiration time (7 days from now)

    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + 7);

    

    console.log('🔐 [Server] Token expiration calculated:', expiresAt.toISOString());

    

    // Save refresh token to database

    console.log('🔐 [Server] About to save user session to database...');

    await db.saveUserSession(userData.id, refreshToken, expiresAt.toISOString());

    console.log('✅ [Server] User session saved to database successfully');

    

    console.log('🔐 [Server] Preparing response for frontend...');

    const responseData = {

      success: true,

      user: userData,

      accessToken,

      refreshToken,

      expiresAt: expiresAt.toISOString()

    };

    

    console.log('✅ [Server] Response data prepared:', {

      success: responseData.success,

      hasUser: !!responseData.user,

      hasAccessToken: !!responseData.accessToken,

      hasRefreshToken: !!responseData.refreshToken,

      hasExpiresAt: !!responseData.expiresAt,

      userEmail: responseData.user?.email

    });

    

    console.log('🔐 [Server] ===== MICROSOFT LOGIN REQUEST COMPLETED SUCCESSFULLY =====');

    res.json(responseData);

    

  } catch (error) {

    console.error('❌ [Server] ===== MICROSOFT LOGIN REQUEST FAILED =====');

    console.error('❌ [Server] Login error:', error);

    console.error('❌ [Server] Error details:', {

      message: error.message,

      stack: error.stack,

      name: error.name

    });

    res.status(401).json({ 

      error: 'Authentication failed',

      details: error.message 

    });

  }

});



// Google OAuth Authentication route

app.post('/api/auth/google-login', async (req, res) => {

  try {

    const { idToken, accessToken, userInfo } = req.body;

    

    let googleUser;

    

    // Handle both ID token and access token approaches

    if (idToken) {

      // Verify the Google ID token

      googleUser = await googleAuthService.verifyGoogleToken(idToken);

    } else if (accessToken && userInfo) {

      // Verify the Google access token

      googleUser = await googleAuthService.verifyGoogleAccessToken(accessToken);

    } else {

      return res.status(400).json({ 

        error: 'Missing required fields: either idToken OR (accessToken and userInfo)' 

      });

    }

    

    // Create or update user in our database

    const userData = {

      id: googleUser.userId,

      email: googleUser.email,

      name: googleUser.name,

      displayName: googleUser.displayName,

      picture: googleUser.picture,

      provider: 'google',

      roles: ['user'] // Default role

    };

    

    await db.createOrUpdateUser(userData);

    

    // Generate our application tokens

    const appAccessToken = googleAuthService.generateJWT(googleUser);

    const refreshToken = googleAuthService.generateRefreshToken(googleUser);

    

    // Calculate expiration time (7 days from now)

    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + 7);

    

    // Save refresh token to database

    await db.saveUserSession(userData.id, refreshToken, expiresAt.toISOString());

    

    res.json({

      success: true,

      user: userData,

      accessToken: appAccessToken,

      refreshToken,

      expiresAt: expiresAt.toISOString()

    });

    

  } catch (error) {

    console.error('Google login error:', error);

    res.status(401).json({ 

      error: 'Google authentication failed',

      details: error.message 

    });

  }

});



app.post('/api/auth/refresh', async (req, res) => {

  try {

    const { refreshToken } = req.body;

    

    if (!refreshToken) {

      return res.status(400).json({ error: 'Refresh token required' });

    }

    

    // Verify refresh token

    const decoded = authService.verifyRefreshToken(refreshToken);

    

    // Get user session from database

    const userSession = await db.getUserSessionByRefreshToken(refreshToken);

    

    if (!userSession) {

      return res.status(401).json({ error: 'Invalid refresh token' });

    }

    

    // Get user data

    const user = await db.getUserById(decoded.userId);

    

    if (!user) {

      return res.status(401).json({ error: 'User not found' });

    }

    

    // Generate new tokens

    const newAccessToken = authService.generateJWT(user);

    const newRefreshToken = authService.generateRefreshToken(user);

    

    // Calculate new expiration time

    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + 7);

    

    // Delete old session and save new one

    await db.deleteUserSession(refreshToken);

    await db.saveUserSession(user.id, newRefreshToken, expiresAt.toISOString());

    

    res.json({

      success: true,

      accessToken: newAccessToken,

      refreshToken: newRefreshToken,

      expiresAt: expiresAt.toISOString()

    });

    

  } catch (error) {

    console.error('Token refresh error:', error);

    res.status(401).json({ 

      error: 'Token refresh failed',

      details: error.message 

    });

  }

});



app.post('/api/auth/logout', authenticateToken, async (req, res) => {

  try {

    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1];

    

    // In a real implementation, you might want to blacklist the token

    // For now, we'll just return success

    res.json({ success: true, message: 'Logged out successfully' });

    

  } catch (error) {

    console.error('Logout error:', error);

    res.status(500).json({ 

      error: 'Logout failed',

      details: error.message 

    });

  }

});



app.get('/api/auth/me', authenticateToken, async (req, res) => {

  try {

    const user = await db.getUserById(req.user.id);

    

    if (!user) {

      return res.status(404).json({ error: 'User not found' });

    }

    

    res.json({

      id: user.id,

      email: user.email,

      name: user.name,

      displayName: user.display_name,

      tenantId: user.tenant_id,

      roles: user.roles,

      isActive: user.is_active,

      lastLoginAt: user.last_login_at,

      createdAt: user.created_at,

      updatedAt: user.updated_at

    });

    

  } catch (error) {

    console.error('[Auth /me] Error:', error);

    res.status(403).json({ error: 'Forbidden', details: error.message });

  }

});



// Protected session routes

app.post('/api/sessions', authenticateToken, async (req, res) => {

  try {

    const sessionData = req.body;

    

    // Validate required fields

    if (!sessionData.id || !sessionData.name || !sessionData.type) {

      return res.status(400).json({ 

        error: 'Missing required fields: id, name, type' 

      });

    }



    // Add user ID to session data

    sessionData.userId = req.user.id;



    // Generate embeddings for Q&A pairs if they exist

    // if (sessionData.qaData && Array.isArray(sessionData.qaData) && sessionData.qaData.length > 0) {

    //   console.log(`[Embeddings] Generating embeddings for ${sessionData.qaData.length} Q&A pairs`);

    //   

    //   for (let i = 0; i < sessionData.qaData.length; i++) {

    //     const qa = sessionData.qaData[i];

    //     

    //     try {

    //       // Generate question embedding

    //       if (qa.question) {

    //         console.log(`[Embeddings] Generating question embedding for: ${qa.question.substring(0, 50)}...`);

    //         qa.questionEmbedding = await getGeminiEmbedding(qa.question);

    //       }

    //       

    //       // Generate answer embedding

    //       if (qa.answer) {

    //         console.log(`[Embeddings] Generating answer embedding for: ${qa.answer.substring(0, 50)}...`);

    //         qa.embedding = await getGeminiEmbedding(qa.answer);

    //       }

    //     } catch (error) {

    //       console.error(`[Embeddings] Failed to generate embedding for Q&A pair ${i}:`, error);

    //       // Continue with other Q&A pairs even if one fails

    //     }

    //   }

    //   

    //   console.log(`[Embeddings] Completed embedding generation for session`);

    // }



    // Save to database

    const savedId = await db.saveSession(sessionData);

    

    res.status(201).json({ 

      success: true, 

      sessionId: savedId,

      message: 'Session saved successfully' 

    });

  } catch (error) {

    console.error('Error saving session:', error);

    res.status(500).json({ 

      error: 'Failed to save session',

      details: error.message 

    });

  }

});
app.get('/api/sessions/:type', authenticateToken, async (req, res) => {

  try {

    const { type } = req.params;

    const { 

      fromDate, 

      toDate, 

      llmProvider, 

      llmModel, 

      blogLink,

      search 

    } = req.query;

    

    if (!['question', 'answer'].includes(type)) {

      return res.status(400).json({ 

        error: 'Invalid session type. Must be "question" or "answer"' 

      });

    }



    // Build filter object

    const filters = {

      fromDate: fromDate || null,

      toDate: toDate || null,

      llmProvider: llmProvider || null,

      llmModel: llmModel || null,

      blogLink: blogLink || null,

      search: search || null

    };



    const sessions = await db.getSessionsByTypeWithFilters(type, req.user.id, filters);

    

    res.json({ 

      success: true, 

      sessions,

      filters,

      totalCount: sessions.length

    });

  } catch (error) {

    console.error('Error fetching sessions:', error);

    res.status(500).json({ 

      error: 'Failed to fetch sessions',

      details: error.message 

    });

  }

});



app.get('/api/sessions/:type/:id', authenticateToken, async (req, res) => {

  try {

    const { id } = req.params;

    

    const session = await db.getSessionById(id, req.user.id);

    

    if (!session) {

      return res.status(404).json({ 

        error: 'Session not found' 

      });

    }



    res.json({ 

      success: true, 

      session 

    });

  } catch (error) {

    console.error('Error fetching session:', error);

    res.status(500).json({ 

      error: 'Failed to fetch session',

      details: error.message 

    });

  }

});



app.delete('/api/sessions/:id', authenticateToken, async (req, res) => {

  try {

    const { id } = req.params;

    

    const deleted = await db.deleteSession(id, req.user.id);

    

    if (!deleted) {

      return res.status(404).json({ 

        error: 'Session not found' 

      });

    }



    res.json({ 

      success: true, 

      message: 'Session deleted successfully' 

    });

  } catch (error) {

    console.error('Error deleting session:', error);

    res.status(500).json({ 

      error: 'Failed to delete session',

      details: error.message 

    });

  }

});



// Get session statistics

app.get('/api/stats/:type', authenticateToken, async (req, res) => {

  try {

    const { type } = req.params;

    

    if (!['question', 'answer'].includes(type)) {

      return res.status(400).json({ 

        error: 'Invalid session type. Must be "question" or "answer"' 

      });

    }



    const count = await db.getSessionCount(type, req.user.id);

    const sessions = await db.getSessionsByType(type, req.user.id);

    

    // Calculate additional statistics

    const totalCost = sessions.reduce((sum, session) => {

      return sum + parseFloat(session.statistics.totalCost || 0);

    }, 0);



    const totalQuestions = sessions.reduce((sum, session) => {

      return sum + (session.statistics.totalQuestions || 0);

    }, 0);



    res.json({ 

      success: true, 

      stats: {

        totalSessions: count,

        totalCost: totalCost.toFixed(8),

        totalQuestions,

        averageQuestionsPerSession: count > 0 ? (totalQuestions / count).toFixed(1) : 0

      }

    });

  } catch (error) {

    console.error('Error fetching statistics:', error);

    res.status(500).json({ 

      error: 'Failed to fetch statistics',

      details: error.message 

    });

  }

});



// Migrate localStorage data to backend

app.post('/api/migrate', authenticateToken, async (req, res) => {

  try {

    const { sessions } = req.body;

    

    if (!sessions || !Array.isArray(sessions)) {

      return res.status(400).json({ 

        error: 'Invalid sessions data' 

      });

    }



    // Add user ID to all sessions

    const sessionsWithUserId = Object.values(sessions).map(session => ({

      ...session,

      userId: req.user.id

    }));



    const result = await db.bulkSaveSessions(sessionsWithUserId);

    

    res.json({

      success: result.success,

      summary: result.summary,

      results: result.results

    });

  } catch (error) {

    console.error('Migration error:', error);

    res.status(500).json({ 

      error: 'Migration failed',

      details: error.message 

    });

  }

});



// Bulk save sessions endpoint

app.post('/api/sessions/bulk', authenticateToken, async (req, res) => {

  try {

    const { sessions } = req.body;

    

    if (!sessions || !Array.isArray(sessions)) {

      return res.status(400).json({ 

        error: 'Invalid sessions data' 

      });

    }



    // Add user ID to all sessions

    const sessionsWithUserId = sessions.map(session => ({

      ...session,

      userId: req.user.id

    }));



    const result = await db.bulkSaveSessions(sessionsWithUserId);

    

    res.json({

      success: result.success,

      summary: result.summary,

      results: result.results

    });

  } catch (error) {

    console.error('Bulk save error:', error);

    res.status(500).json({ 

      error: 'Bulk save failed',

      details: error.message 

    });

  }

});



// Export sessions to CSV

app.get('/api/export/:type/csv', authenticateToken, async (req, res) => {

  try {

    const { type } = req.params;

    

    if (!['question', 'answer'].includes(type)) {

      return res.status(400).json({ 

        error: 'Invalid session type. Must be "question" or "answer"' 

      });

    }



    const sessions = await db.getSessionsByType(type, req.user.id);

    

    if (sessions.length === 0) {

      return res.status(404).json({ 

        error: 'No sessions found to export' 

      });

    }



    const csvContent = generateCSV(sessions);

    

    res.setHeader('Content-Type', 'text/csv');

    res.setHeader('Content-Disposition', `attachment; filename="${type}-sessions-${new Date().toISOString().split('T')[0]}.csv"`);

    res.send(csvContent);

    

  } catch (error) {

    console.error('Export error:', error);

    res.status(500).json({ 

      error: 'Export failed',

      details: error.message 

    });

  }

});



// Helper function to generate CSV

function generateCSV(sessions) {

  const headers = [

    'Session ID', 'Name', 'Type', 'Timestamp', 'Model', 'Question Provider', 'Question Model', 

    'Answer Provider', 'Answer Model', 'Blog URL', 'Source URLs', 'Crawl Mode', 'Crawled Pages Count',

    'Total Questions', 'Total Cost', 'Question', 'Answer', 'Accuracy', 'Sentiment',

    'Input Tokens', 'Output Tokens', 'Cost'

  ];



  const rows = [headers.join(',')];



  sessions.forEach(session => {

    session.qaData.forEach(qa => {

      const row = [

        `"${session.id}"`,

        `"${session.name}"`,

        `"${session.type}"`,

        `"${session.timestamp}"`,

        `"${session.model}"`,

        `"${session.questionProvider || ''}"`,

        `"${session.questionModel || ''}"`,

        `"${session.answerProvider || ''}"`,

        `"${session.answerModel || ''}"`,

        `"${session.blogUrl || ''}"`,

        `"${session.sourceUrls ? session.sourceUrls.join('; ') : ''}"`,

        `"${session.crawlMode || ''}"`,

        session.crawledPages ? session.crawledPages.length : 0,

        session.statistics.totalQuestions,

        session.statistics.totalCost,

        `"${qa.question.replace(/"/g, '""')}"`,

        `"${(qa.answer || '').replace(/"/g, '""')}"`,

        qa.accuracy || '',

        `"${qa.sentiment || ''}"`,

        qa.inputTokens || 0,

        qa.outputTokens || 0,

        qa.cost || 0

      ];

      rows.push(row.join(','));

    });

  });



  return rows.join('\n');

}



// Email API endpoints

app.post('/api/email/test', authenticateToken, async (req, res) => {

  try {

    const result = await emailService.testEmailConfiguration();

    

    if (result.success) {

      res.json({ 

        success: true, 

        message: 'Test email sent successfully',

        messageId: result.messageId

      });

    } else {

      res.status(400).json({ 

        success: false, 

        error: result.error 

      });

    }

  } catch (error) {

    console.error('Email test error:', error);

    res.status(500).json({ 

      error: 'Failed to send test email',

      details: error.message 

    });

  }

});



app.post('/api/email/crawl-completion', authenticateToken, async (req, res) => {

  try {

    const { crawlData } = req.body;

    const userEmail = req.user.email;

    

    if (!crawlData) {

      return res.status(400).json({ 

        error: 'Missing crawl data' 

      });

    }



    const result = await emailService.sendCrawlCompletionEmail(userEmail, crawlData);

    

    if (result.success) {

      res.json({ 

        success: true, 

        message: 'Crawl completion email sent successfully',

        messageId: result.messageId

      });

    } else {

      res.status(400).json({ 

        success: false, 

        error: result.error 

      });

    }

  } catch (error) {

    console.error('Crawl completion email error:', error);

    res.status(500).json({ 

      error: 'Failed to send crawl completion email',

      details: error.message 

    });

  }

});



app.post('/api/email/crawl-error', authenticateToken, async (req, res) => {

  try {

    const { errorData } = req.body;

    const userEmail = req.user.email;

    

    if (!errorData) {

      return res.status(400).json({ 

        error: 'Missing error data' 

      });

    }



    const result = await emailService.sendErrorEmail(userEmail, errorData);

    

    if (result.success) {

      res.json({ 

        success: true, 

        message: 'Error email sent successfully',

        messageId: result.messageId

      });

    } else {

      res.status(400).json({ 

        success: false, 

        error: result.error 

      });

    }

  } catch (error) {

    console.error('Error email error:', error);

    res.status(500).json({ 

      error: 'Failed to send error email',

      details: error.message 

    });

  }

});



// LLM API endpoints

app.get('/api/llm/providers', async (req, res) => {

  try {

    const configuredProviders = llmService.getConfiguredProviders();

    const availableModels = llmService.getAvailableModels();

    

    res.json({

      success: true,

      configuredProviders,

      availableModels

    });

  } catch (error) {

    console.error('LLM providers error:', error);

    res.status(500).json({ 

      error: 'Failed to get LLM providers',

      details: error.message 

    });

  }

});
app.post('/api/llm/generate-questions', authenticateToken, async (req, res) => {

  try {

    const { content, questionCount, provider, model } = req.body;

    

    if (!content || !questionCount || !provider || !model) {

      return res.status(400).json({ 

        error: 'Missing required fields: content, questionCount, provider, model' 

      });

    }



    if (!llmService.isProviderConfigured(provider)) {

      return res.status(400).json({ 

        error: `Provider ${provider} is not configured` 

      });

    }



    const prompt = `Generate exactly ${questionCount} questions based on the following blog content. Each question must be extremely relevant to the content—so relevant that it would receive a relevance score of 95 or higher out of 100, where 100 means the question is directly about the main topics, facts, or ideas in the blog content. Only generate questions that are clearly and strongly related to the blog content. Avoid questions that are only loosely related or require outside knowledge. Blog Content: ${content} List the ${questionCount} questions, each on a new line starting with "Q:".`;



    let result;

    try {

      result = await llmService.callLLM(prompt, provider, model, true);

    } catch (e) {

      console.error('[Questions] Primary provider failed:', e?.message || e);

      return res.status(503).json({

        error: 'Question generation is temporarily unavailable. Please try a different provider or try again shortly.',

        details: e?.message || String(e)

      });

    }

    

    // Parse questions from the result

    const questions = result.text.split('\n')

      .filter(line => line.trim().startsWith('Q:'))

      .map(line => line.replace(/^Q:\s*/, '').trim())

      .filter(q => q.length > 0)

      .slice(0, questionCount);



    res.json({

      success: true,

      questions,

      provider: result.provider,

      model: result.model,

      inputTokens: result.inputTokens,

      outputTokens: result.outputTokens

    });

    

  } catch (error) {

    console.error('Question generation error:', error);

    res.status(500).json({ 

      error: 'Failed to generate questions',

      details: error.message 

    });

  }

});



app.post('/api/llm/calculate-confidence', authenticateToken, async (req, res) => {

  try {

    const { question, content, provider, model } = req.body;

    

    if (!question || !content || !provider || !model) {

      return res.status(400).json({ 

        error: 'Missing required fields: question, content, provider, model' 

      });

    }



    const result = await llmService.calculateConfidence(question, content, provider, model);

    

    res.json({

      success: true,

      confidence: result.confidence,

      reasoning: result.reasoning,

      inputTokens: result.inputTokens,

      outputTokens: result.outputTokens,

      provider: result.provider,

      model: result.model

    });

    

  } catch (error) {

    console.error('Confidence calculation error:', error);

    res.status(500).json({ 

      error: 'Failed to calculate confidence',

      details: error.message 

    });

  }

});



app.post('/api/llm/generate-answers', authenticateToken, async (req, res) => {

  try {

    const { content, questions, provider, model } = req.body;

    

    if (!content || !questions || !Array.isArray(questions) || !provider || !model) {

      return res.status(400).json({ 

        error: 'Missing required fields: content, questions (array), provider, model' 

      });

    }



    if (!llmService.isProviderConfigured(provider)) {

      return res.status(400).json({ 

        error: `Provider ${provider} is not configured` 

      });

    }



    const answers = [];

    let totalInputTokens = 0;

    let totalOutputTokens = 0;



    for (const question of questions) {

      const answerPrompt = `Based on the following content, provide a comprehensive and accurate answer to the question.



Content:

${content}



Question: ${question}



Answer:`;



      const result = await llmService.callLLM(answerPrompt, provider, model, false);

      

      answers.push({

        question,

        answer: result.text.trim(),

        inputTokens: result.inputTokens,

        outputTokens: result.outputTokens,

        provider: result.provider,

        model: result.model

      });



      totalInputTokens += result.inputTokens;

      totalOutputTokens += result.outputTokens;



      // Track GEO Fanout Density for each question

      // try {

      //   const geoFanoutAnalyzer = new GEOFanoutDensity();

      //   const fanoutAnalysis = await geoFanoutAnalyzer.trackFanoutQueries(

      //     req.user.id, question, content, provider, model

      //   );

        

      //   if (fanoutAnalysis.success) {

      //     console.log(`[GEO Fanout] Tracked fanout density for question: ${question.substring(0, 50)}...`);

      //     // Store fanout analysis with the answer for later reference

      //     answers[answers.length - 1].fanoutAnalysis = fanoutAnalysis;

      //   }

      // } catch (fanoutError) {

      //   console.error('[GEO Fanout] Failed to track fanout for question:', fanoutError);

      // }

    }



    res.json({

      success: true,

      answers,

      provider,

      model,

      totalInputTokens,

      totalOutputTokens

    });

    

  } catch (error) {

    console.error('Answer generation error:', error);

    res.status(500).json({ 

      error: 'Failed to generate answers',

      details: error.message 

    });

  }

});



// Compare two questions for similarity

app.post('/api/llm/compare-questions', authenticateToken, async (req, res) => {

  try {

    const { question1, question2, provider, model } = req.body;

    

    if (!question1 || !question2 || !provider || !model) {

      return res.status(400).json({ 

        error: 'Missing required fields: question1, question2, provider, model' 

      });

    }



    const result = await llmService.compareQuestions(question1, question2, provider, model);

    

    res.json({

      success: true,

      similarity: result.similarity,

      reasoning: result.reasoning,

      inputTokens: result.inputTokens,

      outputTokens: result.outputTokens,

      provider: result.provider,

      model: result.model

    });

    

  } catch (error) {

    console.error('Question comparison error:', error);

    res.status(500).json({ 

      error: 'Failed to compare questions',

      details: error.message 

    });

  }

});



// Cleanup expired sessions periodically

setInterval(async () => {

  try {

    const deletedCount = await db.deleteExpiredUserSessions();

    if (deletedCount > 0) {

      console.log(`Cleaned up ${deletedCount} expired user sessions`);

    }

  } catch (error) {

    console.error('Error cleaning up expired sessions:', error);

  }

}, 24 * 60 * 60 * 1000); // Run every 24 hours



// Check for relevant questions across different LLMs

app.post('/api/questions/check-relevance', authenticateToken, async (req, res) => {

  try {

    const { sourceUrls, blogUrl, questionText, currentProvider, currentModel } = req.body;

    

    if (!sourceUrls && !blogUrl) {

      return res.status(400).json({ 

        error: 'Source URLs or blog URL is required' 

      });

    }



    // Get all question sessions for the same source URLs or blog URL

    let query = `

      SELECT s.*, ss.total_questions, ss.avg_accuracy, ss.total_cost

      FROM sessions s

      LEFT JOIN session_statistics ss ON s.id = ss.session_id

      WHERE s.type = 'question' AND s.user_id = ?

    `;



    const params = [req.user.id];

    const conditions = [];



    // Filter by source URLs or blog URL

    if (sourceUrls && sourceUrls.length > 0) {

      conditions.push(`(

        s.source_urls LIKE ? OR 

        s.blog_url IN (${sourceUrls.map(() => '?').join(',')})

      )`);

      params.push(`%${sourceUrls[0]}%`); // Search for first URL in JSON

      sourceUrls.forEach(url => params.push(url));

    } else if (blogUrl) {

      conditions.push('s.blog_url = ?');

      params.push(blogUrl);

    }



    if (conditions.length > 0) {

      query += ' AND ' + conditions.join(' AND ');

    }



    query += ' ORDER BY s.timestamp DESC';



    const sessions = await new Promise((resolve, reject) => {

      db.db.all(query, params, async (err, rows) => {

        if (err) {

          reject(err);

          return;

        }



        try {

          const sessions = [];

          for (const row of rows) {

            const qaData = await db.getQADataBySessionId(row.id);

            sessions.push({

              id: row.id,

              name: row.name,

              type: row.type,

              timestamp: row.timestamp,

              model: row.model,

              questionProvider: row.question_provider,

              questionModel: row.question_model,

              answerProvider: row.answer_provider,

              answerModel: row.answer_model,

              blogContent: row.blog_content,

              blogUrl: row.blog_url,

              sourceUrls: row.source_urls ? JSON.parse(row.source_urls) : undefined,

              crawlMode: row.crawl_mode,

              crawledPages: row.crawled_pages ? JSON.parse(row.crawled_pages) : undefined,

              totalInputTokens: row.total_input_tokens,

              totalOutputTokens: row.total_output_tokens,

              qaData,

              statistics: {

                totalQuestions: row.total_questions,

                avgAccuracy: row.avg_accuracy,

                totalCost: row.total_cost

              }

            });

          }

          resolve(sessions);

        } catch (error) {

          reject(error);

        }

      });

    });



    // Filter out sessions from the same provider/model as current

    // const otherProviderSessions = sessions.filter(session => 

    //   session.questionProvider !== currentProvider || session.questionModel !== currentModel

    // );

    // Instead, include all sessions for the URL

    const otherProviderSessions = sessions;



    if (otherProviderSessions.length === 0) {

      return res.json({

        success: true,

        relevantQuestions: [],

        message: 'No questions found from other LLM providers for this content'

      });

    }



    // Debug: Log number of sessions found

    console.log(`[DEBUG] Found ${sessions.length} sessions for relevant question check.`);



    // Use Gemini 1.5 Flash for all relevance checks

    const relevantQuestions = [];

    let totalQuestionsChecked = 0;

    

    for (const session of otherProviderSessions) {

      for (const qa of session.qaData) {

        totalQuestionsChecked++;

        try {

          // Use Gemini 1.5 Flash for all relevance checks

          const relevanceResult = await llmService.checkQuestionRelevance(

            questionText,

            qa.question,

            "gemini",

            "gemini-2.0-flash"

          );

          // Debug: Log each relevance result

          console.log(`[DEBUG] Checked relevance: [Current] "${questionText}" vs [Session] "${qa.question}" => Score: ${relevanceResult.relevanceScore}, Reason: ${relevanceResult.reasoning}`);



          if (relevanceResult.relevanceScore >= 0.7) { // 70% threshold for relevance

            // Determine similarity group based on relevance score

            let similarityGroup = 'other';

            if (relevanceResult.relevanceScore >= 0.9) {

              similarityGroup = 'highly-similar';

            } else if (relevanceResult.relevanceScore >= 0.8) {

              similarityGroup = 'very-similar';

            } else if (relevanceResult.relevanceScore >= 0.7) {

              similarityGroup = 'similar';

            } else if (relevanceResult.relevanceScore >= 0.6) {

              similarityGroup = 'related';

            }



            relevantQuestions.push({

              question: qa.question,

              originalProvider: session.questionProvider,

              originalModel: session.questionModel,

              sessionName: session.name,

              sessionTimestamp: session.timestamp,

              relevanceScore: relevanceResult.relevanceScore,

              relevanceReasoning: relevanceResult.reasoning,

              sourceUrls: session.sourceUrls,

              blogUrl: session.blogUrl,

              similarityGroup: similarityGroup

            });

          }

        } catch (error) {

          console.error('Error checking question relevance:', error);

          // Continue with other questions even if one fails

        }

      }

    }

    // Debug: Log total questions checked and relevant questions found

    console.log(`[DEBUG] Total questions checked: ${totalQuestionsChecked}`);

    console.log(`[DEBUG] Relevant questions found: ${relevantQuestions.length}`);



    // Sort by relevance score (highest first)

    relevantQuestions.sort((a, b) => b.relevanceScore - a.relevanceScore);



    res.json({

      success: true,

      relevantQuestions,

      totalChecked: otherProviderSessions.reduce((sum, s) => sum + s.qaData.length, 0),

      message: `Found ${relevantQuestions.length} relevant questions from other LLM providers`

    });



  } catch (error) {

    console.error('Error checking question relevance:', error);

    res.status(500).json({ 

      error: 'Failed to check question relevance',

      details: error.message 

    });

  }

});



app.post('/api/ask', async (req, res) => {

  const { provider, question } = req.body;

  if (provider === 'perplexity') {

    try {

      const answer = await getPerplexityAnswer(question);

      res.json({ answer });

    } catch (error) {

      res.status(500).json({ error: error.message });

    }

  } else {

    res.status(400).json({ error: 'Unsupported provider' });

  }

});
app.post('/api/llm/generate-answers-web', authenticateToken, async (req, res) => {

  console.log('Received request for /api/llm/generate-answers-web', req.body);

  const { questions, answerProvider, model, blogContent, blogUrl, sourceUrls } = req.body;

  try {

    let answers;

    let sessionId = null;

    let automationUsed = 'selenium';

    if (answerProvider === 'perplexity') {

      try {

        answers = await getPerplexityAnswersSelenium(questions);

      } catch (err) {

        console.warn('Selenium failed for Perplexity:', err.message);

        throw err;

      }

      // Save session to history

      const sessionData = {

        id: uuidv4(),

        name: 'Perplexity Session - ' + new Date().toLocaleString(),

        type: 'answer',

        answerProvider: 'perplexity',

        answerModel: 'perplexity-web',

        timestamp: new Date().toISOString(),

        userId: req.user.id,

        blogContent: blogContent || '',

        blogUrl: blogUrl || '',

        sourceUrls: sourceUrls || [],

        qaData: answers.map((a, i) => ({

          question: a.question,

          answer: a.answer,

          questionOrder: i + 1,

        })),

      };

      sessionId = await db.saveSession(sessionData);

    } else if (answerProvider === 'chatgpt' || answerProvider === 'openai') {

      // Accept both 'chatgpt' and 'openai' for ChatGPT web automation

      answers = (await getChatGPTAnswersRobust(questions)).map(a => ({

        question: a.question,

        answer: a.answer,

        inputTokens: 0,

        outputTokens: 0,

        provider: answerProvider,

        model: model

      }));

      automationUsed = 'selenium';

    } else if (answerProvider === 'gemini') {

      try {

        answers = await getGeminiAnswersSelenium(questions);

      } catch (err) {

        console.warn('Selenium failed for Gemini:', err.message);

        throw err;

      }

    } else if (answerProvider === 'claude') {

      try {

        answers = await getClaudeAnswersSelenium(questions);

      } catch (err) {

        console.warn('Selenium failed for Claude:', err.message);

        throw err;

      }

    } else {

      console.error('Unsupported provider:', answerProvider);

      return res.status(400).json({ error: 'Unsupported provider' });

    }

    res.json({ success: true, answers, provider: answerProvider, model, sessionId, automationUsed });

  } catch (error) {

    console.error('Web automation error:', error);

    res.status(500).json({ error: 'Failed to generate answers', details: error.message });

  }

});



app.post('/api/llm/generate-ai-faqs', authenticateToken, async (req, res) => {

  try {

    const { content, provider, model, targetKeywords, generateQuestionsOnly, generateAnswersOnly, selectedQuestions } = req.body;

    

    console.log('[FAQ Generation] Request received:', {

      generateQuestionsOnly,

      generateAnswersOnly,

      selectedQuestionsCount: selectedQuestions?.length || 0,

      selectedQuestions: selectedQuestions?.map(q => q.substring(0, 50) + '...') || [],

      provider,

      model,

      contentLength: content?.length || 0

    });

    

    if (!content || !provider || !model) {

      return res.status(400).json({ 

        error: 'Missing required fields: content, provider, model' 

      });

    }



    if (!llmService.isProviderConfigured(provider)) {

      return res.status(400).json({ 

        error: `Provider ${provider} is not configured` 

      });

    }



    // Step 1: Generate Questions Only

    if (generateQuestionsOnly) {

      const keywordsText = targetKeywords && targetKeywords.length > 0 

        ? `Focus on these specific keywords/topics: ${targetKeywords.join(', ')}. ` 

        : '';

      

      const questionsPrompt = `You are an SEO and AEO/GEO optimization expert. Based on the following input, generate a list of FAQ questions only that will help the content rank higher in AI-driven search engines and appear in rich results.



Input: ${content}

${keywordsText}

Follow these best practices while generating questions:



Generate 8–12 unique, non-repetitive questions.

Mix high-intent queries (benefits, pricing, use cases) with informational queries (how-to, comparisons, metrics, trends).

Phrase questions in natural language the way a real user or business decision-maker would ask.

Make sure each question is short, clear, and specific (no vague or overly broad questions).

Cover a range of angles:

- Benefits / Value

- Pain points / Solutions

- How-to / Step-by-step queries

- Comparisons (e.g., vs. alternatives)

- Industry-specific concerns

- Metrics & ROI-related questions

Avoid repeating the same keyword in every question—use synonyms and variations to make it SEO-friendly.



Generate only the questions in this exact format:

1. [Question here]

2. [Question here]

3. [Question here]



...and so on for 8-12 questions. Do not include answers, only questions.`;



      let result;

      try {

        console.log('[FAQ Generation] Generating questions with prompt length:', questionsPrompt.length);

        result = await llmService.callLLM(questionsPrompt, provider, model, true);

        console.log('[FAQ Generation] Questions generation result:', {

          success: !!result,

          textLength: result?.text?.length || 0,

          provider: result?.provider,

          model: result?.model

        });

      } catch (e) {

        console.error('[Questions Generation] Primary provider failed:', e?.message || e);

        return res.status(503).json({

          error: 'Question generation is temporarily unavailable. Please try a different provider or try again shortly.',

          details: e?.message || String(e)

        });

      }

      

      // Parse questions from the result

      const questions = [];

      const lines = result.text.split('\n');

      

      console.log('[FAQ Generation] Parsing questions from', lines.length, 'lines');

      

      for (const line of lines) {

        const trimmedLine = line.trim();

        if (trimmedLine.match(/^\d+\.\s+/)) {

          // Extract question from numbered format

          const question = trimmedLine.replace(/^\d+\.\s+/, '').trim();

          if (question.length > 0) {

            questions.push(question);

            console.log('[FAQ Generation] Found numbered question:', question.substring(0, 50) + '...');

          }

        } else if (trimmedLine.startsWith('Q:')) {

          // Extract question from Q: format

          const question = trimmedLine.replace(/^Q:\s*/, '').trim();

          if (question.length > 0) {

            questions.push(question);

            console.log('[FAQ Generation] Found Q: question:', question.substring(0, 50) + '...');

          }

        } else if (trimmedLine.length > 10 && !trimmedLine.startsWith('A:')) {

          // If it's a long line that doesn't start with A:, treat as question

          questions.push(trimmedLine);

          console.log('[FAQ Generation] Found plain question:', trimmedLine.substring(0, 50) + '...');

        }

      }



      // Filter out any empty questions

      const validQuestions = questions.filter(q => q.length > 0);

      

      console.log('[FAQ Generation] Questions parsing complete:', {

        totalLines: lines.length,

        rawQuestions: questions.length,

        validQuestions: validQuestions.length,

        questions: validQuestions.map(q => q.substring(0, 50) + '...')

      });



      return res.json({

        success: true,

        questions: validQuestions,

        provider: result.provider,

        model: result.model,

        inputTokens: result.inputTokens,

        outputTokens: result.outputTokens

      });

    }



    // Step 2: Generate Answers for Selected Questions

    if (generateAnswersOnly && selectedQuestions && selectedQuestions.length > 0) {

      console.log('[FAQ Generation] Starting answer generation for', selectedQuestions.length, 'questions');

      

      try {

      

      const keywordsText = targetKeywords && targetKeywords.length > 0 

        ? `Focus on these specific keywords/topics: ${targetKeywords.join(', ')}. ` 

        : '';

      

      // Use batch processing for large numbers of questions

      const batchSize = 6; // Process 6 questions at a time for better results

      let allFaqs = [];

      let result = null; // Initialize result variable

      

      if (selectedQuestions.length > batchSize) {

        console.log('[FAQ Generation] Using batch processing for', selectedQuestions.length, 'questions with batch size', batchSize);

        

        // Process questions in batches

        for (let i = 0; i < selectedQuestions.length; i += batchSize) {

          const batch = selectedQuestions.slice(i, i + batchSize);

          console.log('[FAQ Generation] Processing batch', Math.floor(i/batchSize) + 1, 'of', Math.ceil(selectedQuestions.length/batchSize), 'with', batch.length, 'questions');

          

          const batchPrompt = `You are an SEO and AEO/GEO optimization expert. Based on the following FAQ questions, generate high-quality answers that are concise, authoritative, and optimized for AI-driven search engines.



Input (FAQ Questions): ${batch.map((q, i) => `${i + 1}. ${q}`).join('\n')}



Content: ${content}

${keywordsText}

Follow these best practices while generating answers:



Each answer should be short, clear, and focused (100–200 words, breakdown into several paragraph, if required add bullet points)

Start answers with the main point first, then add supporting detail.

Use natural, conversational language that matches how users expect AI to respond.

Incorporate keywords and synonyms naturally without keyword stuffing.

Provide answers that are factual, actionable, and evergreen (avoid vague marketing fluff).

Ensure answers are FAQ schema–ready (plain text, no formatting issues).

Make answers useful for both human readers and AI-driven engines (Google, ChatGPT, Gemini, Perplexity, etc.).



Generate the Q&A pairs in this exact format:

Q: ${batch[0]}

A: [Detailed answer here]



Q: ${batch[1]}

A: [Detailed answer here]



...and so on for all questions in this batch.`;



          try {

            const batchResult = await llmService.callLLM(batchPrompt, provider, model, true);

            

            // Set result for the first batch (for return statement)

            if (i === 0) {

              result = batchResult;

            }

            

            if (batchResult && batchResult.text) {

              // Parse batch results

              const batchFaqs = [];

              const batchLines = batchResult.text.split('\n');

              let currentQuestion = '';

              let currentAnswer = '';

              

              for (const line of batchLines) {

                const trimmedLine = line.trim();

                if (trimmedLine.startsWith('Q:')) {

                  if (currentQuestion && currentAnswer) {

                    batchFaqs.push({

                      question: currentQuestion,

                      answer: currentAnswer.trim()

                    });

                  }

                  currentQuestion = trimmedLine.replace(/^Q:\s*/, '').trim();

                  currentAnswer = '';

                } else if (trimmedLine.startsWith('A:')) {

                  currentAnswer = trimmedLine.replace(/^A:\s*/, '').trim();

                } else if (currentAnswer && trimmedLine) {

                  currentAnswer += ' ' + trimmedLine;

                }

              }

              

              if (currentQuestion && currentAnswer) {

                batchFaqs.push({

                  question: currentQuestion,

                  answer: currentAnswer.trim()

                });

              }

              

              const validBatchFaqs = batchFaqs.filter(faq => faq.question.length > 0 && faq.answer.length > 0);

              allFaqs.push(...validBatchFaqs);

              

              console.log('[FAQ Generation] Batch', Math.floor(i/batchSize) + 1, 'completed:', {

                batchQuestions: batch.length,

                generatedFaqs: validBatchFaqs.length,

                faqs: validBatchFaqs.map(faq => ({

                  question: faq.question.substring(0, 50) + '...',

                  answerLength: faq.answer.length

                }))

              });

            }

            

            // Add delay between batches

            if (i + batchSize < selectedQuestions.length) {

              await new Promise(resolve => setTimeout(resolve, 1500));

            }

            

          } catch (error) {

            console.error('[FAQ Generation] Error processing batch', Math.floor(i/batchSize) + 1, ':', error);

          }

        }

        

        // Use batch results as the main result

        const faqs = allFaqs;

        const validFaqs = faqs.filter(faq => faq.question.length > 0 && faq.answer.length > 0);

        

      } else {

        // Process all questions at once for smaller sets

        const answersPrompt = `You are an SEO and AEO/GEO optimization expert. Based on the following FAQ questions, generate high-quality answers that are concise, authoritative, and optimized for AI-driven search engines.



Input (FAQ Questions): ${selectedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}



Content: ${content}

${keywordsText}

Follow these best practices while generating answers:



Each answer should be short, clear, and focused (100–200 words, breakdown into several paragraph, if required add bullet points)

Start answers with the main point first, then add supporting detail.

Use natural, conversational language that matches how users expect AI to respond.

Incorporate keywords and synonyms naturally without keyword stuffing.

Provide answers that are factual, actionable, and evergreen (avoid vague marketing fluff).

Ensure answers are FAQ schema–ready (plain text, no formatting issues).

Make answers useful for both human readers and AI-driven engines (Google, ChatGPT, Gemini, Perplexity, etc.).
Generate the Q&A pairs in this exact format:

Q: ${selectedQuestions[0]}

A: [Detailed answer here]



Q: ${selectedQuestions[1]}

A: [Detailed answer here]



...and so on for all questions.`;



        let result;

        try {

          console.log('[FAQ Generation] Generating answers with prompt length:', answersPrompt.length);

          console.log('[FAQ Generation] Questions being answered:', selectedQuestions.map((q, i) => `${i + 1}. ${q.substring(0, 50)}...`));

          result = await llmService.callLLM(answersPrompt, provider, model, true);

          console.log('[FAQ Generation] Answers generation result:', {

            success: !!result,

            textLength: result?.text?.length || 0,

            provider: result?.provider,

            model: result?.model

          });

        } catch (e) {

          console.error('[Answers Generation] Primary provider failed:', e?.message || e);

          return res.status(503).json({

            error: 'Answer generation is temporarily unavailable. Please try a different provider or try again shortly.',

            details: e?.message || String(e)

          });

        }

        

        // Parse FAQs from the result

        const faqs = [];

        const lines = result.text.split('\n');

        let currentQuestion = '';

        let currentAnswer = '';

        

        console.log('[FAQ Generation] Parsing answers from', lines.length, 'lines');

      

      for (const line of lines) {

        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('Q:')) {

          // If we have a previous Q&A pair, save it

          if (currentQuestion && currentAnswer) {

            faqs.push({

              question: currentQuestion,

              answer: currentAnswer.trim()

            });

            console.log('[FAQ Generation] Parsed FAQ:', currentQuestion.substring(0, 50) + '...', 'Answer length:', currentAnswer.trim().length);

          }

          // Start new question

          currentQuestion = trimmedLine.replace(/^Q:\s*/, '').trim();

          currentAnswer = '';

          console.log('[FAQ Generation] Found question:', currentQuestion.substring(0, 50) + '...');

        } else if (trimmedLine.startsWith('A:')) {

          currentAnswer = trimmedLine.replace(/^A:\s*/, '').trim();

          console.log('[FAQ Generation] Found answer start, length:', currentAnswer.length);

        } else if (currentAnswer && trimmedLine) {

          // Continue the answer

          currentAnswer += ' ' + trimmedLine;

        }

      }

      

      // Don't forget the last FAQ

      if (currentQuestion && currentAnswer) {

        faqs.push({

          question: currentQuestion,

          answer: currentAnswer.trim()

        });

        console.log('[FAQ Generation] Parsed final FAQ:', currentQuestion.substring(0, 50) + '...', 'Answer length:', currentAnswer.trim().length);

      }



        // Filter out any empty FAQs

        const validFaqs = faqs.filter(faq => faq.question.length > 0 && faq.answer.length > 0);

        

        console.log('[FAQ Generation] Answer generation complete:', {

          selectedQuestionsCount: selectedQuestions.length,

          rawFaqsCount: faqs.length,

          validFaqsCount: validFaqs.length,

          missingAnswers: selectedQuestions.length - validFaqs.length,

          faqs: validFaqs.map(faq => ({

            question: faq.question.substring(0, 50) + '...',

            answerLength: faq.answer.length

          }))

        });

        

        // Use single batch results

        allFaqs = validFaqs;

      }

      

      // Final processing for both batch and single processing

      const finalValidFaqs = allFaqs.filter(faq => faq.question.length > 0 && faq.answer.length > 0);

      

      console.log('[FAQ Generation] Final answer generation complete:', {

        selectedQuestionsCount: selectedQuestions.length,

        finalFaqsCount: finalValidFaqs.length,

        missingAnswers: selectedQuestions.length - finalValidFaqs.length

      });



      // Check if we have answers for all selected questions

      const missingQuestions = selectedQuestions.filter(selectedQ => 

        !finalValidFaqs.some(faq => faq.question === selectedQ)

      );



      if (missingQuestions.length > 0) {

        console.log('[FAQ Generation] Missing answers for', missingQuestions.length, 'questions, generating individually...');

        

        // Generate answers for missing questions individually

        for (const missingQuestion of missingQuestions) {

          try {

            console.log('[FAQ Generation] Generating individual answer for:', missingQuestion.substring(0, 50) + '...');

            

            const individualPrompt = `You are an SEO and AEO/GEO optimization expert. Generate a high-quality answer for this specific FAQ question.



Question: ${missingQuestion}



Content: ${content}

${keywordsText}



Generate a concise, authoritative answer (100-200 words) that is optimized for AI-driven search engines. Use natural, conversational language and provide factual, actionable information.



Format your response as:

Q: ${missingQuestion}

A: [Your detailed answer here]`;



            const individualResult = await llmService.callLLM(individualPrompt, provider, model, true);

            

            if (individualResult && individualResult.text) {

              // Parse the individual result

              const individualLines = individualResult.text.split('\n');

              let individualQuestion = '';

              let individualAnswer = '';

              

              for (const line of individualLines) {

                const trimmedLine = line.trim();

                if (trimmedLine.startsWith('Q:')) {

                  individualQuestion = trimmedLine.replace(/^Q:\s*/, '').trim();

                } else if (trimmedLine.startsWith('A:')) {

                  individualAnswer = trimmedLine.replace(/^A:\s*/, '').trim();

                } else if (individualAnswer && trimmedLine) {

                  individualAnswer += ' ' + trimmedLine;

                }

              }

              

              if (individualQuestion && individualAnswer && individualAnswer.length > 20) {

                finalValidFaqs.push({

                  question: individualQuestion,

                  answer: individualAnswer.trim()

                });

                console.log('[FAQ Generation] Successfully generated individual answer for:', individualQuestion.substring(0, 50) + '...', 'Answer length:', individualAnswer.trim().length);

              } else {

                console.warn('[FAQ Generation] Failed to parse individual answer for:', missingQuestion.substring(0, 50) + '...');

              }

            }

            

            // Add a small delay between individual requests

            await new Promise(resolve => setTimeout(resolve, 1000));

            

          } catch (error) {

            console.error('[FAQ Generation] Error generating individual answer for:', missingQuestion.substring(0, 50) + '...', error);

          }

        }

        

        console.log('[FAQ Generation] Final results after individual generation:', {

          selectedQuestionsCount: selectedQuestions.length,

          finalFaqsCount: finalValidFaqs.length,

          stillMissing: selectedQuestions.length - finalValidFaqs.length

        });

      }



        return res.json({

          success: true,

          faqs: finalValidFaqs,

          provider: result?.provider || 'unknown',

          model: result?.model || 'unknown',

          inputTokens: result?.inputTokens || 0,

          outputTokens: result?.outputTokens || 0

        });

        

      } catch (error) {

        console.error('[FAQ Generation] Error in answer generation:', error);

        return res.status(500).json({

          error: 'Failed to generate answers',

          details: error.message || String(error)

        });

      }

    }



    // Original FAQ generation (for backward compatibility)

    const keywordsText = targetKeywords && targetKeywords.length > 0 

      ? `Focus on these specific keywords/topics: ${targetKeywords.join(', ')}. ` 

      : '';

    

    const prompt = `You are an SEO and AEO/GEO optimization expert. Based on the following input, generate comprehensive FAQs that will help the content rank higher in AI-driven search engines and appear in rich results.



Input: ${content}

${keywordsText}



Follow these best practices while generating FAQs:



Generate 8–12 unique, non-repetitive questions.

Mix high-intent queries (benefits, pricing, use cases) with informational queries (how-to, comparisons, metrics, trends).

Phrase questions in natural language the way a real user or business decision-maker would ask.

Make sure each question is short, clear, and specific (no vague or overly broad questions).

Cover a range of angles:

- Benefits / Value

- Pain points / Solutions

- How-to / Step-by-step queries

- Comparisons (e.g., vs. alternatives)

- Industry-specific concerns

- Metrics & ROI-related questions

Avoid repeating the same keyword in every question—use synonyms and variations to make it SEO-friendly.



For answers:

Each answer should be short, clear, and focused (100–200 words, breakdown into several paragraph, if required add bullet points)

Start answers with the main point first, then add supporting detail.

Use natural, conversational language that matches how users expect AI to respond.

Incorporate keywords and synonyms naturally without keyword stuffing.

Provide answers that are factual, actionable, and evergreen (avoid vague marketing fluff).

Ensure answers are FAQ schema–ready (plain text, no formatting issues).

Make answers useful for both human readers and AI-driven engines (Google, ChatGPT, Gemini, Perplexity, etc.).



Generate the FAQs in this exact format:

Q: [Question here]

A: [Detailed answer here]



Q: [Question here]

A: [Detailed answer here]



...and so on for 8-12 FAQs.`;



    let result;

    try {

      result = await llmService.callLLM(prompt, provider, model, true);

    } catch (e) {

      console.error('[FAQ Generation] Primary provider failed:', e?.message || e);

      return res.status(503).json({

        error: 'FAQ generation is temporarily unavailable. Please try a different provider or try again shortly.',

        details: e?.message || String(e)

      });

    }

    

    // Parse FAQs from the result

    const faqs = [];

    const lines = result.text.split('\n');

    let currentQuestion = '';

    let currentAnswer = '';

    

    for (const line of lines) {

      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('Q:')) {

        // If we have a previous Q&A pair, save it

        if (currentQuestion && currentAnswer) {

          faqs.push({

            question: currentQuestion,

            answer: currentAnswer.trim()

          });

        }

        // Start new question

        currentQuestion = trimmedLine.replace(/^Q:\s*/, '').trim();

        currentAnswer = '';

      } else if (trimmedLine.startsWith('A:')) {

        currentAnswer = trimmedLine.replace(/^A:\s*/, '').trim();

      } else if (currentAnswer && trimmedLine) {

        // Continue the answer

        currentAnswer += ' ' + trimmedLine;

      }

    }

    

    // Don't forget the last FAQ

    if (currentQuestion && currentAnswer) {

      faqs.push({

        question: currentQuestion,

        answer: currentAnswer.trim()

      });

    }



    // Filter out any empty FAQs

    const validFaqs = faqs.filter(faq => faq.question.length > 0 && faq.answer.length > 0);



    res.json({

      success: true,

      faqs: validFaqs,

      provider: result.provider,

      model: result.model,

      inputTokens: result.inputTokens,

      outputTokens: result.outputTokens

    });

    

  } catch (error) {

    console.error('FAQ generation error:', error);

    res.status(500).json({ 

      error: 'Failed to generate FAQs',

      details: error.message 

    });

  }

});



/**

 * POST /api/compare-answers

 * Request body: { questions: ["question1", "question2", ...] }

 * Response: { success: true, results: [...] }

 * Runs automation for Perplexity, ChatGPT, Gemini, Claude and returns answers for each question.

 */

app.post('/api/compare-answers', authenticateToken, async (req, res) => {

  const { questions } = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {

    return res.status(400).json({ error: 'questions must be a non-empty array' });

  }

  try {

    const results = await compareAnswers(questions);

    res.json({ success: true, results });

  } catch (error) {

    console.error('Compare answers error:', error);

    res.status(500).json({ error: error.message });

  }

});



app.post('/api/automation/chatgpt', authenticateToken, async (req, res) => {

  const { questions } = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {

    return res.status(400).json({ error: 'questions must be a non-empty array' });

  }

  try {

    const answers = await getChatGPTAnswersRobust(questions);

    res.json({ success: true, answers });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

});



// Vector embedding endpoints

// app.post('/api/embeddings/generate', authenticateToken, async (req, res) => { ... });

// app.post('/api/embeddings/search/questions', authenticateToken, async (req, res) => { ... });

// app.post('/api/embeddings/search/answers', authenticateToken, async (req, res) => { ... });

// app.post('/api/embeddings/calculate-similarities', authenticateToken, async (req, res) => { ... });



// Helper function to get confidence level

function getConfidenceLevel(similarity) {

  if (similarity >= 0.9) return 'Very High';

  if (similarity >= 0.8) return 'High';

  if (similarity >= 0.7) return 'Good';

  if (similarity >= 0.6) return 'Moderate';

  if (similarity >= 0.5) return 'Low';

  return 'Very Low';

}



// Helper function to calculate cosine similarity

function cosineSimilarity(vecA, vecB) {

  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {

    return 0;

  }



  let dotProduct = 0;

  let normA = 0;

  let normB = 0;



  for (let i = 0; i < vecA.length; i++) {

    dotProduct += vecA[i] * vecB[i];

    normA += vecA[i] * vecA[i];

    normB += vecB[i] * vecB[i];

  }



  if (normA === 0 || normB === 0) {

    return 0;

  }



  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

}



// Fanout Query Density Analysis Endpoint

app.post('/api/fanout-density/analyze', authenticateToken, async (req, res) => {

  try {

    const { clusterThreshold = 0.7 } = req.body;

    const userId = req.user.id;



    console.log(`[Fanout Density] Starting analysis for user ${userId}`);

    

    // const fanoutAnalyzer = new FanoutQueryDensity();

    // const analysis = await fanoutAnalyzer.calculateFanoutDensity(userId, clusterThreshold);

    

    // if (!analysis.success) {

    //   return res.status(400).json(analysis);

    // }



    // console.log(`[Fanout Density] Analysis completed successfully`);

    res.json({ success: true, message: 'Fanout density analysis is currently disabled.' });



  } catch (error) {

    console.error('[Fanout Density] API error:', error);

    res.status(500).json({ 

      error: 'Failed to analyze fanout query density', 

      details: error.message 

    });

  }

});
// Generate Fanout Density Report

app.get('/api/fanout-density/report', authenticateToken, async (req, res) => {

  try {

    const userId = req.user.id;



    console.log(`[Fanout Density] Generating report for user ${userId}`);

    

    // const fanoutAnalyzer = new FanoutQueryDensity();

    // const report = await fanoutAnalyzer.generateReport(userId);

    

    // if (!report.success) {

    //   return res.status(400).json(report);

    // }



    // console.log(`[Fanout Density] Report generated successfully`);

    res.json({ success: true, message: 'Fanout density report generation is currently disabled.' });



  } catch (error) {

    console.error('[Fanout Density] Report generation error:', error);

    res.status(500).json({ 

      error: 'Failed to generate fanout density report', 

      details: error.message 

    });

  }

});



// GEO Fanout Density Analysis - Track sub-queries and content attribution

app.post('/api/geo-fanout/track', authenticateToken, async (req, res) => {

  try {

    const { mainQuestion, content, provider, model } = req.body;

    const userId = req.user.id;



    if (!mainQuestion || !content || !provider || !model) {

      return res.status(400).json({ 

        error: 'Missing required fields: mainQuestion, content, provider, model' 

      });

    }



    console.log(`[GEO Fanout] Starting analysis for user ${userId}`);

    

    // const geoFanoutAnalyzer = new GEOFanoutDensity();

    // const analysis = await geoFanoutAnalyzer.trackFanoutQueries(

    //   userId, mainQuestion, content, provider, model

    // );

    

    // if (!analysis.success) {

    //   return res.status(400).json(analysis);

    // }



    // console.log(`[GEO Fanout] Analysis completed successfully`);

    res.json({ success: true, message: 'GEO fanout density analysis is currently disabled.' });



  } catch (error) {

    console.error('[GEO Fanout] Analysis error:', error);

    res.status(500).json({ 

      error: 'Failed to analyze GEO fanout density', 

      details: error.message 

    });

  }

});



// Get comprehensive GEO Fanout analysis

app.get('/api/geo-fanout/analysis', authenticateToken, async (req, res) => {

  try {

    const userId = req.user.id;

    const { sessionId } = req.query;



    console.log(`[GEO Fanout] Getting analysis for user ${userId}`);

    

    // const geoFanoutAnalyzer = new GEOFanoutDensity();

    // const analysis = await geoFanoutAnalyzer.getGEOFanoutAnalysis(userId, sessionId);

    

    // if (!analysis.success) {

    //   return res.status(400).json(analysis);

    // }



    // console.log(`[GEO Fanout] Analysis retrieved successfully`);

    res.json({ success: true, message: 'GEO fanout analysis retrieval is currently disabled.' });



  } catch (error) {

    console.error('[GEO Fanout] Analysis retrieval error:', error);

    res.status(500).json({ 

      error: 'Failed to retrieve GEO fanout analysis', 

      details: error.message 

    });

  }

});



app.post('/api/citation-likelihood/calculate', authenticateToken, async (req, res) => {

  try {

    const { answer, content, provider, model } = req.body;

    if (!answer || !content || !provider || !model) {

      console.error('[Citation Likelihood] Missing required fields:', { answer: !!answer, content: !!content, provider, model });

      return res.status(400).json({ error: 'Missing required fields: answer, content, provider, model' });

    }

    

    console.log('[Citation Likelihood] Starting calculation with provider:', provider, 'model:', model);

    console.log('[Citation Likelihood] Answer length:', answer.length, 'Content length:', content.length);

    

    if (!llmService.isProviderConfigured(provider)) {

      console.error('[Citation Likelihood] Provider not configured:', provider);

      return res.status(400).json({ error: `Provider ${provider} is not configured` });

    }

    

    const prompt = `Analyze the following answer and determine how likely it is to need citations or references. Consider:



1. Factual claims and statistics

2. Specific data, numbers, or dates

3. Technical information or research findings

4. Claims that go beyond the provided content

5. Statements that would benefit from external verification



Rate the citation likelihood on a scale of 0 to 100, where:

- 0-20: No citations needed (general knowledge, basic facts)

- 21-40: Low likelihood (some specific claims)

- 41-60: Moderate likelihood (several factual claims)

- 61-80: High likelihood (many specific claims, statistics)

- 81-100: Very high likelihood (extensive factual claims, research data)



Content:

${content}



Answer:

${answer}



Respond with ONLY a number between 0 and 100.`;

    

    let result;

    try {

      console.log('[Citation Likelihood] Calling LLM API with provider:', provider);

      result = await llmService.callLLM(prompt, provider, model, false);

      console.log('[Citation Likelihood] LLM API call successful');

    } catch (err) {

      console.error('[Citation Likelihood] LLM API call failed:', err);

      console.error('[Citation Likelihood] Error details:', {

        message: err.message,

        response: err.response?.data,

        status: err.response?.status,

        config: {

          url: err.config?.url,

          method: err.config?.method,

          headers: err.config?.headers

        }

      });

      return res.status(500).json({ error: 'LLM API call failed', details: err.message });

    }

    

    const response = result.text.trim();

    const match = response.match(/\d+/);

    if (!match) {

      console.error('[Citation Likelihood] LLM response did not contain a number:', response);

    }

    const citationLikelihood = match ? Math.min(Math.max(parseInt(match[0]), 0), 100) : 50;

    console.log('[Citation Likelihood] Input:', { answer: answer.substring(0, 100) + '...', content: content.substring(0, 100) + '...', provider, model });

    console.log('[Citation Likelihood] LLM response:', response, 'Parsed likelihood:', citationLikelihood);

    res.json({ citationLikelihood });

  } catch (error) {

    console.error('[Citation Likelihood] API error:', error);

    res.status(500).json({ error: 'Failed to calculate citation likelihood', details: error.message });

  }

});



app.post('/api/accuracy/calculate', authenticateToken, async (req, res) => {

  try {

    const { answer, content, provider, model } = req.body;

    if (!answer || !content || !provider || !model) {

      console.error('[Accuracy Calculation] Missing required fields:', { answer: !!answer, content: !!content, provider, model });

      return res.status(400).json({ error: 'Missing required fields: answer, content, provider, model' });

    }

    

    console.log('[Accuracy Calculation] Starting calculation with provider:', provider, 'model:', model);

    console.log('[Accuracy Calculation] Answer length:', answer.length, 'Content length:', content.length);

    

    if (!llmService.isProviderConfigured(provider)) {

      console.error('[Accuracy Calculation] Provider not configured:', provider);

      return res.status(400).json({ error: `Provider ${provider} is not configured` });

    }

    

    const prompt = `Rate how well the following answer is supported by the given content on a scale of 0 to 100, where 0 means not supported at all and 100 means fully supported.



Content:

${content}



Answer:

${answer}



Respond with ONLY a number between 0 and 100.`;

    

    let result;

    try {

      console.log('[Accuracy Calculation] Calling LLM API with provider:', provider);

      result = await llmService.callLLM(prompt, provider, model, false);

      console.log('[Accuracy Calculation] LLM API call successful');

    } catch (err) {

      console.error('[Accuracy Calculation] LLM API call failed:', err);

      console.error('[Accuracy Calculation] Error details:', {

        message: err.message,

        response: err.response?.data,

        status: err.response?.status,

        config: {

          url: err.config?.url,

          method: err.config?.method,

          headers: err.config?.headers

        }

      });

      return res.status(500).json({ error: 'LLM API call failed', details: err.message });

    }

    

    const response = result.text.trim();

    const match = response.match(/\d+/);

    if (!match) {

      console.error('[Accuracy Calculation] LLM response did not contain a number:', response);

    }

    const accuracy = match ? Math.min(Math.max(parseInt(match[0]), 0), 100) : 50;

    console.log('[Accuracy Calculation] Input:', { answer: answer.substring(0, 100) + '...', content: content.substring(0, 100) + '...', provider, model });

    console.log('[Accuracy Calculation] LLM response:', response, 'Parsed accuracy:', accuracy);

    res.json({ accuracy });

  } catch (error) {

    console.error('[Accuracy Calculation] API error:', error);

    res.status(500).json({ error: 'Failed to calculate accuracy', details: error.message });

  }

});



app.post('/api/accuracy/gemini', authenticateToken, async (req, res) => {

  try {

    const { answer, content, model } = req.body;

    if (!answer || !content) {

      console.error('[Gemini Accuracy] Missing answer or content:', { answer, content });

      return res.status(400).json({ error: 'Missing answer or content' });

    }

    

    console.log('[Gemini Accuracy] Starting calculation with model:', model);

    console.log('[Gemini Accuracy] Answer length:', answer.length, 'Content length:', content.length);

    

    const prompt = `Rate how well the following answer is supported by the given content on a scale of 0 to 100, where 0 means not supported at all and 100 means fully supported.\n\nContent:\n${content}\n\nAnswer:\n${answer}\n\nRespond with ONLY a number between 0 and 100.`;

    

    let result;

    try {

      console.log('[Gemini Accuracy] Calling Gemini API...');

      result = await llmService.callLLM(prompt, 'gemini', model || 'gemini-2.0-flash', false);

      console.log('[Gemini Accuracy] Gemini API call successful');

    } catch (err) {

      console.error('[Gemini Accuracy] Gemini API call failed:', err);

      console.error('[Gemini Accuracy] Error details:', {

        message: err.message,

        response: err.response?.data,

        status: err.response?.status,

        config: {

          url: err.config?.url,

          method: err.config?.method,

          headers: err.config?.headers

        }

      });

      return res.status(500).json({ error: 'Gemini API call failed', details: err.message });

    }

    

    const response = result.text.trim();

    const match = response.match(/\d+/);

    if (!match) {

      console.error('[Gemini Accuracy] Gemini response did not contain a number:', response);

    }

    const accuracy = match ? Math.min(Math.max(parseInt(match[0]), 0), 100) : 50;

    console.log('[Gemini Accuracy] Input:', { answer: answer.substring(0, 100) + '...', content: content.substring(0, 100) + '...', model });

    console.log('[Gemini Accuracy] Gemini response:', response, 'Parsed accuracy:', accuracy);

    res.json({ accuracy });

  } catch (error) {

    console.error('[Gemini Accuracy] API error:', error);

    res.status(500).json({ error: 'Failed to calculate accuracy', details: error.message });

  }

});



app.post('/api/geo-score', authenticateToken, async (req, res) => {

  try {

    const { accuracy, question, answer, importantQuestions, allConfidences, sourceUrl, content } = req.body;

    console.log('[GEO Score] Input:', { accuracy, question, answer, importantQuestions, allConfidences, sourceUrl, content });

    

    // Dynamic Coverage Score - Calculate based on content similarity and question relevance

    let coverage = 0;

    if (importantQuestions && importantQuestions.length > 0) {

      let totalCoverageScore = 0;

      for (let i = 0; i < importantQuestions.length; i++) {

        const importantQ = importantQuestions[i];

        const confidence = allConfidences[i] || 0;

        

        // Calculate semantic similarity between current question and important question

        const similarity = calculateQuestionSimilarity(question, importantQ);

        

        // Weight by confidence and similarity

        const questionCoverage = (confidence * similarity) / 100;

        totalCoverageScore += questionCoverage;

      }

      coverage = (totalCoverageScore / importantQuestions.length) * 100;

    }

    

    // Dynamic Structure Score - More comprehensive analysis

    let structure = 0;

    

    // 1. Answer Length Analysis (0-20 points)

    const answerLength = answer.length;

    if (answerLength >= 50 && answerLength <= 500) {

      structure += 20; // Optimal length

    } else if (answerLength >= 30 && answerLength <= 800) {

      structure += 15; // Good length

    } else if (answerLength >= 20 && answerLength <= 1000) {

      structure += 10; // Acceptable length

    }

    

    // 2. Formatting and Structure (0-30 points)

    if (/^Q:|<h[1-6]>|<h[1-6] /.test(answer) || /<h[1-6]>/.test(content)) structure += 15;

    if (/\n\s*[-*1.]/.test(answer) || /<ul>|<ol>/.test(answer)) structure += 15;

    

    // 3. Readability Analysis (0-25 points)

    const sentences = answer.split(/[.!?]/).filter(s => s.trim().length > 0);

    const words = answer.split(/\s+/).filter(w => w.length > 0);

    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;

    

    if (avgSentenceLength >= 10 && avgSentenceLength <= 25) {

      structure += 25; // Optimal sentence length

    } else if (avgSentenceLength >= 8 && avgSentenceLength <= 30) {

      structure += 20; // Good sentence length

    } else if (avgSentenceLength >= 5 && avgSentenceLength <= 35) {

      structure += 15; // Acceptable sentence length

    }

    

    // 4. Content Organization (0-25 points)

    let organizationScore = 0;

    

    // Check for logical flow indicators

    if (/first|second|third|finally|in conclusion|to summarize/i.test(answer)) organizationScore += 10;

    if (/however|but|although|while|on the other hand/i.test(answer)) organizationScore += 5;

    if (/for example|such as|including|specifically/i.test(answer)) organizationScore += 5;

    if (/therefore|thus|as a result|consequently/i.test(answer)) organizationScore += 5;

    

    structure += Math.min(organizationScore, 25);

    

    // Cap structure at 100

    if (structure > 100) structure = 100;

    

    // Schema Presence (unchanged)

    let schema = /@type\s*[:=]\s*['"]?FAQPage['"]?/i.test(answer) || /@type\s*[:=]\s*['"]?FAQPage['"]?/i.test(content) ? 1 : 0;

    

    // Accessibility Score (unchanged)

    let access = 1;

    try {

      const robotsUrl = sourceUrl.replace(/\/$/, '') + '/robots.txt';

      const resp = await axios.get(robotsUrl, { timeout: 2000 });

      if (/Disallow:\s*\//i.test(resp.data)) access = 0;

    } catch (e) {

      console.error('[GEO Score] robots.txt fetch failed:', e.message);

      access = 1;

    }

    

    // Updated GEO Score formula using accuracy instead of aiConfidence

    const geoScore = 0.4 * accuracy + 0.2 * coverage + 0.2 * structure + 0.1 * schema * 100 + 0.1 * access * 100;

    

    console.log('[GEO Score] Components:', { accuracy, coverage, structure, schema, access, geoScore });

    res.json({

      geoScore: Math.round(geoScore),

      breakdown: { accuracy, coverage, structure, schema, access }

    });

  } catch (error) {

    console.error('[GEO Score] API error:', error);

    res.status(500).json({ error: 'Failed to calculate GEO score', details: error.message });

  }

});



// Helper function to calculate question similarity

function calculateQuestionSimilarity(question1, question2) {

  // Convert to lowercase and split into words

  const words1 = question1.toLowerCase().split(/\W+/).filter(w => w.length > 2);

  const words2 = question2.toLowerCase().split(/\W+/).filter(w => w.length > 2);

  

  // Calculate Jaccard similarity

  const intersection = words1.filter(word => words2.includes(word));

  const union = [...new Set([...words1, ...words2])];

  

  return union.length > 0 ? intersection.length / union.length : 0;

}



// Catch-all error handlers

process.on('unhandledRejection', (reason, promise) => {

  console.error('Unhandled Rejection:', reason);

});

process.on('uncaughtException', (err) => {

  console.error('Uncaught Exception:', err);

});
// Server startup will be moved to the end of the file



app.post('/api/extract-content', authenticateToken, async (req, res) => {

  try {

    const { url } = req.body;

    if (!url) {

      return res.status(400).json({ error: 'Missing URL' });

    }

    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

    if (!response.ok) {

      return res.status(400).json({ error: 'Failed to fetch URL', status: response.status });

    }

    const html = await response.text();

    const data = unfluff(html);

    res.json({ success: true, content: data.text, title: data.title, description: data.description });

  } catch (error) {

    console.error('Extract content error:', error);

    res.status(500).json({ error: 'Failed to extract content', details: error.message });

  }

});



// Website crawling endpoint

app.post('/api/crawl-website', authenticateToken, async (req, res) => {

  try {

    const { url, options = {} } = req.body;

    

    if (!url) {

      return res.status(400).json({ error: 'Missing URL' });

    }



    console.log(`[Website Crawler] Starting crawl for: ${url}`);

    

    const crawlOptions = {

      maxPages: options.maxPages || 50,

      maxDepth: options.maxDepth || 3,

      timeout: options.timeout || 30000

    };



    const result = await websiteCrawler.crawlWebsite(url, crawlOptions);

    

    res.json({

      success: true,

      result: result

    });

    

  } catch (error) {

    console.error('[Website Crawler] Error:', error);

    res.status(500).json({ 

      error: 'Failed to crawl website',

      details: error.message 

    });

  }

});







// Competitor Analysis Endpoints

app.post('/api/competitor/analyze', authenticateToken, async (req, res) => {

  try {

    const { domain, userContent } = req.body;

    

    if (!domain) {

      return res.status(400).json({ 

        error: 'Missing required field: domain' 

      });

    }



    console.log(`[Competitor Analysis] Analyzing domain: ${domain}`);

    

    const result = await competitorAnalysisService.analyzeCompetitor(domain, userContent || '');

    

    if (result.success) {

      // Save analysis result to database

      const analysisData = {

        id: uuidv4(),

        userId: req.user.id,

        domain: result.domain,

        url: result.url,

        analysis: result.analysis,

        contentLength: result.contentLength,

        title: result.title,

        description: result.description,

        headings: result.headings,

        lastUpdated: result.lastUpdated,

        createdAt: new Date().toISOString()

      };

      

      await db.saveCompetitorAnalysis(analysisData);

      

      res.json({

        success: true,

        result: result

      });

    } else {

      res.status(400).json({

        success: false,

        error: result.error

      });

    }

    

  } catch (error) {

    console.error('[Competitor Analysis] Error:', error);

    res.status(500).json({ 

      error: 'Failed to analyze competitor',

      details: error.message 

    });

  }

});



app.post('/api/competitor/analyze-multiple', authenticateToken, async (req, res) => {

  try {

    const { domains, userContent } = req.body;

    

    if (!domains || !Array.isArray(domains) || domains.length === 0) {

      return res.status(400).json({ 

        error: 'Missing required field: domains (array)' 

      });

    }



    console.log(`[Competitor Analysis] Analyzing ${domains.length} domains`);

    

    const results = await competitorAnalysisService.analyzeMultipleCompetitors(domains, userContent || '');

    

    // Save successful results to database

    for (const result of results) {

      if (result.success) {

        const analysisData = {

          id: uuidv4(),

          userId: req.user.id,

          domain: result.domain,

          url: result.url,

          analysis: result.analysis,

          contentLength: result.contentLength,

          title: result.title,

          description: result.description,

          lastUpdated: result.lastUpdated,

          createdAt: new Date().toISOString()

        };

        

        await db.saveCompetitorAnalysis(analysisData);

      }

    }

    

    res.json({

      success: true,

      results: results

    });

    

  } catch (error) {

    console.error('[Competitor Analysis] Error:', error);

    res.status(500).json({ 

      error: 'Failed to analyze competitors',

      details: error.message 

    });

  }

});



app.get('/api/competitor/analyses', authenticateToken, async (req, res) => {

  try {

    const analyses = await db.getCompetitorAnalyses(req.user.id);

    

    res.json({

      success: true,

      analyses: analyses

    });

    

  } catch (error) {

    console.error('[Competitor Analysis] Error fetching analyses:', error);

    res.status(500).json({ 

      error: 'Failed to fetch competitor analyses',

      details: error.message 

    });

  }

});



app.get('/api/competitor/analysis/:id', authenticateToken, async (req, res) => {

  try {

    const { id } = req.params;

    const analysis = await db.getCompetitorAnalysis(id, req.user.id);

    

    if (!analysis) {

      return res.status(404).json({ 

        error: 'Analysis not found' 

      });

    }

    

    res.json({

      success: true,

      analysis: analysis

    });

    

  } catch (error) {

    console.error('[Competitor Analysis] Error fetching analysis:', error);

    res.status(500).json({ 

      error: 'Failed to fetch competitor analysis',

      details: error.message 

    });

  }

});



app.delete('/api/competitor/analysis/:id', authenticateToken, async (req, res) => {

  try {

    const { id } = req.params;

    const deleted = await db.deleteCompetitorAnalysis(id, req.user.id);

    

    if (!deleted) {

      return res.status(404).json({ 

        error: 'Analysis not found' 

      });

    }

    

    res.json({

      success: true,

      message: 'Analysis deleted successfully'

    });

    

  } catch (error) {

    console.error('[Competitor Analysis] Error deleting analysis:', error);

    res.status(500).json({ 

      error: 'Failed to delete competitor analysis',

      details: error.message 

    });

  }

});



 



// Smart Competitor Analysis Routes

app.post('/api/competitor/smart-analysis', authenticateToken, async (req, res) => {

  try {

    const { domain, userWebsite, companyName } = req.body;

    console.log('[Smart Analysis] Request body:', req.body);

    if (!domain) {

      console.warn('[Smart Analysis] 400 Bad Request: Missing required field: domain');

      return res.status(400).json({ 

        error: 'Missing required field: domain' 

      });

    }

    console.log(`[Smart Analysis] Starting smart analysis for domain: ${domain}`);

    // Use Gemini+SEMrush flow

    const discoveryResult = await smartCompetitorDiscoveryService.discoverCompetitorsGeminiAndSEMrush(domain, companyName);

    console.log('[Smart Analysis] Discovery result:', discoveryResult);

    if (!discoveryResult.success) {

      console.warn('[Smart Analysis] Discovery failed:', discoveryResult.error);

      return res.status(400).json({

        success: false,

        error: 'Failed to discover smart competitors',

        details: discoveryResult.error

      });

    }

    const competitors = discoveryResult.competitors;

    res.json({

      success: true,

      competitors: competitors,

      targetDomain: domain,

      totalAnalyzed: competitors.length

    });

  } catch (error) {

    console.error('[Smart Analysis] Error:', error);

    res.status(500).json({ 

      error: 'Failed to perform smart analysis',

      details: error.message 

    });

  }

});



// Get smart analysis by ID

app.get('/api/competitor/smart-analysis/:id', authenticateToken, async (req, res) => {

  try {

    const { id } = req.params;

    const analysis = await db.getSmartAnalysis(id, req.user.id);

    

    if (!analysis) {

      return res.status(404).json({ 

        error: 'Smart analysis not found' 

      });

    }

    

    res.json({

      success: true,

      analysis: analysis

    });

    

  } catch (error) {

    console.error('[Smart Analysis] Error fetching analysis:', error);

    res.status(500).json({ 

      error: 'Failed to fetch smart analysis',

      details: error.message 

    });

  }

});



// Get all smart analyses for user

app.get('/api/competitor/smart-analyses', authenticateToken, async (req, res) => {

  try {

    const analyses = await db.getSmartAnalyses(req.user.id);

    

    res.json({

      success: true,

      analyses: analyses

    });

    

  } catch (error) {

    console.error('[Smart Analysis] Error fetching analyses:', error);

    res.status(500).json({ 

      error: 'Failed to fetch smart analyses',

      details: error.message 

    });

  }

});



// Delete smart analysis

app.delete('/api/competitor/smart-analysis/:id', authenticateToken, async (req, res) => {

  try {

    const { id } = req.params;

    const deleted = await db.deleteSmartAnalysis(id, req.user.id);

    

    if (!deleted) {

      return res.status(404).json({ 

        error: 'Smart analysis not found' 

      });

    }

    

    res.json({

      success: true,

      message: 'Smart analysis deleted successfully'

    });

    

  } catch (error) {

    console.error('[Smart Analysis] Error deleting analysis:', error);

    res.status(500).json({ 

      error: 'Failed to delete smart analysis',

      details: error.message 

    });

  }

});



// Helper function to extract JSON from markdown code blocks

function extractJSONFromMarkdown(text) {

  if (!text || typeof text !== 'string') {

    console.error('[JSON Extraction] Invalid input:', typeof text);

    return {};

  }



  // Clean the text first

  let cleanedText = text.trim();

  

  // Try to parse as direct JSON first

  try {

    return JSON.parse(cleanedText);

  } catch (e) {

    console.log('[JSON Extraction] Direct JSON parsing failed, trying markdown extraction');

  }



  // Try to extract JSON from markdown code blocks (handle both objects and arrays)

  const jsonMatch = cleanedText.match(/```(?:json)?\s*([\[\{][\s\S]*?[\]\}])\s*```/);

  let jsonBlock = null;

  if (jsonMatch) {

    jsonBlock = jsonMatch[1].trim();

  } else {

    // If no markdown blocks found, try to find JSON array first, then object

    const jsonArrayMatch = cleanedText.match(/\[[\s\S]*\]/);

    const jsonObjectMatch = cleanedText.match(/\{[\s\S]*\}/);

    if (jsonArrayMatch) {

      jsonBlock = jsonArrayMatch[0].trim();

    } else if (jsonObjectMatch) {

      jsonBlock = jsonObjectMatch[0].trim();

    }

  }



  if (jsonBlock) {

    // Try parsing the detected JSON block

    try {

      return JSON.parse(jsonBlock);

    } catch (e2) {

      console.error('[JSON Extraction] Failed to parse JSON block:', e2.message);

      console.log('[JSON Extraction] Attempted to parse:', jsonBlock.substring(0, 400) + '...');

      // Try to fix common JSON issues

      try {

        const fixedJson = fixCommonJsonIssues(jsonBlock);

        return JSON.parse(fixedJson);

      } catch (e3) {

        console.error('[JSON Extraction] Failed to parse even after fixing:', e3.message);

        console.log('[JSON Extraction] Fixed JSON:', fixCommonJsonIssues(jsonBlock).substring(0, 400) + '...');

      }

    }

  }



  console.error('[JSON Extraction] No valid JSON found in text');

  // Return empty array for array context, empty object otherwise
  return text.includes('[') ? [] : {};

}
// Improved JSON fixer for Gemini API responses

function fixCommonJsonIssues(jsonText) {

  let fixed = jsonText;

  // Fix smart quotes and apostrophes that break JSON
  fixed = fixed.replace(/[\u2018\u2019]/g, "'"); // Smart single quotes
  fixed = fixed.replace(/[\u201C\u201D]/g, '"'); // Smart double quotes
  fixed = fixed.replace(/'/g, "'"); // Normalize apostrophes

  // Remove any lines before the first { or [ and after the last } or ]

  const firstBrace = Math.min(
    fixed.indexOf('{') !== -1 ? fixed.indexOf('{') : Infinity,
    fixed.indexOf('[') !== -1 ? fixed.indexOf('[') : Infinity
  );

  const lastBrace = Math.max(fixed.lastIndexOf('}'), fixed.lastIndexOf(']'));

  if (firstBrace !== Infinity && lastBrace !== -1 && lastBrace > firstBrace) {

    fixed = fixed.substring(firstBrace, lastBrace + 1);

  }



  // Remove trailing commas before closing braces/brackets

  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');



  // Fix missing quotes around property names (only if not already quoted)

  fixed = fixed.replace(/([,{\s])(\w+)(\s*):/g, (match, p1, p2, p3) => {

    if (/^\d/.test(p2)) return match; // don't quote numbers

    return `${p1}"${p2}"${p3}:`;

  });



  // Fix single quotes to double quotes (but preserve apostrophes inside words)
  // First, temporarily replace apostrophes in contractions
  fixed = fixed.replace(/(\w)'(\w)/g, '$1___APOSTROPHE___$2');
  // Now replace remaining single quotes with double quotes
  fixed = fixed.replace(/'/g, '"');
  // Restore apostrophes
  fixed = fixed.replace(/___APOSTROPHE___/g, "'");



  // Remove backslashes before quotes that are not escaping another quote

  fixed = fixed.replace(/\\"/g, '"');



  // Remove any trailing commas at the end

  fixed = fixed.replace(/,\s*}/g, '}');

  fixed = fixed.replace(/,\s*]/g, ']');



  // Remove any non-JSON trailing/leading text (should be handled by above, but extra safety)

  fixed = fixed.replace(/^[^\{]*/, '');

  fixed = fixed.replace(/[^\}]*$/, '');



  // Log the fixed JSON for debugging

  console.log('[JSON Extraction] Fixed JSON:', fixed.substring(0, 400) + '...');

  return fixed;

}



// Helper function to generate smart insights

function generateSmartInsights(competitors, targetAnalysis, userPosition) {

  const insights = [];

  

  // Ensure competitors is an array

  if (!Array.isArray(competitors)) {

    competitors = [];

  }

  

  // Ensure targetAnalysis is an object

  if (!targetAnalysis || typeof targetAnalysis !== 'object') {

    targetAnalysis = { businessType: 'unknown', services: [] };

  }

  

  // Ensure services is an array

  if (!Array.isArray(targetAnalysis.services)) {

    targetAnalysis.services = [];

  }

  

  // Position insights

  if (userPosition) {

    if (userPosition === 1) {

      insights.push({

        type: 'position',

        title: 'Market Leader',

        description: 'Your website is performing exceptionally well and leading the competition!',

        priority: 'high'

      });

    } else if (userPosition <= 3) {

      insights.push({

        type: 'position',

        title: 'Top Performer',

        description: `You're in the top ${userPosition} competitors. Focus on maintaining your strong position.`,

        priority: 'medium'

      });

    } else {

      insights.push({

        type: 'position',

        title: 'Improvement Opportunity',

        description: `You're ranked #${userPosition} out of ${competitors.length}. There's room to climb the rankings.`,

        priority: 'high'

      });

    }

  }

  

  // Content insights

  const topCompetitor = competitors[0];

  if (topCompetitor && topCompetitor.contentAnalysis && topCompetitor.scores) {

    const avgContentScore = competitors.reduce((sum, c) => sum + (c.scores?.content || 0), 0) / competitors.length;

    insights.push({

      type: 'content',

      title: 'Content Quality Benchmark',

      description: `Top competitor has a content score of ${topCompetitor.scores.content || 0}. Industry average is ${Math.round(avgContentScore)}.`,

      priority: 'medium'

    });

  }

  

  // Business type insights

  if (targetAnalysis.businessType && targetAnalysis.businessType !== 'unknown') {

    insights.push({

      type: 'business',

      title: 'Business Type Analysis',

      description: `Your business type (${targetAnalysis.businessType}) is well-represented in the competitive landscape.`,

      priority: 'low'

    });

  }

  

  // Service insights

  if (targetAnalysis.services && targetAnalysis.services.length > 0) {

    insights.push({

      type: 'services',

      title: 'Service Focus',

      description: `Key services detected: ${targetAnalysis.services.join(', ')}. Consider highlighting these in your content.`,

      priority: 'medium'

    });

  }

  

  return insights;

}



// Content structure analysis routes

app.post('/api/content/analyze-structure', authenticateToken, async (req, res) => {

  try {

    const { content, url } = req.body;

    

    if (!content && !url) {

      return res.status(400).json({ success: false, error: 'Content or URL is required' });

    }



    console.log('[Content Analysis] Starting analysis for:', url ? `URL: ${url}` : `Content length: ${content.length}`);



    let originalContent = content;

    let fullPageHtml = '';

    let pageTitle = '';

    let pageDescription = '';



    // If URL is provided, crawl the full page

    if (url) {

      try {

        console.log('[Content Analysis] Crawling full page:', url);

        

        // Fetch the page HTML with a timeout to avoid hanging requests

        const controller = new AbortController();

        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch(url, {

          headers: {

            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

          },

          signal: controller.signal

        }).finally(() => clearTimeout(timeoutId));

        

        if (!response.ok) {

          return res.status(400).json({ 

            success: false, 

            error: `Failed to fetch URL: ${response.status} ${response.statusText}` 

          });

        }

        

        fullPageHtml = await response.text();

        

        // Extract title and description

        const titleMatch = fullPageHtml.match(/<title[^>]*>([^<]+)<\/title>/i);

        pageTitle = titleMatch ? titleMatch[1] : '';

        

        const descMatch = fullPageHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

        pageDescription = descMatch ? descMatch[1] : '';

        

        // If no content provided, extract text content

        if (!originalContent) {

          const data = unfluff(fullPageHtml);

          originalContent = data.text || fullPageHtml;

        }

        

        console.log('[Content Analysis] Successfully crawled page. Title:', pageTitle, 'Content length:', originalContent.length);

        

      } catch (error) {

        console.error('[Content Analysis] Error crawling page:', error);

        const message = (error && (error.name === 'AbortError' || error.message?.includes('aborted')))

          ? 'Request timed out while fetching the URL (15s). Please try again or use a different URL.'

          : `Failed to crawl page: ${error.message}`;

        return res.status(504).json({

          success: false,

          error: message

        });

      }

    }



    // Check if Gemini API is configured

    if (!process.env.GEMINI_API_KEY) {

      console.log('[Content Analysis] Gemini API key not configured, using fallback analysis');

      

      // Fallback analysis without LLM

      const analysis = {

        contentType: 'article',

        currentStructure: {

          headings: originalContent.includes('<h1>') || originalContent.includes('# ') ? ['h1'] : [],

          paragraphs: originalContent.split('\n\n').length,

          lists: (originalContent.match(/[•\-*]/g) || []).length,

          tables: 0,

          quotes: (originalContent.match(/["']/g) || []).length / 2,

          codeBlocks: 0

        },

        missingElements: [],

        structureIssues: [],

        improvementOpportunities: []

      };



      // Generate structured content without LLM

      let structuredContent = originalContent;

      

      // Convert to proper HTML if it's plain text

      if (!originalContent.includes('<html>') && !originalContent.includes('<body>')) {

        const lines = originalContent.split('\n');

        let htmlContent = '';

        

        // Add H1 if missing

        if (!originalContent.includes('<h1>') && !originalContent.includes('# ')) {

          const title = lines[0].substring(0, 60);

          htmlContent += `<h1>${title}</h1>\n\n`;

        }

        

        // Convert paragraphs

        let inList = false;

        let listItems = [];

        

        lines.forEach((line, index) => {

          line = line.trim();

          if (line.length > 0) {

            if (line.startsWith('# ')) {

              // Close any open list

              if (inList && listItems.length > 0) {

                htmlContent += `<ul>\n${listItems.join('\n')}\n</ul>\n\n`;

                listItems = [];

                inList = false;

              }

              htmlContent += `<h1>${line.substring(2)}</h1>\n\n`;

            } else if (line.startsWith('## ')) {

              // Close any open list

              if (inList && listItems.length > 0) {

                htmlContent += `<ul>\n${listItems.join('\n')}\n</ul>\n\n`;

                listItems = [];

                inList = false;

              }

              htmlContent += `<h2>${line.substring(3)}</h2>\n\n`;

            } else if (line.startsWith('### ')) {

              // Close any open list

              if (inList && listItems.length > 0) {

                htmlContent += `<ul>\n${listItems.join('\n')}\n</ul>\n\n`;

                listItems = [];

                inList = false;

              }

              htmlContent += `<h3>${line.substring(4)}</h3>\n\n`;

            } else if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {

              if (!inList) {

                inList = true;

              }

              listItems.push(`  <li>${line.substring(2)}</li>`);

            } else if (line.match(/^\d+\./)) {

              if (!inList) {

                inList = true;

              }

              listItems.push(`  <li>${line.replace(/^\d+\.\s*/, '')}</li>`);

            } else {

              // Close any open list

              if (inList && listItems.length > 0) {

                htmlContent += `<ul>\n${listItems.join('\n')}\n</ul>\n\n`;

                listItems = [];

                inList = false;

              }

              htmlContent += `<p>${line}</p>\n\n`;

            }

          }

        });

        

        // Close any remaining list

        if (inList && listItems.length > 0) {

          htmlContent += `<ul>\n${listItems.join('\n')}\n</ul>\n\n`;

        }

        

        // Wrap in proper HTML structure

        structuredContent = `<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${lines[0].substring(0, 60)}</title>

    <meta name="description" content="${content.substring(0, 160)}">

</head>

<body>

    ${htmlContent}
</body>

</html>`;

      }



      // Generate suggestions without LLM

      const suggestions = [];

      

      console.log('[Backend] Starting suggestion generation:', {

        fullPageHtmlLength: fullPageHtml.length,

        originalContentLength: originalContent.length,

        pageTitle: pageTitle,

        hasH1: fullPageHtml.includes('<h1>'),

        hasMarkdownH1: originalContent.includes('# ')

      });

      

      // All suggestions below are disabled (user wants only sentence replacements)
      if (false) {
      // Check for missing H1 heading

      if (!fullPageHtml.includes('<h1>') && !originalContent.includes('# ')) {

        const suggestedTitle = pageTitle || originalContent.split('\n')[0].substring(0, 60);

        

        // Extract actual content from the body for better display

        let currentContent = '';

        if (fullPageHtml.includes('<body>')) {

          const bodyStart = fullPageHtml.indexOf('<body>') + 6;

          const bodyEnd = fullPageHtml.indexOf('</body>');

          if (bodyEnd > bodyStart) {

            const bodyContent = fullPageHtml.substring(bodyStart, bodyEnd);

            // Remove HTML tags and get first 200 characters of actual text

            currentContent = bodyContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200);

            if (currentContent.length === 200) currentContent += '...';

          }

        }

        

        // Fallback to original content if no body content found

        if (!currentContent) {

          currentContent = originalContent.substring(0, 200);

          if (currentContent.length === 200) currentContent += '...';

        }

        

        console.log('[Backend] Generating heading suggestion with:', {

          suggestedTitle,

          currentContent: currentContent.substring(0, 100) + '...',

          fullPageHtmlLength: fullPageHtml.length

        });

        

        const headingSuggestion = {

          type: 'heading',

          priority: 'high',

          description: 'Add a clear H1 heading to improve SEO and content structure',

          implementation: `<h1>${suggestedTitle}</h1>`,

          impact: 'Improves SEO ranking and content readability',

          currentContent: currentContent,

          enhancedContent: `<h1>${suggestedTitle}</h1>`,

          exactReplacement: {

            find: fullPageHtml.includes('<body>') ? '<body>' : originalContent.split('\n')[0],

            replace: fullPageHtml.includes('<body>') ? `<body>\n    <h1>${suggestedTitle}</h1>` : `<h1>${suggestedTitle}</h1>\n\n${originalContent}`

          }

        };

        

        // Add a more reliable pattern for sentence replacement

        if (currentContent && currentContent.length > 10) {

          headingSuggestion.sentenceReplacement = {

            find: currentContent.substring(0, 100),

            replace: `<h1>${suggestedTitle}</h1>\n\n${currentContent}`

          };

        }

        

        console.log('[Backend] Created heading suggestion:', {

          type: headingSuggestion.type,

          currentContentLength: headingSuggestion.currentContent.length,

          enhancedContentLength: headingSuggestion.enhancedContent.length,

          hasExactReplacement: !!headingSuggestion.exactReplacement,

          exactReplacementFind: headingSuggestion.exactReplacement.find.substring(0, 100) + '...',

          exactReplacementReplace: headingSuggestion.exactReplacement.replace.substring(0, 100) + '...'

        });

        

        suggestions.push(headingSuggestion);

      }



      // Check for long paragraphs

      const paragraphs = originalContent.split('\n\n');

      const longParagraphs = paragraphs.filter(p => p.length > 300);

      if (longParagraphs.length > 0) {

        const exampleParagraph = longParagraphs[0];

        const sentences = exampleParagraph.split(/[.!?]+/).filter(s => s.trim().length > 10);

        const midPoint = Math.floor(sentences.length / 2);

        const firstHalf = sentences.slice(0, midPoint).join('. ') + '.';

        const secondHalf = sentences.slice(midPoint).join('. ');

        

        // Extract actual paragraph content from HTML if available

        let actualParagraphContent = exampleParagraph;

        if (fullPageHtml.includes(exampleParagraph.substring(0, 50))) {

          // Find the actual paragraph in the HTML

          const paragraphStart = fullPageHtml.indexOf(exampleParagraph.substring(0, 50));

          if (paragraphStart !== -1) {

            const paragraphEnd = fullPageHtml.indexOf('\n', paragraphStart + 200);

            if (paragraphEnd !== -1) {

              actualParagraphContent = fullPageHtml.substring(paragraphStart, paragraphEnd).replace(/<[^>]*>/g, '').trim();

            }

          }

        }

        

        const paragraphSuggestion = {

          type: 'paragraph',

          priority: 'medium',

          description: 'Break content into smaller paragraphs for better readability',

          implementation: `<p>${firstHalf}</p>\n<p>${secondHalf}</p>`,

          impact: 'Improves readability and user engagement',

          currentContent: actualParagraphContent.substring(0, 150) + '...',

          enhancedContent: `<p>${firstHalf}</p>\n<p>${secondHalf}</p>`,

          exactReplacement: {

            find: actualParagraphContent,

            replace: `<p>${firstHalf}</p>\n<p>${secondHalf}</p>`

          }

        };

        

        console.log('[Backend] Created paragraph suggestion:', {

          type: paragraphSuggestion.type,

          currentContentLength: paragraphSuggestion.currentContent.length,

          enhancedContentLength: paragraphSuggestion.enhancedContent.length,

          hasExactReplacement: !!paragraphSuggestion.exactReplacement,

          exactReplacementFind: paragraphSuggestion.exactReplacement.find.substring(0, 100) + '...',

          exactReplacementReplace: paragraphSuggestion.exactReplacement.replace.substring(0, 100) + '...'

        });

        

        suggestions.push(paragraphSuggestion);

      }



      // Check for missing lists

      if (!originalContent.includes('•') && !originalContent.includes('-') && !originalContent.includes('1.')) {

        // Find sentences that could be converted to lists

        const sentences = originalContent.split(/[.!?]+/).filter(s => s.trim().length > 20);

        const listCandidates = sentences.slice(0, 3); // Take first 3 sentences as example

        

        if (listCandidates.length > 0) {

          const listItems = listCandidates.map(sentence => `<li>${sentence.trim()}</li>`).join('\n');

          

        suggestions.push({

          type: 'list',

          priority: 'medium',

          description: 'Add bullet points or numbered lists for key information',

            implementation: `<ul>\n${listItems}\n</ul>`,

            impact: 'Makes content more scannable and LLM-friendly',

            currentContent: listCandidates.join('. ') + '...',

            enhancedContent: `<ul>\n${listItems}\n</ul>`,

            exactReplacement: {

              find: listCandidates.join('. '),

              replace: `<ul>\n${listItems}\n</ul>`

            }

          });

        }

      }



      // Check for missing meta description

      if (!fullPageHtml.includes('meta name="description"') && !fullPageHtml.includes('meta name=\'description\'')) {

        const suggestedDescription = pageDescription || originalContent.substring(0, 160);

        const currentHead = fullPageHtml.includes('<head>') 

          ? fullPageHtml.substring(fullPageHtml.indexOf('<head>'), fullPageHtml.indexOf('</head>') + 7)

          : '<head></head>';

        

        suggestions.push({

          type: 'meta_description',

          priority: 'high',

          description: 'Add a compelling meta description for better SEO',

          implementation: `<meta name="description" content="${suggestedDescription}">`,

          impact: 'Improves click-through rates from search results',

          currentContent: currentHead.substring(0, 200) + '...',

          enhancedContent: currentHead.replace('</head>', `    <meta name="description" content="${suggestedDescription}">\n</head>`),

          exactReplacement: {

            find: '</head>',

            replace: `    <meta name="description" content="${suggestedDescription}">\n</head>`

          }

        });

      }



      // Check for missing title

      if (!fullPageHtml.includes('<title>')) {

        const suggestedTitle = pageTitle || originalContent.split('\n')[0].substring(0, 60);

        const currentHead = fullPageHtml.includes('<head>') 

          ? fullPageHtml.substring(fullPageHtml.indexOf('<head>'), fullPageHtml.indexOf('</head>') + 7)

          : '<head></head>';

        

        suggestions.push({

          type: 'title',

          priority: 'high',

          description: 'Add a descriptive title tag',

          implementation: `<title>${suggestedTitle}</title>`,

          impact: 'Improves SEO and browser tab display',

          currentContent: currentHead.substring(0, 200) + '...',

          enhancedContent: currentHead.replace('</head>', `    <title>${suggestedTitle}</title>\n</head>`),

          exactReplacement: {

            find: '</head>',

            replace: `    <title>${suggestedTitle}</title>\n</head>`

          }

        });

      }



      // Check for missing viewport meta tag

      if (!content.includes('viewport')) {

        suggestions.push({

          type: 'meta_viewport',

          priority: 'medium',

          description: 'Add viewport meta tag for mobile responsiveness',

          implementation: 'Add viewport meta tag for better mobile display',

          impact: 'Improves mobile user experience'

        });

      }



      // Check for missing Open Graph tags

      if (!content.includes('og:title')) {

        suggestions.push({

          type: 'og_title',

          priority: 'medium',

          description: 'Add Open Graph title for better social media sharing',

          implementation: 'Add og:title meta tag for social media previews',

          impact: 'Improves social media sharing appearance'

        });

      }



      if (!content.includes('og:description')) {

        suggestions.push({

          type: 'og_description',

          priority: 'medium',

          description: 'Add Open Graph description for better social media sharing',

          implementation: 'Add og:description meta tag for social media previews',

          impact: 'Improves social media sharing appearance'

        });

      }



      // Check for missing canonical URL

      if (!content.includes('canonical')) {

        suggestions.push({

          type: 'canonical',

          priority: 'medium',

          description: 'Add canonical URL to prevent duplicate content issues',

          implementation: 'Add canonical link tag to specify the preferred URL',

          impact: 'Prevents SEO issues with duplicate content'

        });

      }



      // Check for missing language attribute

      if (!content.includes('lang=')) {

        suggestions.push({

          type: 'lang_attribute',

          priority: 'low',

          description: 'Add language attribute to HTML tag',

          implementation: 'Add lang="en" attribute to the HTML tag',

          impact: 'Improves accessibility and SEO'

        });

      }



      // Check for product pages and add product-specific suggestions

      const hasProductSchema = /"@type"\s*:\s*"Product"/i.test(fullPageHtml);

      const hasPrice = /(?:[$₹€£]|INR|USD|EUR|GBP)\s?\d[\d.,]*/i.test(fullPageHtml) || /product:price:amount/i.test(fullPageHtml);

      const hasAddToCart = /add to (cart|bag|basket)|buy now|checkout/i.test(fullPageHtml);

      const isProductPage = hasProductSchema || (hasPrice && hasAddToCart);

      

      if (isProductPage && !hasProductSchema) {

        // Extract product information

        const h1Match = fullPageHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);

        const productName = (h1Match && h1Match[1]) || pageTitle || 'Product';

        const currencyMatch = fullPageHtml.match(/product:price:currency[^>]*content=["']([^"']+)/i) || fullPageHtml.match(/(?:priceCurrency|currency)"?\s*[:=]\s*"([A-Z]{3})"/i);

        const amountMatch = fullPageHtml.match(/product:price:amount[^>]*content=["']([^"']+)/i) || fullPageHtml.match(/(?:price|priceAmount)"?\s*[:=]\s*"?([0-9][0-9.,]*)"?/i) || fullPageHtml.match(/(?:[$₹€£]|INR|USD|EUR|GBP)\s?\d[\d.,]*/i);

        const brandMatch = fullPageHtml.match(/\"brand\"\s*:\s*\{[\s\S]*?\"name\"\s*:\s*\"([^\"]+)\"/i);

        const brand = (brandMatch && brandMatch[1]) || '';

        const priceCurrency = (currencyMatch && currencyMatch[1]) || 'USD';

        const priceAmountRaw = (amountMatch && amountMatch[1]) || '';

        const priceNumeric = priceAmountRaw.replace(/[^0-9.]/g, '');



        if (productName && (priceNumeric || brand)) {

          // Schema suggestions disabled - user wants only sentence replacements
          const productPrice = priceNumeric ? `${priceCurrency} ${priceNumeric}` : '';
          const productBrand = brand || '';

          // Product-specific copy improvements (multiple plain-language replacements)

          try {

            const rawSentences = (extractedContent || '').split(/[.!?]+\s/).map(s => s.trim()).filter(Boolean);

            const isRealContent = (s) => {

              const codePatterns = /trackNode|getElementById|addEventListener|XMLHttpRequest|window\.|document\.|\.parse\(|\.json\(|function\s*\(/i;

              const specialCharRatio = (s.match(/[(){}\[\]<>|&;]/g) || []).length / Math.max(s.length, 1);

              return s.length > 25 && !codePatterns.test(s) && specialCharRatio < 0.15;

            };

            
            // Get all real content sentences (up to 5)
            const contentSentences = rawSentences.filter(isRealContent).slice(0, 5);
            
            // Generate multiple sentence replacement suggestions
            contentSentences.forEach((candidate, index) => {
              if (!candidate) return;
              
              let improved = '';
              let description = '';
              
              // Suggestion 1: Product intro with brand and price
              if (index === 0) {
                improved = `${productName}${productBrand ? ` by ${productBrand}` : ''}${productPrice ? ` priced at ${productPrice}` : ''} — discover key features, fit, and care details to make the right choice.`;
                description = `Replace opening text with product-specific intro: ${productName}`;
              }
              // Suggestion 2: Benefits and features
              else if (index === 1) {
                improved = `Experience premium quality with ${productName}. Designed for comfort and style, perfect for everyday wear.`;
                description = `Add specific benefits and use case for ${productName}`;
              }
              // Suggestion 3: Call to action
              else if (index === 2 && productPrice) {
                improved = `Shop ${productName} now${productPrice ? ` for ${productPrice}` : ''}. Free shipping available. Perfect addition to your wardrobe.`;
                description = `Transform generic text into actionable CTA for ${productName}`;
              }
              // Suggestion 4: Specifications
              else if (index === 3) {
                improved = `${productName} features: premium materials, expert craftsmanship, and attention to detail. Available in multiple sizes and colors.`;
                description = `Replace vague description with specific product features`;
              }
              // Suggestion 5: Trust and social proof
              else if (index === 4) {
                improved = `Join thousands of satisfied customers who trust ${productBrand || 'us'} for quality${productName ? ` ${productName}` : ' products'}. Shop with confidence.`;
                description = `Add trust signals and social proof`;
              }
              
              if (improved) {
                suggestions.push({
                  type: 'sentence_replacement',
                  priority: index === 0 ? 'high' : 'medium',
                  description,
                  implementation: `Replace: "${candidate.substring(0, 80)}..." WITH: "${improved.substring(0, 80)}..."`,
                  impact: 'Makes content specific and conversion-focused for better AI visibility',
                  currentContent: candidate,
                  enhancedContent: improved,
                  exactReplacement: { find: candidate, replace: improved },
                  sentenceReplacement: { find: candidate, replace: improved }
                });
              }
            });

          } catch {}

        }

      }



      // Check for semantic HTML improvements

      if (content.includes('<b>') && !content.includes('<strong>')) {

      suggestions.push({

          type: 'replace_b_with_strong',

          priority: 'low',

          description: 'Replace <b> tags with semantic <strong> tags',

          implementation: 'Replace <b> tags with <strong> tags for better semantics',

          impact: 'Improves semantic HTML structure'

        });

      }



      // Schema markup suggestion DISABLED - user wants only content suggestions
      // suggestions.push({
      //   type: 'schema',
      //   priority: 'high',
      //   description: 'Add structured data markup for better search engine understanding',
      //   implementation: 'Generate JSON-LD schema markup for the content',
      //   impact: 'Improves search engine visibility and rich snippets'
      // });

      

      console.log('[Backend] Final suggestions generated:', {

        totalSuggestions: suggestions.length,

        suggestionTypes: suggestions.map(s => s.type),

        suggestionsWithExactReplacement: suggestions.filter(s => s.exactReplacement).length,

        suggestionsWithCurrentContent: suggestions.filter(s => s.currentContent).length,

        suggestionsWithEnhancedContent: suggestions.filter(s => s.enhancedContent).length

      });

      

      // Log each suggestion in detail

      suggestions.forEach((suggestion, index) => {

        console.log(`[Backend] Suggestion ${index + 1}:`, {

          type: suggestion.type,

          priority: suggestion.priority,

          hasCurrentContent: !!suggestion.currentContent,

          hasEnhancedContent: !!suggestion.enhancedContent,

          hasExactReplacement: !!suggestion.exactReplacement,

          currentContentPreview: suggestion.currentContent?.substring(0, 100) + '...',

          enhancedContentPreview: suggestion.enhancedContent?.substring(0, 100) + '...',

          exactReplacementFind: suggestion.exactReplacement?.find?.substring(0, 100) + '...',

          exactReplacementReplace: suggestion.exactReplacement?.replace?.substring(0, 100) + '...'

        });

      });

      } // End if (false) - all fallback suggestions disabled



      // Calculate scores

      let seoScore = 50;

      let llmScore = 50;

      let readabilityScore = 50;



      if (content.length > 300) seoScore += 10;

      if (content.includes('<h1>') || content.includes('# ')) seoScore += 15;

      if (content.includes('<h2>') || content.includes('## ')) seoScore += 10;

      if (content.includes('•') || content.includes('-')) seoScore += 5;

      if (content.length > 1000) seoScore += 10;



      if (structuredContent.length > content.length) llmScore += 20;

      if (suggestions.length < 3) llmScore += 15;

      if (content.includes('##') || content.includes('<h2>')) llmScore += 10;

      if (content.includes('•') || content.includes('-')) llmScore += 5;



      const sentences = content.split(/[.!?]+/).length;

      const words = content.split(/\s+/).length;

      const avgSentenceLength = words / sentences;

      

      if (avgSentenceLength < 20) readabilityScore += 20;

      if (avgSentenceLength < 15) readabilityScore += 10;

      if (content.includes('\n\n')) readabilityScore += 10;

      if (content.includes('•') || content.includes('-')) readabilityScore += 10;



      // Generate metadata using the metadata extractor

      const metadata = generateMetadata(fullPageHtml || '', content, content.split('\n')[0].substring(0, 60) || 'Untitled Content', content.substring(0, 160) || 'Content description');



      // Generate 5 user-perspective FAQs (fallback + optional LLM refinement)

      let faqs = [];

      try {

        const base = [

          `What is ${pageTitle || 'this page'} about?`,

          'Who is this page intended for?',

          'How can I use the information on this page?',

          'What are the key takeaways from this page?',

          'Where can I learn more about this topic?'

        ];

        const snippet = content.substring(0, 400);

        faqs = base.map(q => ({ question: q, answer: snippet }));



        if (process.env.GEMINI_API_KEY) {

          const prompt = `From a user's perspective, generate 5 concise FAQs relevant to the following page content. Return strictly a JSON array of {"question":"...","answer":"..."} without any extra text.\n\nTitle: ${pageTitle}\n\nContent:\n${content.substring(0, 2000)}`;

          try {

            const resp = await llmService.callGeminiAPI(prompt, 'gemini-2.0-flash');

            const json = extractJSONFromMarkdown(resp.text || '[]');

            if (Array.isArray(json) && json.length > 0) {

              faqs = json.slice(0, 5).map(f => ({

                question: String(f.question || '').slice(0, 200),

                answer: String(f.answer || '').slice(0, 500)

              }));

            }

          } catch (e) {

            console.warn('[Content Analysis] FAQ LLM generation failed, using fallback.');

          }

        }

      } catch (e) {

        faqs = [];

      }
      // Generate structured data

      const structuredData = {

        articleSchema: {

          '@context': 'https://schema.org',

          '@type': 'Article',

          headline: metadata.title,

          description: metadata.description,

          author: {

            '@type': 'Person',

            name: metadata.author

          },

          publisher: {

            '@type': 'Organization',

            name: 'Publisher Name'

          },

          datePublished: metadata.publishDate,

          dateModified: metadata.lastModified,

          mainEntityOfPage: {

            '@type': 'WebPage',

            '@id': url || 'https://example.com'

          }

        }

      };



      // Compute GEO and Content Quality for fast path as well

      const fastGeo = (() => {

        try {

          const text = (originalContent || '').toString();

          const html = (fullPageHtml || '').toString();

          // Reuse same heuristics as crawler branch (simplified inline)

          const words = text.trim().split(/\s+/).filter(Boolean).length || 1;

          const host = (() => { try { return new URL(url || 'https://example.com').host.replace(/^www\./,''); } catch { return ''; } })();

          const links = Array.from(html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)).map(m => m[1]);

          const external = links.filter(href => { try { const u = new URL(href, url || 'https://example.com'); return u.host.replace(/^www\./,'') !== host; } catch { return false; } });

          const citationPerK = external.length / (words/1000);

          let citation_density = Math.max(0, Math.min(5, citationPerK * 0.6));

          if (citationPerK > 8) citation_density = Math.max(0, 5 - (citationPerK-8)*0.8);

          const sentenceCount = (text.match(/[.!?]\s/g) || []).length || 1;

          const citation_coverage = Math.max(0, Math.min(15, (external.length / Math.max(5, sentenceCount)) * 10));

          const uniqueDomains = new Set(external.map(h => { try { return new URL(h, url || 'https://example.com').host.replace(/^www\./,''); } catch { return h; } })).size;

          const qualityBoost = external.reduce((acc, href) => { try { const h = new URL(href, url || 'https://example.com').host; if (/\.gov$|\.gov\./i.test(h)) return acc+2.0; if (/\.edu$|\.edu\./i.test(h)) return acc+1.5; if (/\b(nature|ieee|acm|who|un|iso|w3c)\b/i.test(h)) return acc+1.5; return acc+0.5; } catch { return acc; } }, 0);

          const httpsShare = external.length ? external.filter(h => /^https:/i.test(h)).length / external.length : 0;

          const domainDiversityBonus = Math.min(3, uniqueDomains * 0.4);

          const citation_quality = Math.max(0, Math.min(10, qualityBoost * 0.35 + httpsShare * 2 + domainDiversityBonus));

          const evidence = parseFloat((citation_coverage + citation_quality + citation_density).toFixed(1));



          const hasTLDR = /\b(tl;dr|tldr|key takeaways|summary|in short|quick summary)\b/i.test(text);

          const bulletsNearTop = /\n\s*[\-•\*]\s+/.test(text.slice(0, 800)) ? 1 : 0;

          const tldr_presence = Math.min(7, (hasTLDR ? 5.0 : 0) + (bulletsNearTop ? 1.0 : 0));

          const shortBlock = text.split(/\n\n/).find(p => p.trim().split(/\s+/).length <= 90);

          const direct_answer = Math.min(10, shortBlock ? 7.5 : 1.5);

          const faqItems = (structuredData && structuredData.faqSchema && Array.isArray(structuredData.faqSchema.mainEntity)) ? structuredData.faqSchema.mainEntity.length : 0;

          const faq_alignment = Math.min(8, faqItems > 0 ? Math.min(8, 2.5 + Math.log2(1+faqItems)*1.5) : 0.5);

          const ans = parseFloat((direct_answer + tldr_presence + faq_alignment).toFixed(1));



          const jsonldTypes = [];

          try { if (structuredData?.articleSchema) jsonldTypes.push('Article'); if (structuredData?.faqSchema) jsonldTypes.push('FAQPage'); } catch {}

          const hasBasics = !!(structuredData?.articleSchema?.headline && structuredData?.articleSchema?.author && structuredData?.articleSchema?.datePublished);

          const json_ld_completeness = Math.min(8, (jsonldTypes.includes('Article') ? (hasBasics ? 5 : 3) : 0) + (jsonldTypes.includes('FAQPage') ? 2 : 0));

          // Deterministic scores for fast path as well

          const ldScripts = (html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi) || []).length;

          const facts_api_presence = Math.max(0, Math.min(6, (ldScripts >= 1 ? 3 : 0) + (/schema\.org/i.test(html) ? 1.5 : 0) + (/faq|howto|article|webpage/i.test(html) ? 1.0 : 0)));

          const llm_discovery = Math.max(0, Math.min(6, (/ai\.txt/i.test(html) ? 3 : 0) + (/sitemap\.xml/i.test(html) ? 1.5 : 0) + (/robots\.txt/i.test(html) ? 1.0 : 0) + (/feed|rss/i.test(html) ? 0.5 : 0)));

          const structured = parseFloat((json_ld_completeness + facts_api_presence + llm_discovery).toFixed(1));



          const now = new Date();

          const last = new Date(metadata?.lastModified || metadata?.publishDate || now.toISOString());

          const days = Math.max(0, Math.floor((now - last)/(1000*60*60*24)));

          const freshness = days <= 30 ? 5.5 : days >= 365 ? 0 : parseFloat((5.5 * (1 - (days-30)/335)).toFixed(1));

          const cadence = (metadata?.publishDate && metadata?.lastModified && metadata.publishDate !== metadata.lastModified) ? 3.0 : 0.8;

          const freshScore = parseFloat((freshness + cadence).toFixed(1));



          const entities = new Set((text.match(/[A-Z][a-zA-Z0-9\-]{2,}(?:\s+[A-Z][a-zA-Z0-9\-]{2,})*/g) || []).slice(0, 200));

          const entity_coverage = Math.min(5, entities.size >= 10 ? 5 : entities.size * 0.4);

          const h2CountFast = (html.match(/<h2\b/gi) || []).length; const h3CountFast = (html.match(/<h3\b/gi) || []).length;

          const topic_recall = Math.max(0, Math.min(5, h2CountFast + Math.min(5, Math.floor(h3CountFast * 0.5))));

          const entityScore = parseFloat((entity_coverage + topic_recall).toFixed(1));



          const plaintext_extraction = Math.min(3, words > 200 ? 2.5 : 1.0);

          const copyability = Math.min(2, /\n\s*[\-•\*]|<table|<code/i.test(html) ? 1.5 : 1.0);

          const retrieval = parseFloat((plaintext_extraction + copyability).toFixed(1));



          // Normalize by category maxima and apply weights to produce 0–100

          const evidence_pct = evidence / 30.0;

          const ans_pct = ans / 25.0;

          const structured_pct = structured / 20.0;

          const fresh_pct = freshScore / 10.0;

          const entity_pct = entityScore / 10.0;

          const retrieval_pct = retrieval / 5.0;

          const total = 0.30*evidence_pct + 0.25*ans_pct + 0.20*structured_pct + 0.10*fresh_pct + 0.10*entity_pct + 0.05*retrieval_pct;

          return parseFloat(Math.max(0, Math.min(100, total*100)).toFixed(1));

        } catch { return 0; }

      })();



      const fastQuality = (() => {

        try {

          const text = (originalContent || '').toString();

          const html = (fullPageHtml || '').toString();

          const words = text.trim().split(/\s+/).filter(Boolean);

          const wordCount = words.length || 1;

          const sentences = text.split(/[.!?]+\s/).filter(s => s.trim().length > 0);

          const sentenceCount = Math.max(1, sentences.length);

          const syllables = words.reduce((acc, w) => acc + (w.toLowerCase().match(/[aeiouy]{1,2}/g)?.length || 1), 0);

          const flesch = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllables / wordCount);

          const flesch_mapped = Math.max(0, Math.min(8, (flesch - 30) / 10));

          const avgSentenceLen = wordCount / sentenceCount;

          const avg_sentence_len = Math.max(0, Math.min(6, 6 - Math.max(0, (avgSentenceLen - 18) / 4)));

          const passiveMatches = text.match(/\b(was|were|been|being|be)\s+\w+ed\b/gi) || [];

          const passive_voice_ratio = Math.max(0, Math.min(6, 6 - (passiveMatches.length / sentenceCount) * 12));

          const readability = flesch_mapped + avg_sentence_len + passive_voice_ratio; // max 20

          const h2 = (html.match(/<h2\b/gi) || []).length; const h3 = (html.match(/<h3\b/gi) || []).length;

          const structure = Math.min(15, (h2*1.5 + h3*0.8) + Math.min(5, Math.floor(wordCount/600)) + 2); // max 15

          const depth = Math.min(20, (h2 + h3) * 2 + Math.min(8, Math.floor(wordCount/500))); // max 20

          // Originality via lexical diversity and intra-page redundancy

          const tokens = (text.toLowerCase().match(/\b[a-z0-9']{3,}\b/g) || []);

          const uniqueTokens = new Set(tokens).size || 1;

          const ttr = uniqueTokens / Math.max(1, tokens.length);

          const diversityScore = Math.max(0, Math.min(10, (ttr - 0.25) * 40)); // 0.25->0, 0.5->10

          const paras = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean).slice(0, 20);

          const jaccardAvg = (() => {

            if (paras.length < 2) return 0.1;

            const toSet = (s) => new Set((s.toLowerCase().match(/\b[a-z0-9']{4,}\b/g) || []));

            let total = 0, count = 0;

            for (let i=1;i<paras.length;i++) {

              const a = toSet(paras[i-1]); const b = toSet(paras[i]);

              const inter = [...a].filter(x => b.has(x)).length;

              const uni = new Set([...a, ...b]).size || 1;

              total += inter/uni; count++;

            }

            return total/Math.max(1,count);

          })();

          const jaccardPenalty = Math.max(0, Math.min(5, (1 - jaccardAvg) * 5));

          const originality = Math.min(15, parseFloat((diversityScore + jaccardPenalty).toFixed(1))); // out of 15

          const accuracy = Math.min(10, ((html.match(/<blockquote/gi)||[]).length ? 3 : 1) + Math.min(5, (text.match(/\b\d{2,}\b/g)||[]).length ? 2 : 0)); // max 10

          // Style & tone quick estimate: jargon ratio plus baseline audience match

          const longWords = (text.match(/\b\w{12,}\b/g) || []).length;

          const jargon_ratio = Math.max(0, Math.min(4, 4 - (longWords / Math.max(1, wordCount)) * 60));

          const style = Math.max(0, Math.min(10, 3.0 + jargon_ratio));

          const access = Math.min(10, ((html.match(/<img\b[^>]*alt=/gi)||[]).length ? 3 : 2) + 2 + Math.min(3, (text.length/Math.max(1, html.length))*6)); // max 10

          // Normalize each category to its rubric maximum, apply weights, then scale to 0-100

          const readability_pct = readability / 20.0;

          const structure_pct = structure / 15.0;

          const depth_pct = depth / 20.0;

          const originality_pct = originality / 15.0;

          const accuracy_pct = accuracy / 10.0;

          const style_pct = style / 10.0;

          const access_pct = access / 10.0;

          const total = 0.20*readability_pct + 0.15*structure_pct + 0.20*depth_pct + 0.15*originality_pct + 0.10*accuracy_pct + 0.10*style_pct + 0.10*access_pct;

          return parseFloat(Math.max(0, Math.min(100, total*100)).toFixed(1));

        } catch { return 0; }

      })();



      const analysisResult = {

        originalContent: originalContent,

        structuredContent,

        seoScore: Math.min(seoScore, 100),

        geoScoreTotal: fastGeo,

        contentQualityScoreTotal: fastQuality,

        llmOptimizationScore: Math.min(llmScore, 100),

        readabilityScore: Math.min(readabilityScore, 100),

        suggestions: suggestions.filter(s => s.type === 'sentence_replacement'),

        metadata: { ...metadata, faqs },

        structuredData,

        fullPageHtml: fullPageHtml, // Include the full crawled HTML

        pageTitle: pageTitle,

        pageDescription: pageDescription

      };



      return res.json({ success: true, analysis: analysisResult });

    }



    // Analyze content structure using LLM

    const analysisPrompt = `Analyze the following content and provide a detailed structure analysis:



Content:

${content.substring(0, 3000)}${content.length > 3000 ? '...' : ''}



Please analyze:

1. Content type (article, guide, tutorial, FAQ, etc.)

2. Current structure (headings, paragraphs, lists, etc.)

3. Missing structural elements

4. Content flow and organization

5. Opportunities for better structure



Respond in JSON format:

{

  "contentType": "string",

  "currentStructure": {

    "headings": ["h1", "h2", "h3"],

    "paragraphs": number,

    "lists": number,

    "tables": number,

    "quotes": number,

    "codeBlocks": number

  },

  "missingElements": ["element1", "element2"],

  "structureIssues": ["issue1", "issue2"],

  "improvementOpportunities": ["opportunity1", "opportunity2"]
}`;



    console.log('[Content Analysis] Calling Gemini API for structure analysis');

    let structureAnalysis;

    try {

      structureAnalysis = await llmService.callGeminiAPI(analysisPrompt, 'gemini-2.0-flash');

    } catch (error) {

      console.error('[Content Analysis] Gemini API error:', error.message);

      // Fallback to basic analysis

      const analysis = {

        contentType: 'article',

        currentStructure: {

          headings: content.includes('<h1>') || content.includes('# ') ? ['h1'] : [],

          paragraphs: content.split('\n\n').length,

          lists: (content.match(/[•\-*]/g) || []).length,

          tables: 0,

          quotes: (content.match(/["']/g) || []).length / 2,

          codeBlocks: 0

        },

        missingElements: [],

        structureIssues: [],

        improvementOpportunities: []

      };

      

      // Continue with comprehensive fallback analysis

      const suggestions = [];

      // ALL fallback suggestions DISABLED - user wants only AI-generated content suggestions
      /* DISABLED FALLBACK SUGGESTIONS
      const fallbackLines = content.split('\n');

      const fallbackWords = content.split(/\s+/);

      const fallbackSentences = content.split(/[.!?]+/);

      

      // 1. Title/Heading Analysis

      if (!fullPageHtml.includes('<h1>') && !originalContent.includes('# ')) {

        const suggestedTitle = pageTitle || originalContent.split('\n')[0].substring(0, 60);

        const currentContent = fullPageHtml.includes('<body>') 

          ? fullPageHtml.substring(fullPageHtml.indexOf('<body>') + 6, fullPageHtml.indexOf('<body>') + 200) + '...'

          : originalContent.substring(0, 200) + '...';

        

        suggestions.push({

          type: 'heading',

          priority: 'high',

          description: 'Add a clear H1 heading to improve SEO and content structure',

          implementation: `<h1>${suggestedTitle}</h1>`,

          impact: 'Improves SEO ranking and content readability',

          currentContent: currentContent,

          enhancedContent: `<h1>${suggestedTitle}</h1>\n\n${originalContent}`,

          exactReplacement: {

            find: fullPageHtml.includes('<body>') ? '<body>' : originalContent.split('\n')[0],

            replace: fullPageHtml.includes('<body>') ? `<body>\n    <h1>${suggestedTitle}</h1>` : `<h1>${suggestedTitle}</h1>\n\n${originalContent}`

          }

        });

      }

      

             // 2. Introduction Analysis

       if (fallbackLines.length > 0 && fallbackLines[0].length < 50) {

        suggestions.push({

          type: 'introduction',

          priority: 'high',

          description: 'Add a compelling introduction paragraph',

          implementation: 'Start with a hook that captures attention and explains what the content covers',

          impact: 'Improves user engagement and AI understanding of content purpose'

        });

      }

      

      // 3. Paragraph Structure Analysis

      const paragraphs = originalContent.split('\n\n');

      const longParagraphs = paragraphs.filter(p => p.length > 300);

      if (longParagraphs.length > 0) {

        const exampleParagraph = longParagraphs[0];

        const sentences = exampleParagraph.split(/[.!?]+/).filter(s => s.trim().length > 10);

        const midPoint = Math.floor(sentences.length / 2);

        const firstHalf = sentences.slice(0, midPoint).join('. ') + '.';

        const secondHalf = sentences.slice(midPoint).join('. ');

        

        suggestions.push({

          type: 'paragraph',

          priority: 'medium',

          description: 'Break content into smaller paragraphs for better readability',

          implementation: `<p>${firstHalf}</p>\n<p>${secondHalf}</p>`,

          impact: 'Improves readability and user engagement',

          currentContent: exampleParagraph.substring(0, 150) + '...',

          enhancedContent: `<p>${firstHalf}</p>\n<p>${secondHalf}</p>`,

          exactReplacement: {

            find: exampleParagraph,

            replace: `<p>${firstHalf}</p>\n<p>${secondHalf}</p>`

          }

        });

      }

      

      // 4. Subheading Analysis

      const hasSubheadings = originalContent.includes('<h2>') || originalContent.includes('## ') || originalContent.includes('<h3>') || originalContent.includes('### ');

      if (!hasSubheadings && originalContent.length > 500) {

        suggestions.push({

          type: 'subheadings',

          priority: 'high',

          description: 'Add subheadings to break up long content sections',

          implementation: 'Add H2 and H3 headings every 200-300 words to organize content',

          impact: 'Improves content scannability and SEO structure'

        });

      }

      

      // 5. List Analysis

      if (!originalContent.includes('•') && !originalContent.includes('-') && !originalContent.includes('1.') && !originalContent.includes('*')) {

        suggestions.push({

          type: 'list',

          priority: 'medium',

          description: 'Add bullet points or numbered lists for key information',

          implementation: 'Convert key points into bullet points or numbered lists',

          impact: 'Makes content more scannable and LLM-friendly'

        });

      }

      

             // 6. Content Length Analysis

       if (fallbackWords.length < 300) {

        suggestions.push({

          type: 'content_length',

          priority: 'medium',

          description: 'Expand content to provide more comprehensive information',

          implementation: 'Add more details, examples, and explanations to reach 300+ words',

          impact: 'Improves SEO ranking and provides more value to readers'

        });

      }

      

      // 7. Conclusion Analysis

      const lastParagraph = fallbackLines[fallbackLines.length - 1];

      if (lastParagraph.length < 50 || !lastParagraph.includes('conclusion') && !lastParagraph.includes('summary')) {

        suggestions.push({

          type: 'conclusion',

          priority: 'medium',

          description: 'Add a strong conclusion paragraph',

          implementation: 'End with a summary of key points and a call to action',

          impact: 'Improves content completeness and user retention'

        });

      }

      

      // 8. Internal Linking Analysis

      if (!originalContent.includes('http') && !originalContent.includes('www.')) {

        suggestions.push({

          type: 'internal_links',

          priority: 'low',

          description: 'Add internal links to related content',

          implementation: 'Include links to other relevant pages on your website',

          impact: 'Improves SEO and keeps users on your site longer'

        });

      }

      

      // 9. Meta Description Analysis

      if (!fullPageHtml.includes('meta name="description"') && !fullPageHtml.includes('meta name=\'description\'')) {

        const suggestedDescription = pageDescription || originalContent.substring(0, 160);

        const currentHead = fullPageHtml.includes('<head>') 

          ? fullPageHtml.substring(fullPageHtml.indexOf('<head>'), fullPageHtml.indexOf('</head>') + 7)

          : '<head></head>';

        

        suggestions.push({

          type: 'meta_description',

          priority: 'high',

          description: 'Add a compelling meta description for better SEO',

          implementation: `<meta name="description" content="${suggestedDescription}">`,

          impact: 'Improves click-through rates from search results',

          currentContent: currentHead.substring(0, 200) + '...',

          enhancedContent: currentHead.replace('</head>', `    <meta name="description" content="${suggestedDescription}">\n</head>`),

          exactReplacement: {

            find: '</head>',

            replace: `    <meta name="description" content="${suggestedDescription}">\n</head>`

          }

        });

      }



      // 10. Image/Visual Content Analysis

      if (!originalContent.includes('image') && !originalContent.includes('img') && !originalContent.includes('photo')) {

        suggestions.push({

          type: 'visual_content',

          priority: 'low',

          description: 'Add relevant images or visual content',

          implementation: 'Include images, diagrams, or infographics to illustrate key points',

          impact: 'Improves user engagement and content appeal'

        });

      }

      

      // 10. Schema Markup

      suggestions.push({

        type: 'schema',

        priority: 'high',

        description: 'Add structured data markup for better search engine understanding',

        implementation: 'Generate JSON-LD schema markup for the content',

        impact: 'Improves search engine visibility and rich snippets'

      });

      

      // 11. Meta Description Analysis

      if (content.length > 160 && !content.includes('meta') && !content.includes('description')) {

        suggestions.push({

          type: 'meta_description',

          priority: 'medium',

          description: 'Create a compelling meta description',

          implementation: 'Write a 150-160 character description that summarizes the content',

          impact: 'Improves click-through rates from search results'

        });

      }

      

      // 12. Keyword Optimization Analysis

      const commonWords = fallbackWords.filter(word => word.length > 3).reduce((acc, word) => {

        acc[word.toLowerCase()] = (acc[word.toLowerCase()] || 0) + 1;

        return acc;

      }, {});

      

      const repeatedWords = Object.entries(commonWords).filter(([word, count]) => count > 3);

      if (repeatedWords.length > 0) {

        suggestions.push({

          type: 'keyword_optimization',

          priority: 'medium',

          description: 'Optimize keyword usage and avoid repetition',

          implementation: 'Use synonyms and vary your language to avoid keyword stuffing',

          impact: 'Improves content quality and SEO ranking'

        });

      }

    END DISABLED FALLBACK SUGGESTIONS */

      // Calculate scores

      let seoScore = 50;

      let llmScore = 50;

      let readabilityScore = 50;



      if (content.length > 300) seoScore += 10;

      if (content.includes('<h1>') || content.includes('# ')) seoScore += 15;

      if (content.includes('<h2>') || content.includes('## ')) seoScore += 10;

      if (content.includes('•') || content.includes('-')) seoScore += 5;

      if (content.length > 1000) seoScore += 10;



      if (suggestions.length < 3) llmScore += 15;

      if (content.includes('##') || content.includes('<h2>')) llmScore += 10;

      if (content.includes('•') || content.includes('-')) llmScore += 5;



      const sentences = content.split(/[.!?]+/).length;

      const words = content.split(/\s+/).length;

      const avgSentenceLength = words / sentences;

      

      if (avgSentenceLength < 20) readabilityScore += 20;

      if (avgSentenceLength < 15) readabilityScore += 10;

      if (content.includes('\n\n')) readabilityScore += 10;

      if (content.includes('•') || content.includes('-')) readabilityScore += 10;



      // Generate metadata using the metadata extractor

      const metadata = generateMetadata(fullPageHtml || '', content, content.split('\n')[0].substring(0, 60) || 'Untitled Content', content.substring(0, 160) || 'Content description');



      // Generate FAQs for LLM-error fallback path

      let faqs2 = [];

      try {

        const base = [

          `What is ${pageTitle || 'this content'} about?`,

          'Who should read this?',

          'How can I apply this information?',

          'What are the main points?',

          'Where can I find related resources?'

        ];

        const snippet = content.substring(0, 400);

        faqs2 = base.map(q => ({ question: q, answer: snippet }));

      } catch {}



      // Generate structured data

      const structuredData = {

        articleSchema: {

          '@context': 'https://schema.org',

          '@type': 'Article',

          headline: metadata.title,

          description: metadata.description,

          author: {

            '@type': 'Person',

            name: metadata.author

          },

          publisher: {

            '@type': 'Organization',

            name: 'Publisher Name'

          },

          datePublished: metadata.publishDate,

          dateModified: metadata.lastModified,

          mainEntityOfPage: {

            '@type': 'WebPage',

            '@id': url || 'https://example.com'

          }

        }

      };



      const analysisResult = {

        originalContent: content,

        structuredContent: content,

        seoScore: Math.min(seoScore, 100),

        llmOptimizationScore: Math.min(llmScore, 100),

        readabilityScore: Math.min(readabilityScore, 100),

        suggestions: suggestions.filter(s => s.type === 'sentence_replacement'),

        metadata: { ...metadata, faqs: faqs2 },

        structuredData

      };



      return res.json({ success: true, analysis: analysisResult });

    }

    

    const analysis = extractJSONFromMarkdown(structureAnalysis.text || '{}');



    // Generate structured content

    const structurePrompt = `Restructure the following content to be more LLM-friendly and SEO-optimized:



Original Content:

${content}



Analysis:

${JSON.stringify(analysis, null, 2)}
Please restructure the content with:

1. Clear, hierarchical headings (H1, H2, H3)

2. Well-organized paragraphs

3. Bullet points and numbered lists where appropriate

4. Clear section breaks

5. Better content flow

6. LLM-friendly formatting



Return the restructured content with proper HTML-like formatting.`;



    let structuredContentResponse;

    let structuredContent = content;

    try {

      structuredContentResponse = await llmService.callGeminiAPI(structurePrompt, 'gemini-2.0-flash');

      structuredContent = structuredContentResponse.text || content;

    } catch (error) {

      console.error('[Content Analysis] Error generating structured content:', error.message);

      // Use original content if LLM fails

      structuredContent = content;

    }



    // Generate comprehensive suggestions

    const suggestions = [];

    const lines = content.split('\n');

    const words = content.split(/\s+/);

    const sentences = content.split(/[.!?]+/);

    

    /* All suggestions below are disabled (user wants only sentence replacements)
    // 1. Title/Heading Analysis

    if (!content.includes('<h1>') && !content.includes('# ')) {

      suggestions.push({

        type: 'heading',

        priority: 'high',

        description: 'Add a clear H1 heading to improve SEO and content structure',

        implementation: 'Add a descriptive H1 heading at the beginning of the content',

        impact: 'Improves SEO ranking and content readability'

      });

    }

    

    // 2. Introduction Analysis

    if (lines.length > 0 && lines[0].length < 50) {

      suggestions.push({

        type: 'introduction',

        priority: 'high',

        description: 'Add a compelling introduction paragraph',

        implementation: 'Start with a hook that captures attention and explains what the content covers',

        impact: 'Improves user engagement and AI understanding of content purpose'

      });

    }

    

    // 3. Paragraph Structure Analysis

    const paragraphs = content.split('\n\n');

    if (paragraphs.length < 3) {

      suggestions.push({

        type: 'paragraph',

        priority: 'medium',

        description: 'Break content into smaller paragraphs for better readability',

        implementation: 'Split long paragraphs into 2-3 sentence chunks',

        impact: 'Improves readability and user engagement'

      });

    }

    

    // 4. Subheading Analysis

    const hasSubheadings = content.includes('<h2>') || content.includes('## ') || content.includes('<h3>') || content.includes('### ');

    if (!hasSubheadings && content.length > 500) {

      suggestions.push({

        type: 'subheadings',

        priority: 'high',

        description: 'Add subheadings to break up long content sections',

        implementation: 'Add H2 and H3 headings every 200-300 words to organize content',

        impact: 'Improves content scannability and SEO structure'

      });

    }

    

    // 5. List Analysis

    if (!content.includes('•') && !content.includes('-') && !content.includes('1.') && !content.includes('*')) {

      suggestions.push({

        type: 'list',

        priority: 'medium',

        description: 'Add bullet points or numbered lists for key information',

        implementation: 'Convert key points into bullet points or numbered lists',

        impact: 'Makes content more scannable and LLM-friendly'

      });

    }

    

    // 6. Content Length Analysis

    if (words.length < 300) {

      suggestions.push({

        type: 'content_length',

        priority: 'medium',

        description: 'Expand content to provide more comprehensive information',

        implementation: 'Add more details, examples, and explanations to reach 300+ words',

        impact: 'Improves SEO ranking and provides more value to readers'

      });

    }

    

    // 7. Conclusion Analysis

    const lastParagraph = lines[lines.length - 1];

    if (lastParagraph.length < 50 || !lastParagraph.includes('conclusion') && !lastParagraph.includes('summary')) {

      suggestions.push({

        type: 'conclusion',

        priority: 'medium',

        description: 'Add a strong conclusion paragraph',

        implementation: 'End with a summary of key points and a call to action',

        impact: 'Improves content completeness and user retention'

      });

    }

    

    // 8. Internal Linking Analysis

    if (!content.includes('http') && !content.includes('www.')) {

      suggestions.push({

        type: 'internal_links',

        priority: 'low',

        description: 'Add internal links to related content',

        implementation: 'Include links to other relevant pages on your website',

        impact: 'Improves SEO and keeps users on your site longer'

      });

    }

    

    // 9. Image/Visual Content Analysis

    if (!content.includes('image') && !content.includes('img') && !content.includes('photo')) {

      suggestions.push({

        type: 'visual_content',

        priority: 'low',

        description: 'Add relevant images or visual content',

        implementation: 'Include images, diagrams, or infographics to illustrate key points',

        impact: 'Improves user engagement and content appeal'

      });

    }

    

    // 10. Schema Markup

    suggestions.push({

      type: 'schema',

      priority: 'high',

      description: 'Add structured data markup for better search engine understanding',

      implementation: 'Generate JSON-LD schema markup for the content',

      impact: 'Improves search engine visibility and rich snippets'

    });

    

    // 11. Meta Description Analysis

    if (content.length > 160 && !content.includes('meta') && !content.includes('description')) {

      suggestions.push({

        type: 'meta_description',

        priority: 'medium',

        description: 'Create a compelling meta description',

        implementation: 'Write a 150-160 character description that summarizes the content',

        impact: 'Improves click-through rates from search results'

      });

    }

    

    // 12. Keyword Optimization Analysis

    const commonWords = words.filter(word => word.length > 3).reduce((acc, word) => {

      acc[word.toLowerCase()] = (acc[word.toLowerCase()] || 0) + 1;

      return acc;

    }, {});

    

    const repeatedWords = Object.entries(commonWords).filter(([word, count]) => count > 3);

    if (repeatedWords.length > 0) {

      suggestions.push({

        type: 'keyword_optimization',

        priority: 'medium',

        description: 'Optimize keyword usage and avoid repetition',

        implementation: 'Use synonyms and vary your language to avoid keyword stuffing',

        impact: 'Improves content quality and SEO ranking'

      });

    }

    */ // End disabled suggestions block - all LLM path suggestions disabled



    // Calculate scores

    let seoScore = 50;

    let llmScore = 50;

    let readabilityScore = 50;



    if (content.length > 300) seoScore += 10;

    if (content.includes('<h1>') || content.includes('# ')) seoScore += 15;

    if (content.includes('<h2>') || content.includes('## ')) seoScore += 10;

    if (content.includes('•') || content.includes('-')) seoScore += 5;

    if (content.length > 1000) seoScore += 10;



    if (structuredContent.length > content.length) llmScore += 20;

    if (suggestions.length < 3) llmScore += 15;

    if (content.includes('##') || content.includes('<h2>')) llmScore += 10;

    if (content.includes('•') || content.includes('-')) llmScore += 5;



    const sentenceCount = sentences.length;

    const wordCount = words.length;

    const avgSentenceLength = wordCount / sentenceCount;

    

    if (avgSentenceLength < 20) readabilityScore += 20;

    if (avgSentenceLength < 15) readabilityScore += 10;

    if (content.includes('\n\n')) readabilityScore += 10;

    if (content.includes('•') || content.includes('-')) readabilityScore += 10;



    // Generate metadata

    const metadataPrompt = `Extract metadata from the following content:



Content:

${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}



Generate:

1. A compelling title (50-60 characters)

2. A meta description (150-160 characters)

3. 5-10 relevant keywords

4. Estimated reading time

5. Word count

6. Language detection



Respond in JSON format:

{

  "title": "string",

  "description": "string",

  "keywords": ["keyword1", "keyword2"],

  "author": "string",

  "publishDate": "YYYY-MM-DD",

  "lastModified": "YYYY-MM-DD",

  "readingTime": number,

  "wordCount": number,

  "language": "string"

}`;



    let metadataResponse;

    let metadata;

    try {

      metadataResponse = await llmService.callGeminiAPI(metadataPrompt, 'gemini-2.0-flash');

      metadata = extractJSONFromMarkdown(metadataResponse.text || '{}');

    } catch (error) {

      console.error('[Content Analysis] Error generating metadata:', error.message);

      // Fallback metadata

      metadata = {

        title: content.split('\n')[0].substring(0, 60) || 'Untitled Content',

        description: content.substring(0, 160) || 'Content description',

        keywords: content.split(/\s+/).filter(word => word.length > 4).slice(0, 10),

        author: 'Unknown',

        publishDate: metadata.publishDate,

        lastModified: metadata.lastModified,

        readingTime: Math.ceil(content.split(/\s+/).length / 200),

        wordCount: content.split(/\s+/).length,

        language: 'en'

      };

    }

    

    metadata.wordCount = content.split(/\s+/).length;

    metadata.readingTime = Math.ceil(metadata.wordCount / 200);

    metadata.language = metadata.language || 'en';



    // Generate structured data

    const structuredData = {};

    

    if (content.includes('?') && content.split('?').length > 3) {

      const faqPrompt = `Extract FAQ items from the following content and format them as JSON-LD schema:



Content:

${content}



Generate FAQ schema with questions and answers found in the content. Format as:

{

  "@context": "https://schema.org",

  "@type": "FAQPage",

  "mainEntity": [

    {

      "@type": "Question",

      "name": "Question text",

      "acceptedAnswer": {

        "@type": "Answer",

        "text": "Answer text"

      }

    }

  ]

}`;



      try {

        const faqResponse = await llmService.callGeminiAPI(faqPrompt, 'gemini-2.0-flash');

        try {

          structuredData.faqSchema = extractJSONFromMarkdown(faqResponse.text || '{}');

        } catch (e) {

          structuredData.faqSchema = {

            '@context': 'https://schema.org',

            '@type': 'FAQPage',

            mainEntity: []

          };

        }

      } catch (error) {

        console.error('[Content Analysis] Error generating FAQ schema:', error.message);

        structuredData.faqSchema = {

          '@context': 'https://schema.org',

          '@type': 'FAQPage',

          mainEntity: []

        };

      }

    }



    const articlePrompt = `Generate Article schema for the following content:



Content:

${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}



Generate JSON-LD Article schema with:

- Headline from content

- Description (meta description)

- Author (if mentioned)

- Publisher

- Dates



Format as Article schema.`;



    try {

      const articleResponse = await llmService.callGeminiAPI(articlePrompt, 'gemini-2.0-flash');

      try {

        structuredData.articleSchema = extractJSONFromMarkdown(articleResponse.text || '{}');

      } catch (e) {

        structuredData.articleSchema = {

          '@context': 'https://schema.org',

          '@type': 'Article',

          headline: metadata.title || 'Article Title',

          description: metadata.description || 'Article description',

          author: {

            '@type': 'Person',

            name: metadata.author || 'Author Name'

          },

          publisher: {

            '@type': 'Organization',

            name: 'Publisher Name'

          },

          datePublished: metadata.publishDate,

          dateModified: metadata.lastModified,

          mainEntityOfPage: {

            '@type': 'WebPage',

            '@id': url || 'https://example.com'

          }

        };

      }

    } catch (error) {

      console.error('[Content Analysis] Error generating Article schema:', error.message);

      structuredData.articleSchema = {

        '@context': 'https://schema.org',

        '@type': 'Article',

        headline: metadata.title || 'Article Title',

        description: metadata.description || 'Article description',

        author: {

          '@type': 'Person',

          name: metadata.author || 'Author Name'

        },

        publisher: {

          '@type': 'Organization',

          name: 'Publisher Name'

        },

        datePublished: metadata.publishDate || null,

        dateModified: metadata.lastModified || null,

        mainEntityOfPage: {

          '@type': 'WebPage',

          '@id': url || 'https://example.com'

        }

      };

    }



    const analysisResult = {

      originalContent: content,

      structuredContent,

      seoScore: Math.min(seoScore, 100),

      llmOptimizationScore: Math.min(llmScore, 100),

      readabilityScore: Math.min(readabilityScore, 100),

      suggestions,

      metadata,

      structuredData

    };



    res.json({ success: true, analysis: analysisResult });

  } catch (error) {

    console.error('Error analyzing content structure:', error);

    res.status(500).json({ success: false, error: 'Failed to analyze content structure' });

  }

});
app.post('/api/content/apply-suggestions', authenticateToken, async (req, res) => {

  try {

    const { content, suggestions } = req.body;

    if (!content || !Array.isArray(suggestions)) {

      return res.status(400).json({ success: false, error: 'Content and suggestions are required' });

    }



    let improvedContent = content;

    let usedDOM = false;

    let usedLLM = false;



    // Try DOM-based improvement for HTML content

    try {

      if (/<html[\s>]/i.test(content) || /<body[\s>]/i.test(content)) {

        const dom = new JSDOM(content);

        const doc = dom.window.document;

        suggestions.forEach(suggestion => {

          if (suggestion.type === 'meta_description') {

            if (!doc.querySelector('meta[name="description"]')) {

              const meta = doc.createElement('meta');

              meta.name = 'description';

              meta.content = suggestion.implementation || 'Improved meta description.';

              doc.head.appendChild(meta);

            }

          }

          if (suggestion.type === 'schema' && suggestion.implementation) {

            const script = doc.createElement('script');

            script.type = 'application/ld+json';

            script.textContent = suggestion.implementation;

            doc.head.appendChild(script);

          }

          if (suggestion.type === 'replace_b_with_strong') {

            doc.querySelectorAll('b').forEach(b => {

              const strong = doc.createElement('strong');

              strong.innerHTML = b.innerHTML;

              b.parentNode.replaceChild(strong, b);

            });

          }

          if (suggestion.type === 'title') {

            let title = doc.querySelector('title');

            if (!title) {

              title = doc.createElement('title');

              doc.head.appendChild(title);

            }

            title.textContent = suggestion.implementation || 'Improved Title';

          }

          // Add more rules as needed

        });

        improvedContent = dom.serialize();

        usedDOM = true;

      }

    } catch (e) {

      console.error('[Apply Suggestions] jsdom failed:', e.message);

    }



    // If DOM-based failed or not HTML, fallback to LLM/heuristics (existing logic)

    if (!usedDOM) {

      // ... existing LLM and heuristic logic ...

      // (leave as is, do not remove)

    }



    res.json({ success: true, improvedContent });

  } catch (error) {

    console.error('[Apply Suggestions] Error:', error);

    res.status(500).json({ success: false, error: error.message });

  }

});



// Publish improved HTML to WordPress

// Publish improved HTML into a Webflow CMS item and publish it live

/*

// Webflow publishing is disabled

async function handlePublishWebflow(req, res) {}

app.post('/api/publish/webflow', authenticateToken, handlePublishWebflow);

app.post('/publish/webflow', authenticateToken, handlePublishWebflow);

*/



// Webflow OAuth: initiate

/* Webflow OAuth disabled

app.get('/api/webflow/auth', async (req, res) => {});

*/



// Webflow OAuth: callback

/* Webflow OAuth disabled

app.get('/api/webflow/callback', async (req, res) => {});

*/



// Webflow helper: list sites/collections with stored token

/* Webflow listing disabled

app.get('/api/webflow/sites', authenticateToken, async (req, res) => {});

*/



/* Webflow listing disabled

app.get('/api/webflow/collections', authenticateToken, async (req, res) => {});

*/



// Server already started above - removing duplicate listen call



// Competitor Field Analysis Endpoint

app.post('/api/competitor/field-analysis', async (req, res) => {

  try {

    const { field } = req.body;

    if (!field || typeof field !== 'string') {

      return res.status(400).json({ success: false, error: 'Field is required' });

    }



    const SEMRUSH_API_KEY = process.env.SEMRUSH_API_KEY;

    let competitors = [];

    if (SEMRUSH_API_KEY) {

      try {

        competitors = await fetchCompetitorsFromSEMRush(field, SEMRUSH_API_KEY);

      } catch (err) {

        console.error('[SEMRush] API error:', err);

        return res.status(500).json({ success: false, error: 'SEMrush API error' });

      }

    } else {

      // Mock data for demonstration

      competitors = [

        {

          name: 'GenSEO Pro',

          domain: 'genseopro.com',

          aiVisibilityScore: 92,

          citationCount: 1200,

          contentOptimizationScore: 88,

          lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),

        },

        {

          name: 'AI Ranker',

          domain: 'airanker.ai',

          aiVisibilityScore: 89,

          citationCount: 950,

          contentOptimizationScore: 85,

          lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),

        },

        {

          name: 'SEO Wizard',

          domain: 'seowizard.com',

          aiVisibilityScore: 87,

          citationCount: 1100,

          contentOptimizationScore: 82,

          lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),

        },

        {

          name: 'Content Genius',

          domain: 'contentgenius.io',

          aiVisibilityScore: 85,

          citationCount: 800,

          contentOptimizationScore: 80,

          lastUpdated: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),

        },

        {

          name: 'OptiAI',

          domain: 'optiai.com',

          aiVisibilityScore: 83,

          citationCount: 700,

          contentOptimizationScore: 78,

          lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),

        },

        {

          name: 'SERP Master',

          domain: 'serpmaster.net',

          aiVisibilityScore: 80,

          citationCount: 600,

          contentOptimizationScore: 75,

          lastUpdated: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),

        },

      ];

    }



    // Sort by AI Visibility Score, then Citation Count

    competitors.sort((a, b) =>

      b.aiVisibilityScore !== a.aiVisibilityScore

        ? b.aiVisibilityScore - a.aiVisibilityScore

        : b.citationCount - a.citationCount

    );



    res.json({ success: true, competitors });

  } catch (error) {

    console.error('[Competitor Field Analysis] Error:', error);

    res.status(500).json({ success: false, error: error.message });

  }

}); 



// Helper to parse SEMrush CSV response

function parseSemrushCSV(csv) {

  const lines = csv.trim().split('\n');

  const headers = lines[0].split(';');

  return lines.slice(1).map(line => {

    const cols = line.split(';');

    const obj = {};

    headers.forEach((h, i) => { obj[h] = cols[i]; });

    return obj;

  });

}



// Fetch competitors from SEMrush

async function fetchCompetitorsFromSEMRush(field, apiKey) {

  // 1. Use a keyword to get top domains (organic competitors)

  const url = `https://api.semrush.com/?type=domain_organic_organic&key=${apiKey}&display_limit=10&export_columns=Dn,Or,Ot,Oc&database=us&phrase=${encodeURIComponent(field)}`;

  const response = await axios.get(url);

  const competitorsRaw = parseSemrushCSV(response.data);



  // 2. For each competitor, get backlinks (citation count)

  const competitors = await Promise.all(competitorsRaw.map(async (row) => {

    let citationCount = 0;

    try {

      const backlinksUrl = `https://api.semrush.com/?type=backlinks_overview&key=${apiKey}&target=${row.Dn}&target_type=root_domain&export_columns=Db&database=us`;

      const backlinksResp = await axios.get(backlinksUrl);

      const backlinksData = parseSemrushCSV(backlinksResp.data);

      citationCount = parseInt(backlinksData[0]?.Db || '0', 10);

    } catch (e) {

      citationCount = 0;

    }

    // Heuristic scores (customize as needed)

    const aiVisibilityScore = Math.min(100, Math.round((parseInt(row.Or || '0', 10) / 1000) + (parseInt(row.Ot || '0', 10) / 100)));

    const contentOptimizationScore = Math.min(100, Math.round((parseInt(row.Oc || '0', 10) / 10) + 70));

    return {

      name: row.Dn,

      domain: row.Dn,

      aiVisibilityScore,

      citationCount,

      contentOptimizationScore,

      lastUpdated: new Date().toISOString(),

    };

  }));

  return competitors;

} 



// AI Visibility Analysis Route

app.get('/api/ai-visibility/:company', async (req, res) => {

  try {

    let { company } = req.params;

    const { industry, fast, product, category, competitor, country, pageType } = req.query;



    // Normalize input: accept URL-encoded URL/domain/company and extract company slug

    try {

      // First decode URL-encoded path segments safely

      try { company = decodeURIComponent(company); } catch {}



      // If the param still looks encoded, try decoding again (defensive)

      if (/%2F|%3A/i.test(company)) {

        try { company = decodeURIComponent(company); } catch {}

      }



      // If it's a URL or domain, extract the hostname and company part

      if (company.includes('.') || /https?:\/\//i.test(company) || company.includes('://')) {

        let raw = company;

        if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

        const u = new URL(raw);

        const host = u.hostname.replace(/^www\./, '');

        company = host.split('.')[0];

      }

    } catch {}



    // Pass-through of extra context is future-ready; backend service can use it as needed

    const result = await aiVisibilityService.getVisibilityData(company, industry, { fast: String(fast).toLowerCase() === 'true', product, category, competitor, country, pageType });

    res.json({ success: true, data: result });

  } catch (error) {

    console.error('AI Visibility API error:', error);

    // Graceful fallback: return an empty competitors array so frontend shows demo data

    try {

      const safeCompany = (() => { try { return decodeURIComponent(req.params.company); } catch { return req.params.company; } })();

      const fallback = {

        company: safeCompany,

        industry: req.query.industry,

        competitors: [],

        serviceStatus: {

          gemini: false,

          chatgpt: false,

          perplexity: false,

          claude: false

        }

      };

      return res.status(200).json({ 

        success: true, 

        data: fallback, 

        demo: true, 

        message: 'Using demo fallback due to analysis error' 

      });

    } catch {

      return res.status(500).json({ success: false, error: 'Failed to fetch AI visibility data', details: error.message });

    }

  }

});

// GEO Engagement & Growth endpoint

app.get('/api/geo-engagement-growth/:competitor', async (req, res) => {

  try {

    const competitor = req.params.competitor;

    const { period = 'month' } = req.query;

    const now = new Date();

    const toIso = now.toISOString();

    const from = new Date(now);

    if (String(period).toLowerCase() === 'week') {

      from.setDate(from.getDate() - 7);

    } else if (String(period).toLowerCase() === 'quarter') {

      from.setMonth(from.getMonth() - 3);

    } else {

      from.setMonth(from.getMonth() - 1);

    }

    const fromIso = from.toISOString();

    const rows = await db.getAiVisibilityRunsByCompetitorBetween(competitor, fromIso, toIso);

    // Group by calendar period boundaries (current and previous period)

    const byPeriod = { current: [], previous: [] };

    const mid = new Date(from);

    const prevStart = new Date(from);

    const prevEnd = new Date(from);

    // previous window: same length immediately before 'from'

    if (String(period).toLowerCase() === 'week') {

      prevStart.setDate(prevStart.getDate() - 7);

      prevEnd.setDate(prevEnd.getDate() - 1);

    } else if (String(period).toLowerCase() === 'quarter') {

      prevStart.setMonth(prevStart.getMonth() - 3);

      prevEnd.setDate(prevEnd.getDate() - 1);

    } else {

      prevStart.setMonth(prevStart.getMonth() - 1);

      prevEnd.setDate(prevEnd.getDate() - 1);

    }

    rows.forEach(r => {

      const d = new Date(r.createdAt);

      if (d >= from && d <= now) byPeriod.current.push(r);

      else if (d >= prevStart && d <= prevEnd) byPeriod.previous.push(r);

    });



    const aggregate = (arr) => {

      const totals = { chatgpt: 0, gemini: 0, perplexity: 0, claude: 0 };

      arr.forEach(r => {

        const s = r.aiScores || {};

        totals.chatgpt += Number(s.chatgpt || 0);

        totals.gemini += Number(s.gemini || 0);

        totals.perplexity += Number(s.perplexity || 0);

        totals.claude += Number(s.claude || 0);

      });

      const totalScore = totals.chatgpt + totals.gemini + totals.perplexity + totals.claude;

      const coverageCount = ['chatgpt','gemini','perplexity','claude'].filter(k => totals[k] > 0).length;

      const modelCoverage = (coverageCount / 4) * 100;

      return { totals, totalScore, modelCoverage };

    };



    const cur = aggregate(byPeriod.current);

    const prev = aggregate(byPeriod.previous);

    const eps = 1;

    const denom = prev.totalScore > 0 ? prev.totalScore : eps;

    const geoTrend = ((cur.totalScore - denom) / denom) * 100;



    res.json({

      success: true,

      competitor,

      period,

      engagement: { modelCoverage: Number(cur.modelCoverage.toFixed(2)) },

      growth: { geoTrend: Number(geoTrend.toFixed(2)) },

      debug: { currentCount: byPeriod.current.length, previousCount: byPeriod.previous.length }

    });

  } catch (e) {

    console.error('[GEO Engagement] Error:', e);

    res.status(500).json({ success: false, error: 'Failed to compute engagement & growth' });

  }

});



// Analyze Single Competitor Route

app.post('/api/ai-visibility/analyze-competitor', async (req, res) => {

  try {

    const { companyName, industry } = req.body;

    

    if (!companyName) {

      return res.status(400).json({ success: false, error: 'Company name is required' });

    }

    

    console.log(`🎯 Analyzing single competitor: ${companyName}`);

    const result = await aiVisibilityService.analyzeSingleCompetitor(companyName, industry);

    res.json({ success: true, data: result });

  } catch (error) {

    console.error('Single competitor analysis error:', error);

    res.status(500).json({ success: false, error: 'Failed to analyze competitor', details: error.message });

  }

}); 



// Full page extraction endpoint

app.post('/api/extract/fullpage', authenticateToken, async (req, res) => {

  const { url } = req.body;

  if (!url || typeof url !== 'string') {

    return res.status(400).json({ error: 'Missing or invalid url' });

  }

  try {

    const { extractFullPageHtml } = require('./fullPageExtractor');

    const html = await extractFullPageHtml(url);

    res.json({ success: true, html });

  } catch (error) {

    console.error('Full page extraction error:', error);

    res.status(500).json({ error: 'Failed to extract full page', details: error.message });

  }

});
// E-commerce Content Analysis Endpoints

app.post('/api/ecommerce-content/competitors', authenticateToken, async (req, res) => {
  try {
    const { brandOrProduct, currentUrl } = req.body;
    console.log('[Ecommerce Content] Get competitors request:', { brandOrProduct, currentUrl });
    
    // Return empty competitors for now - this endpoint would need full implementation
    res.json({ 
      competitors: [],
      success: true 
    });
  } catch (error) {
    console.error('[Ecommerce Content] Competitors error:', error);
    res.status(500).json({ error: 'Failed to fetch competitors', details: error.message });
  }
});

app.post('/api/ecommerce-content/product-competitors', authenticateToken, async (req, res) => {
  try {
    const { productQuery, currentUrl } = req.body;
    console.log('[Ecommerce Content] Product competitors request:', { productQuery, currentUrl });
    
    // Return empty competitors for now
    res.json({ 
      competitors: [],
      success: true 
    });
  } catch (error) {
    console.error('[Ecommerce Content] Product competitors error:', error);
    res.status(500).json({ error: 'Failed to fetch product competitors', details: error.message });
  }
});

app.post('/api/ecommerce-content/price-compare', authenticateToken, async (req, res) => {
  try {
    const { productQuery, currentUrl } = req.body;
    console.log('[Ecommerce Content] Price compare request:', { productQuery, currentUrl });
    
    // Return empty offers for now
    res.json({ 
      offers: [],
      success: true 
    });
  } catch (error) {
    console.error('[Ecommerce Content] Price compare error:', error);
    res.status(500).json({ error: 'Failed to fetch price comparison', details: error.message });
  }
});

// E-commerce Content Generation Endpoint
const { GoogleGenerativeAI } = require('@google/generative-ai');
app.post('/api/ecommerce/generate-content', authenticateToken, async (req, res) => {
  try {
    const { type, inputs, provider, model } = req.body;
    console.log('[Ecommerce Generate] Request:', { type, provider, model });
    
    let generatedContent = {};

    // Prefer real Gemini generation when key is configured
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const useGemini = !!GEMINI_API_KEY;

    async function callGeminiJson(prompt) {
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const mdl = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await mdl.generateContent([{ text: prompt }]);
        const txt = result?.response?.text?.() || result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const first = txt.indexOf('{');
        const last = txt.lastIndexOf('}');
        const jsonStr = first >= 0 && last > first ? txt.substring(first, last + 1) : txt;
        return JSON.parse(jsonStr);
      } catch (e) {
        console.log('[Ecommerce Generate] Gemini parse fallback:', e.message);
        return null;
      }
    }
    
    // Generate content based on type
    if (type === 'product') {
      if (useGemini) {
        const prompt = `You are an expert e-commerce copywriter. Create comprehensive product page content for: ${inputs?.name || 'Product'}

Product Details:
- Name: ${inputs?.name || ''}
- Features: ${inputs?.features || ''}
- Target Audience: ${inputs?.targetAudience || 'General consumers'}
- Category: ${inputs?.category || 'General'}
- Tone: ${inputs?.tone || 'professional'}

Return STRICT JSON with ALL these keys (no markdown, just JSON):
{
  "shortDescription": "1-2 sentence catchy product intro (50-100 chars)",
  "longDescription": "Detailed 3-4 paragraph product description (200-300 words)",
  "features": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5"],
  "benefits": ["benefit 1", "benefit 2", "benefit 3", "benefit 4"],
  "comparison": "How this product compares to alternatives (100-150 words)",
  "specs": {"Spec Name 1": "Value 1", "Spec Name 2": "Value 2", "Spec Name 3": "Value 3"},
  "useCases": ["use case 1", "use case 2", "use case 3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "altText": ["alt text 1", "alt text 2", "alt text 3"],
  "seoTitle": "SEO-optimized page title (50-60 chars)",
  "seoDescription": "SEO meta description (150-160 chars)"
}`;
        const json = await callGeminiJson(prompt);
        if (json) {
          generatedContent = {
            shortDescription: json.shortDescription || json.description || '',
            longDescription: json.longDescription || json.description || '',
            features: json.features || json.bullets || [],
            benefits: json.benefits || json.highlights || [],
            comparison: json.comparison || '',
            specs: json.specs || {},
            useCases: json.useCases || [],
            keywords: json.keywords || [],
            altText: json.altText || [],
            metaTags: {
              title: json.seoTitle || json.metaTags?.title || '',
              description: json.seoDescription || json.metaTags?.description || '',
              keywords: (json.keywords || []).join(', ')
            },
            seoRecommendations: {
              schemaSuggestions: [
                'Add Product schema with name, image, description, price, availability',
                'Include AggregateRating schema if you have reviews',
                'Add Breadcrumb schema for navigation',
                'Include Organization schema on homepage'
              ],
              contentDepthScore: 85,
              aiOptimizationTips: [
                'Add detailed specifications table for better AI parsing',
                'Include customer reviews and ratings',
                'Add FAQ section with common questions',
                'Use structured data for all key product attributes',
                'Include comparison tables with competitors'
              ],
              technicalSeoReminders: [
                'Optimize images with descriptive alt text',
                'Use semantic HTML5 tags (article, section)',
                'Ensure mobile-responsive design',
                'Add structured data (JSON-LD)',
                'Implement proper heading hierarchy (H1, H2, H3)'
              ]
            }
          };
        }
      }
      if (!generatedContent || Object.keys(generatedContent).length === 0) {
        const name = inputs?.name || 'Product';
        const features = inputs?.features || 'high-quality features';
        generatedContent = {
          shortDescription: `${name} - Premium quality with ${features}`,
          longDescription: `${name} is a premium product designed to deliver exceptional performance and value. Featuring ${features}, this product combines cutting-edge technology with user-friendly design. Perfect for ${inputs?.targetAudience || 'anyone'} looking for reliability and quality.`,
          features: [
            `Advanced ${features}`,
            'High-quality materials and construction',
            'Designed for optimal performance',
            'Easy to use and maintain',
            'Backed by comprehensive warranty'
          ],
          benefits: [ 'Premium Quality', 'Fast Shipping', 'Easy Returns', 'Customer Support' ],
          comparison: `Compared to alternatives, ${name} offers superior quality and value.`,
          specs: {
            'Brand': name,
            'Category': inputs?.category || 'General',
            'Warranty': '1 Year'
          },
          useCases: [
            `Perfect for ${inputs?.targetAudience || 'everyday use'}`,
            'Ideal for both beginners and professionals',
            'Suitable for home and office environments'
          ],
          keywords: [name, inputs?.category || 'product', 'premium', 'quality', 'buy'],
          altText: [`${name} product image`, `${name} in use`, `${name} details`],
          metaTags: {
            title: `${name} - Premium Quality Product`,
            description: `Discover ${name} - ${features}. Shop now for the best deals and fast shipping.`,
            keywords: `${name}, ${inputs?.category || 'product'}, premium, quality`
          },
          seoRecommendations: {
            schemaSuggestions: [
              'Add Product schema with name, image, description, price, availability',
              'Include AggregateRating schema if you have reviews',
              'Add Breadcrumb schema for navigation'
            ],
            contentDepthScore: 75,
            aiOptimizationTips: [
              'Add detailed product specifications',
              'Include customer reviews section',
              'Add related products section',
              'Use structured data markup'
            ],
            technicalSeoReminders: [
              'Optimize all images with alt text',
              'Use proper heading hierarchy (H1, H2, H3)',
              'Ensure mobile-responsive design',
              'Add structured data (JSON-LD)'
            ]
          }
        };
      }
    } else if (type === 'category') {
      if (useGemini) {
        const prompt = `You are an expert e-commerce category strategist. Create comprehensive category page content.

Category Details:
- Name: ${inputs?.categoryName || inputs?.name || ''}
- Product Types: ${inputs?.productTypes || ''}
- Target Audience: ${inputs?.audience || 'General shoppers'}

Return STRICT JSON with ALL these keys (no markdown, just JSON):
{
  "intro": "Engaging 2-3 paragraph category introduction (150-200 words)",
  "buyingGuide": "Helpful buying guide with tips (200-250 words)",
  "comparisonChart": "Brief comparison of product types in this category",
  "faqs": [{"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}],
  "internalLinks": ["related category 1", "related category 2", "related category 3"],
  "seoTitle": "SEO-optimized category title (50-60 chars)",
  "seoDescription": "SEO meta description (150-160 chars)"
}`;
        const json = await callGeminiJson(prompt);
        if (json) {
          generatedContent = {
            intro: json.intro || json.description || '',
            buyingGuide: json.buyingGuide || '',
            comparisonChart: json.comparisonChart || '',
            faqs: json.faqs || [],
            internalLinks: json.internalLinks || [],
            metaTags: {
              title: json.seoTitle || '',
              description: json.seoDescription || '',
              keywords: ''
            },
            seoRecommendations: {
              schemaSuggestions: [
                'Add CollectionPage schema',
                'Include BreadcrumbList schema',
                'Add ItemList schema for products in category'
              ],
              contentDepthScore: 80,
              aiOptimizationTips: [
                'Add category comparison guides',
                'Include buying tips and recommendations',
                'Feature top products in the category',
                'Add related categories section'
              ],
              technicalSeoReminders: [
                'Use category-specific keywords in H1 and H2',
                'Add filters for better navigation',
                'Implement pagination for large catalogs',
                'Add canonical tags to prevent duplication'
              ]
            }
          };
        }
      }
      if (!generatedContent || Object.keys(generatedContent).length === 0) {
        const cat = inputs?.name || inputs?.categoryName || 'Category';
        generatedContent = {
          intro: `Explore our ${cat} collection featuring top brands and carefully curated products. ${inputs?.description || ''}`.trim(),
          buyingGuide: `When shopping for ${cat}, consider quality, price, and customer reviews. Our collection features verified products from trusted brands.`,
          comparisonChart: `Compare different ${cat} options based on features, price points, and customer ratings.`,
          faqs: [],
          internalLinks: ['Related Products', 'Best Sellers', 'New Arrivals'],
          metaTags: {
            title: `${cat} - Shop Premium ${cat} Products`,
            description: `Browse our curated ${cat} collection. ${inputs?.description || ''}`.trim(),
            keywords: cat
          },
          seoRecommendations: {
            schemaSuggestions: [
              'Add CollectionPage schema',
              'Include BreadcrumbList schema',
              'Add ItemList schema for products'
            ],
            contentDepthScore: 70,
            aiOptimizationTips: [
              'Add buying guides for the category',
              'Include product comparisons',
              'Feature bestsellers and new arrivals'
            ],
            technicalSeoReminders: [
              'Use category keywords in headings',
              'Add product filters',
              'Implement proper pagination'
            ]
          }
        };
      }
    } else if (type === 'faq') {
      if (useGemini) {
        const topic = inputs?.topic || inputs?.name || inputs?.categoryName || 'iPhone';
        const features = inputs?.features || 'advanced features';
        const audience = inputs?.targetAudience || inputs?.audience || 'tech enthusiasts';
        
        const prompt = `Generate EXACTLY 8 FAQ questions and answers for an e-commerce product page.

Product: ${topic}
Features: ${features}
Target Audience: ${audience}

Requirements:
- Question 1-2: About the product itself (what makes it special, key features)
- Question 3-4: About purchasing (comparison, pricing, availability)
- Question 5-8: About policies (returns, shipping, warranty, tracking)
- Each answer should be 2-3 sentences
- Use specific product details from the context provided

IMPORTANT: Return ONLY valid JSON with this EXACT structure (no explanations, no markdown):
{"faqs":[{"question":"What makes ${topic} special?","answer":"Answer here"},{"question":"What are the key features of ${topic}?","answer":"Answer here"},{"question":"How does ${topic} compare to similar products?","answer":"Answer here"},{"question":"Who is ${topic} designed for?","answer":"Answer here"},{"question":"What is your return policy?","answer":"Answer here"},{"question":"How long does shipping take?","answer":"Answer here"},{"question":"Do you offer warranty on ${topic}?","answer":"Answer here"},{"question":"How can I track my order?","answer":"Answer here"}]}`;
        
        const json = await callGeminiJson(prompt);
        if (json && Array.isArray(json.faqs) && json.faqs.length > 0) {
          // Filter out invalid FAQs (descriptions, summaries, etc.)
          const validFaqs = json.faqs.filter(faq => {
            const q = String(faq.question || '').trim();
            const a = String(faq.answer || '').trim();
            // Reject if question is too long (likely a description)
            if (q.length > 200) return false;
            // Reject if question doesn't end with ? (not a question)
            if (!q.endsWith('?')) return false;
            // Reject if answer is too short
            if (a.length < 10) return false;
            // Reject if question contains phrases like "Here are" or "designed to"
            if (/here are|designed to|following|below/i.test(q)) return false;
            return true;
          });
          
          if (validFaqs.length > 0) {
            console.log(`[Ecommerce Generate] Filtered ${json.faqs.length - validFaqs.length} invalid FAQs, keeping ${validFaqs.length} valid ones`);
            generatedContent = {
              faqs: validFaqs,
              seoRecommendations: {
                schemaSuggestions: [
                  'Add FAQPage schema markup',
                  'Include Question schema for each FAQ',
                  'Add AcceptedAnswer schema'
                ],
                contentDepthScore: 90,
                aiOptimizationTips: [
                  'Expand FAQs with more details',
                  'Add links to related products in answers',
                  'Include images where relevant',
                  'Use conversational language for better AI parsing'
                ],
                technicalSeoReminders: [
                  'Implement FAQ schema (JSON-LD)',
                  'Use proper heading tags for questions',
                  'Add jump links for easy navigation',
                  'Ensure mobile-friendly accordion design'
                ]
              }
            };
          } else {
            console.warn('[Ecommerce Generate] All FAQs filtered out as invalid, using fallback');
          }
        }
      }
      if (!generatedContent || Object.keys(generatedContent).length === 0) {
        const topic = inputs?.topic || inputs?.name || inputs?.categoryName || 'this product';
        generatedContent = {
          faqs: [
            { question: `What makes ${topic} special?`, answer: `Our ${topic} is carefully selected for quality and performance. ${inputs?.context || ''}`.trim() },
            { question: 'What are the key features?', answer: `${inputs?.features || 'Premium quality construction, excellent performance, and reliable durability.'}` },
            { question: 'Who is this for?', answer: `Perfect for ${inputs?.targetAudience || inputs?.audience || 'anyone'} looking for quality and value.` },
            { question: 'What is your return policy?', answer: 'We offer a 30-day money-back guarantee on all products. If you\'re not satisfied, return it for a full refund.' },
            { question: 'How long does shipping take?', answer: 'Standard shipping takes 3-5 business days. Express shipping options available at checkout for faster delivery.' },
            { question: 'Do you offer warranties?', answer: 'Yes, all products include manufacturer warranties. Extended warranty options available for select items.' },
            { question: 'How can I track my order?', answer: 'You will receive a tracking number via email once your order ships. Track orders anytime from your account dashboard.' },
            { question: 'Are there bulk discounts?', answer: 'Yes, we offer competitive pricing for bulk orders. Contact our sales team for custom quotes.' }
          ],
          seoRecommendations: {
            schemaSuggestions: [
              'Add FAQPage schema markup',
              'Include Question schema for each FAQ',
              'Add AcceptedAnswer schema'
            ],
            contentDepthScore: 85,
            aiOptimizationTips: [
              'Expand each answer with more details',
              'Add related product links in answers',
              'Use natural question phrasing'
            ],
            technicalSeoReminders: [
              'Implement FAQ schema (JSON-LD)',
              'Use proper heading structure',
              'Make FAQ section mobile-friendly'
            ]
          }
        };
      }
    }
    
    res.json({
      success: true,
      data: generatedContent
    });
    
  } catch (error) {
    console.error('[Ecommerce Generate] Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate content', 
      details: error.message 
    });
  }
});



// Forgot Password Endpoint

app.post('/api/auth/forgot-password', async (req, res) => {

  console.log('🔐 [Forgot Password] Request received:', { email: req.body.email });

  

  const { email } = req.body;

  if (!email) {

    console.log('❌ [Forgot Password] No email provided');

    return res.status(400).json({ error: 'Email is required' });

  }



  // Email validation

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {

    console.log('❌ [Forgot Password] Invalid email format:', email);

    return res.status(400).json({ error: 'Please enter a valid email address' });

  }



  try {

    console.log('🔍 [Forgot Password] Checking if user exists:', email);

    

    // Check if user exists

    const user = await db.getUserByEmail(email);

    console.log('👤 [Forgot Password] User found:', user ? 'Yes' : 'No');

    

    if (user) {

      console.log('🔑 [Forgot Password] Generating reset token for user:', user.id);

      

      // Generate secure reset token

      const resetToken = require('crypto').randomBytes(32).toString('hex');

      

      // Set expiration (1 hour from now) - using UTC to avoid timezone issues

      const now = new Date();

      const expiresAt = new Date(now.getTime() + (60 * 60 * 1000)); // Add 1 hour in milliseconds

      

      console.log('💾 [Forgot Password] Token timing:', {

        now: now.toISOString(),

        expiresAt: expiresAt.toISOString(),

        timeUntilExpiry: Math.round((expiresAt.getTime() - now.getTime()) / 1000 / 60) + ' minutes',

        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone

      });

      

      // Clean up expired tokens before creating new one

      await db.deleteExpiredPasswordResetTokens();

      console.log('🧹 [Forgot Password] Cleaned up expired tokens');

      

      console.log('💾 [Forgot Password] Saving token to database...');

      

      // Save token to database

      console.log('💾 [Forgot Password] Saving token to database:', {

        userId: user.id,

        token: `${resetToken.substring(0, 10)}...`,

        expiresAt: expiresAt.toISOString()

      });

      

      const tokenId = await db.createPasswordResetToken(user.id, resetToken, expiresAt.toISOString());

      console.log('✅ [Forgot Password] Token saved with ID:', tokenId);

      

      // Create reset link

      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

      console.log('🔗 [Forgot Password] Reset link created:', resetLink);

      

      console.log('📧 [Forgot Password] Sending email...');

      

      // Send email

      const emailResult = await emailService.sendPasswordResetEmail(email, resetLink, user.name);

      

      if (emailResult.success) {

        console.log(`✅ [Forgot Password] Password reset email sent to ${email}`);

        console.log(`🔗 [Forgot Password] Reset link: ${resetLink}`);

        res.json({ 

          success: true, 

          message: 'Password reset link has been sent to your email address.',

          resetLink: resetLink // Include reset link for testing

        });

      } else {

        console.error('❌ [Forgot Password] Failed to send password reset email:', emailResult.error);

        res.status(500).json({ error: 'Failed to send reset email. Please try again later.' });

      }

    } else {

      console.log('👤 [Forgot Password] User not found for email:', email);

      res.status(404).json({ error: 'No account found with this email address.' });

    }

  } catch (error) {

    console.error('❌ [Forgot Password] Error:', error);

    res.status(500).json({ error: 'Failed to process request. Please try again later.' });

  }

});



// Test Email Configuration Endpoint

app.post('/api/auth/test-email', async (req, res) => {

  console.log('🧪 [Test Email] Request received');

  try {

    console.log('🧪 [Test Email] Testing email configuration...');

    const result = await emailService.testEmailConfiguration();

    console.log('🧪 [Test Email] Result:', result);

  

    if (result.success) {

      res.json({ success: true, message: 'Email service is working correctly!' });

    } else {

      res.status(500).json({ error: 'Email service not configured or failed', details: result.error });

    }

  } catch (error) {

    console.error('❌ [Test Email] Error:', error);

    res.status(500).json({ error: 'Failed to test email configuration' });

  }

});



// Simple email configuration check endpoint

app.get('/api/auth/email-status', (req, res) => {

  console.log('📧 [Email Status] Checking email configuration...');

  console.log('📧 [Email Status] Environment variables:');

  console.log('📧 [Email Status] SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'Set' : 'Not set');

  console.log('📧 [Email Status] SMTP_HOST:', process.env.SMTP_HOST || 'Not set');

  console.log('📧 [Email Status] SMTP_USER:', process.env.SMTP_USER || 'Not set');

  console.log('📧 [Email Status] SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not set');

  console.log('📧 [Email Status] SMTP_FROM:', process.env.SMTP_FROM || 'Not set');

  console.log('📧 [Email Status] FRONTEND_URL:', process.env.FRONTEND_URL || 'Not set');

  

  res.json({

    sendgridConfigured: !!process.env.SENDGRID_API_KEY,

    smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),

    emailServiceConfigured: emailService.isConfigured,

    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'

  });

});



// Test email endpoint - sends a real test email

app.post('/api/auth/send-test-email', async (req, res) => {

  const { email } = req.body;

  

  if (!email) {

    return res.status(400).json({ error: 'Email is required' });

  }



  try {

    console.log('🧪 [Test Email] Sending test email to:', email);

    

    // Create a test reset link

    const testToken = 'test-token-' + Date.now();

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${testToken}`;

    

    // Send test email

    const emailResult = await emailService.sendPasswordResetEmail(email, resetLink, 'Test User');

    

    if (emailResult.success) {

      console.log('✅ [Test Email] Test email sent successfully');

      res.json({ 

        success: true, 

        message: 'Test email sent successfully! Check your inbox or backend console for details.',

        testToken: testToken,

        resetLink: resetLink

      });

    } else {

      console.error('❌ [Test Email] Failed to send test email:', emailResult.error);

      res.status(500).json({ error: 'Failed to send test email', details: emailResult.error });

    }

  } catch (error) {

    console.error('❌ [Test Email] Error:', error);

    res.status(500).json({ error: 'Failed to send test email', details: error.message });

  }

});



// Reset Password Endpoint

app.post('/api/auth/reset-password', async (req, res) => {

  const { token, newPassword } = req.body;

  

  console.log('🔐 [Reset Password] Request received:', { 

    token: token ? `${token.substring(0, 10)}...` : 'null', 

    hasPassword: !!newPassword 

  });

  

  if (!token || !newPassword) {

    console.log('❌ [Reset Password] Missing token or password');

    return res.status(400).json({ error: 'Token and new password are required' });

  }



  try {

    // Get token from database

    console.log('🔍 [Reset Password] Looking up token in database...');

    const resetToken = await db.getPasswordResetToken(token);

    

    if (!resetToken) {

      console.log('❌ [Reset Password] Token not found or expired');

      console.log('🔍 [Reset Password] Checking if token exists at all...');

      

      // Additional debugging - check if token exists but is expired/used

      const client = await db.pool.connect();

      try {

        const allTokensResult = await client.query(

          'SELECT token, used, expires_at, created_at FROM password_reset_tokens WHERE token = $1',

          [token]

        );

        

        if (allTokensResult.rows.length > 0) {

          const tokenInfo = allTokensResult.rows[0];

          console.log('🔍 [Reset Password] Token found but invalid:', {

            used: tokenInfo.used,

            expires_at: tokenInfo.expires_at,

            created_at: tokenInfo.created_at,

            is_expired: new Date(tokenInfo.expires_at) < new Date()

          });

        } else {

          console.log('🔍 [Reset Password] Token does not exist in database');

        }

      } finally {

        client.release();

      }

      

      return res.status(400).json({ error: 'Invalid or expired reset token' });

    }

    

    console.log('✅ [Reset Password] Token found and valid:', {

      user_id: resetToken.user_id,

      expires_at: resetToken.expires_at,

      created_at: resetToken.created_at

    });



    // Validate password

    if (!localAuthService.validatePassword(newPassword)) {

      return res.status(400).json({ 

        error: 'Password must be at least 8 characters with uppercase, lowercase, and number' 

      });

    }



    // Hash new password

    const hashedPassword = await localAuthService.hashPassword(newPassword);

    

    // Update user password

    await db.updateUserPassword(resetToken.user_id, hashedPassword);

    

    // Mark token as used

    await db.markPasswordResetTokenAsUsed(token);

    

    res.json({ success: true, message: 'Password has been reset successfully' });

    

  } catch (error) {

    console.error('Reset password error:', error);

    res.status(500).json({ error: 'Failed to reset password. Please try again.' });

  }

});
// Dedicated Structural Content Crawling Endpoint

app.post('/api/structural-content/crawl', authenticateToken, async (req, res) => {

  try {

    const { url } = req.body;

    

    if (!url) {

      return res.status(400).json({ success: false, error: 'URL is required' });

    }



    console.log('[Structural Content Crawler] Starting dedicated crawl for:', url);



    // Step 1: Enhanced content crawling and extraction

    let fullPageHtml = '';

    let pageTitle = '';

    let pageDescription = '';

    let extractedContent = '';

    let pageAuthor = '';

    let pageKeywords = [];

    let pageHeadings = [];

    let pageParagraphs = [];

    let pageLists = [];



    try {

      console.log('[Structural Content Crawler] Fetching full page HTML...');

      

      const response = await fetch(url, { 

        headers: { 

          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',

          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',

          'Accept-Language': 'en-US,en;q=0.5',

          'Accept-Encoding': 'gzip, deflate',

          'Connection': 'keep-alive',

          'Upgrade-Insecure-Requests': '1'

        },

        timeout: 30000

      });

      

      if (!response.ok) {

        return res.status(400).json({ 

          success: false, 

          error: `Failed to fetch URL: ${response.status} ${response.statusText}` 

        });

      }

      

      fullPageHtml = await response.text();

      console.log('[Structural Content Crawler] Successfully fetched HTML, length:', fullPageHtml.length);



      // Fallback: if HTML appears minimal (JS-rendered sites), try Playwright full page extraction

      if (!fullPageHtml || fullPageHtml.length < 2000 || /<body>\s*<\/body>/i.test(fullPageHtml)) {

        try {

          console.log('[Structural Content Crawler] HTML seems minimal, attempting Playwright full page extraction...');

          const { extractFullPageHtml } = require('./fullPageExtractor');

          const renderedHtml = await extractFullPageHtml(url);

          if (renderedHtml && renderedHtml.length > fullPageHtml.length) {

            fullPageHtml = renderedHtml;

            console.log('[Structural Content Crawler] Playwright extraction succeeded, new length:', fullPageHtml.length);

          }

        } catch (e) {

          console.warn('[Structural Content Crawler] Playwright extraction failed, continuing with fetched HTML:', e.message);

        }

      }

      

      // Enhanced content extraction using JSDOM

      const dom = new JSDOM(fullPageHtml);

      const document = dom.window.document;

      

      // Extract title and description

      const titleElement = document.querySelector('title');

      pageTitle = titleElement ? titleElement.textContent.trim() : '';

      

      const descElement = document.querySelector('meta[name="description"]');

      pageDescription = descElement ? descElement.getAttribute('content') : '';

      

      // Extract author information

      const authorElement = document.querySelector('meta[name="author"]') || 

                           document.querySelector('meta[property="article:author"]') ||

                           document.querySelector('meta[property="og:author"]') ||

                           document.querySelector('.author') ||

                           document.querySelector('[class*="author"]');

      pageAuthor = authorElement ? authorElement.textContent || authorElement.getAttribute('content') : '';

      

      // Extract keywords

      const keywordsElement = document.querySelector('meta[name="keywords"]');

      if (keywordsElement) {

        pageKeywords = keywordsElement.getAttribute('content').split(',').map(k => k.trim()).filter(k => k);

      }

      

      // Extract all headings for better content understanding

      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

      pageHeadings = Array.from(headings).map(h => ({

        level: h.tagName.toLowerCase(),

        text: h.textContent.trim(),

        id: h.id || '',

        className: h.className || ''

      }));

      

      // Extract all paragraphs for content analysis

      const paragraphs = document.querySelectorAll('p, article, section, div');

      pageParagraphs = Array.from(paragraphs)

        .filter(p => p.textContent.trim().length > 50) // Only meaningful paragraphs

        .map(p => p.textContent.trim());

      

      // Extract lists for better structure understanding

      const lists = document.querySelectorAll('ul, ol');

      pageLists = Array.from(lists).map(list => {

        const items = Array.from(list.querySelectorAll('li')).map(li => li.textContent.trim());

        return {

          type: list.tagName.toLowerCase(),

          items: items

        };

      });

      

      // Extract main content area

      const mainContent = document.querySelector('main') || 

                         document.querySelector('article') || 

                         document.querySelector('.content') ||

                         document.querySelector('.post-content') ||

                         document.querySelector('.entry-content') ||

                         document.body;

      

      // Get comprehensive text content

      extractedContent = mainContent.textContent

        .replace(/\s+/g, ' ')

        .trim();

      

      console.log('[Structural Content Crawler] Extracted content length:', extractedContent.length);

      console.log('[Structural Content Crawler] Found headings:', pageHeadings.length);

      console.log('[Structural Content Crawler] Found paragraphs:', pageParagraphs.length);

      console.log('[Structural Content Crawler] Found lists:', pageLists.length);

      console.log('[Structural Content Crawler] Author:', pageAuthor);

      console.log('[Structural Content Crawler] Keywords:', pageKeywords.length);

      

    } catch (error) {

      console.error('[Structural Content Crawler] Error crawling page:', error);

      return res.status(500).json({ 

        success: false, 

        error: `Failed to crawl page: ${error.message}` 

      });

    }



    // Step 2: Analyze the crawled content and generate real suggestions based on actual data

    const suggestions = [];

    

    console.log('[Structural Content Crawler] Analyzing content for suggestions...');

    console.log('[Structural Content Crawler] Content length:', extractedContent.length);

    console.log('[Structural Content Crawler] Found headings:', pageHeadings.length);

    console.log('[Structural Content Crawler] Found paragraphs:', pageParagraphs.length);

    console.log('[Structural Content Crawler] Found lists:', pageLists.length);

    console.log('[Structural Content Crawler] Author found:', pageAuthor ? 'Yes' : 'No');

    console.log('[Structural Content Crawler] Keywords found:', pageKeywords.length);

    // Ecommerce/blog page detection heuristics
    const hostForAbs = (() => { try { return new URL(url).origin; } catch { return ''; } })();
    const hasProductSchema = /"@type"\s*:\s*"Product"/i.test(fullPageHtml);
    const hasOgTypeProduct = /property=["']og:type["'][^>]*content=["']product["']/i.test(fullPageHtml);
    const pricePattern = /(?:[$₹€£]|INR|USD|EUR|GBP)\s?\d[\d.,]*/i;
    const hasPrice = pricePattern.test(fullPageHtml) || /product:price:amount/i.test(fullPageHtml);
    const hasAddToCart = /add to (cart|bag|basket)|buy now|checkout/i.test(fullPageHtml);
    const pathLooksProduct = /\/(?:product|products)\//i.test(url || '');
    const manyPrices = (fullPageHtml.match(new RegExp(pricePattern, 'gi')) || []).length >= 5;
    const manyProductCards = (fullPageHtml.match(/class=\"[^\"]*(product-card|grid-item|product-item)[^\"]*\"/gi) || []).length >= 3;
    const pathLooksCategory = /\/(?:category|categories|collection|collections|shop)\//i.test(url || '');

    const isProductPage = !!(hasProductSchema || hasOgTypeProduct || (hasPrice && hasAddToCart) || pathLooksProduct);
    const isCategoryPage = !isProductPage && !!(manyPrices || manyProductCards || pathLooksCategory);



    // Enhanced content improvement suggestions using AI analysis - DISABLED (user wants only sentence replacements)

    const generateContentImprovements = async (content, title, description) => {

      const improvements = [];

      

      // All keyword/meta suggestions disabled - returning empty array
      return improvements;

      // 1. Keyword optimization for AI visibility - DISABLED

      if (false && content.length > 200) {

        const keywordPrompt = `Analyze this content and suggest 5-8 relevant keywords that would improve AI visibility and search engine optimization. Focus on terms that are relevant to the topic but may be missing from the content.



Content: ${content.substring(0, 1000)}

Title: ${title}



Respond with only the keywords separated by commas, no explanations.`;

        

        try {

          const keywordResponse = await llmService.callGeminiAPI(keywordPrompt, 'gemini-2.0-flash');

          const suggestedKeywords = keywordResponse.text.split(',').map(k => k.trim()).filter(k => k.length > 0);

          

          if (suggestedKeywords.length > 0) {

            // Extract current content snippet for better context
            const contentSnippet = content.substring(0, 200).replace(/<[^>]*>/g, '').trim();

            improvements.push({

              type: 'keyword_optimization',

              priority: 'high',

              description: 'Add relevant keywords to improve AI visibility and SEO',

              implementation: `Add keywords: ${suggestedKeywords.join(', ')}`,

              impact: 'Improves AI understanding and search engine visibility',

              currentContent: `Content: "${contentSnippet}${contentSnippet.length === 200 ? '...' : ''}"`,

              enhancedContent: `Enhanced with keywords: ${suggestedKeywords.join(', ')}`,

              exactReplacement: {

                find: content.substring(0, 100),

                replace: `${content.substring(0, 100)} ${suggestedKeywords.slice(0, 3).join(' ')}`

              }

            });

          }

        } catch (error) {

          console.warn('Failed to generate keyword suggestions:', error);

        }

      }



      // 2. Content enhancement for AI understanding

      if (content.length > 500) {

        const enhancementPrompt = `Analyze this content and suggest 2-3 specific improvements to make it more AI-friendly and understandable. Focus on:

1. Replacing vague statements with specific information

2. Improving clarity for AI comprehension

3. Making content more informative and detailed



IMPORTANT: Provide complete replacement content, not just additions. Replace the entire paragraph or section with improved content.



Content: ${content.substring(0, 800)}

Title: ${title}



Respond with specific improvements in this format:

IMPROVEMENT 1: [complete replacement content for the first paragraph]

IMPROVEMENT 2: [complete replacement content for the second paragraph]

IMPROVEMENT 3: [complete replacement content for the third paragraph]`;

        

        try {

          const enhancementResponse = await llmService.callGeminiAPI(enhancementPrompt, 'gemini-2.0-flash');

          const improvements = enhancementResponse.text.split('IMPROVEMENT').filter(p => p.trim().length > 0);

          

          improvements.forEach((improvement, index) => {

            if (improvement.trim().length > 10) {

              const cleanImprovement = improvement.replace(/^\d+:\s*/, '').trim();

              improvements.push({

                type: 'content_enhancement',

                priority: 'medium',

                description: `Content improvement ${index + 1}: Replace paragraph with enhanced content`,

                implementation: cleanImprovement,

                impact: 'Improves AI comprehension and content clarity',

                currentContent: `Original paragraph content`,

                enhancedContent: cleanImprovement,

                exactReplacement: {

                  find: content.substring(index * 200, (index + 1) * 200),

                  replace: cleanImprovement

                }

              });

            }

          });

        } catch (error) {

          console.warn('Failed to generate content enhancements:', error);

        }

      }



      // 3. Sentence replacement for better AI understanding

      if (pageParagraphs.length > 0) {

        const sentencePrompt = `Analyze these paragraphs and identify 1-2 sentences that could be replaced with more specific, AI-friendly alternatives. Focus on:

1. Replacing vague or generic statements

2. Adding specific details and context
3. Making content more informative for AI



Paragraphs:

${pageParagraphs.slice(0, 3).join('\n\n')}



Respond with specific replacements in this format:

REPLACE: "[original sentence]"

WITH: "[improved sentence]"



Only suggest replacements that significantly improve the content.`;

        

        try {

          const sentenceResponse = await llmService.callGeminiAPI(sentencePrompt, 'gemini-2.0-flash');

          const replacements = sentenceResponse.text.split('REPLACE:').filter(p => p.trim().length > 0);

          

          replacements.forEach((replacement, index) => {

            const lines = replacement.split('\n');

            if (lines.length >= 2) {

              const original = lines[0].replace(/^"/, '').replace(/"$/, '').trim();

              const improved = lines[1].replace(/^WITH:\s*"/, '').replace(/"$/, '').trim();

              

              if (original.length > 10 && improved.length > 10) {

                improvements.push({

                  type: 'sentence_replacement',

                  priority: 'medium',

                  description: `Replace vague sentence with more specific content`,

                  implementation: `Replace: "${original}" with "${improved}"`,

                  impact: 'Improves content specificity and AI understanding',

                  currentContent: original,

                  enhancedContent: improved,

                  exactReplacement: {

                    find: original,

                    replace: improved

                  }

                });

              }

            }

          });

        } catch (error) {

          console.warn('Failed to generate sentence replacements:', error);

        }

      }



      return improvements;

    };



    // Generate AI-powered content improvements - DISABLED (user wants only sentence replacements)

    // let contentImprovements = [];

    // try {

    //   contentImprovements = await generateContentImprovements(extractedContent, pageTitle, pageDescription);

    //   suggestions.push(...contentImprovements);

    //   console.log('[Structural Content Crawler] Generated content improvements:', contentImprovements.length);

    // } catch (error) {

    //   console.warn('[Structural Content Crawler] Failed to generate content improvements:', error);

    // }



    // 1. Check for missing H1 heading - DISABLED (user wants only sentence replacements)

    // const h1Headings = pageHeadings.filter(h => h.level === 'h1');

    // if (h1Headings.length === 0) {

    //   const suggestedTitle = pageTitle || extractedContent.split(' ').slice(0, 8).join(' ');

    //   const currentContent = extractedContent.substring(0, 150);

    //   
      
    //   suggestions.push({

    //     type: 'heading',

    //     priority: 'high',

    //     description: 'Add a clear H1 heading to improve SEO and content structure',

    //     implementation: `<h1>${suggestedTitle}</h1>`,

    //     impact: 'Improves SEO ranking and content readability',

    //     currentContent: `Current page starts with: "${currentContent}${currentContent.length === 150 ? '...' : ''}"`,

    //     enhancedContent: `<h1>${suggestedTitle}</h1>`,

    //     exactReplacement: {

    //       find: '<body>',

    //       replace: `<body>\n    <h1>${suggestedTitle}</h1>`

    //     }

    //   });

    // }



    // NEW: AI-Powered Content Suggestions for AI Search Visibility

    // Generate suggestions using Gemini AI for better visibility in AI search engines
    if (isProductPage) {
      // PRODUCT PAGE: Generate AI-optimized content suggestions
      const h1 = (pageHeadings.find(h => (h.level||'').toLowerCase() === 'h1') || {}).text || pageTitle || '';
      const currencyMatch = fullPageHtml.match(/product:price:currency[^>]*content=["']([^"']+)/i) || fullPageHtml.match(/(?:priceCurrency|currency)"?\s*[:=]\s*"([A-Z]{3})"/i);
      const amountMatch = fullPageHtml.match(/product:price:amount[^>]*content=["']([^"']+)/i) || fullPageHtml.match(/(?:price|priceAmount)"?\s*[:=]\s*"?([0-9][0-9.,]*)"?/i) || fullPageHtml.match(/(?:[$₹€£]|INR|USD|EUR|GBP)\s?\d[\d.,]*/i);
      const brandMeta = fullPageHtml.match(/\"brand\"\s*:\s*\{[\s\S]*?\"name\"\s*:\s*\"([^\"]+)\"/i);
      const brand = (brandMeta && brandMeta[1]) || '';
      const priceCurrency = (currencyMatch && currencyMatch[1]) || 'USD';
      const priceAmountRaw = (amountMatch && amountMatch[1]) || '';
      const priceNumeric = priceAmountRaw.replace(/[^0-9.]/g, '');
      
      const productName = h1 || pageTitle || 'Product';
      const productPrice = priceNumeric ? `${priceCurrency} ${priceNumeric}` : '';
      const productBrand = brand || '';
      
      // Extract clean, readable sentences from product page
      const cleanSentences = (extractedContent || '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .split(/[.!?]+\s/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 30 || s.length > 500) return false;
          const letterRatio = ((s.match(/[a-zA-Z]/g) || []).length) / s.length;
          const specialCharRatio = ((s.match(/[{}\[\]<>|&;()]/g) || []).length) / s.length;
          const hasCode = /trackNode|getElementById|window\.|document\.|function\s*\(|reviewId|imageUrl|uidx/i.test(s);
          return letterRatio > 0.6 && specialCharRatio < 0.1 && !hasCode;
        })
        .slice(0, 10);
      
      console.log('[Product Suggestions] Extracted clean sentences:', cleanSentences.length);
      console.log('[Product Suggestions] Sample sentences:', cleanSentences.slice(0, 3));
      console.log('[Product Suggestions] Product context:', { productName, productBrand, productPrice });
      
      // Use AI to generate product-specific content improvements
      if (cleanSentences.length > 0 && process.env.GEMINI_API_KEY) {
        try {
          const productContext = `Product: ${productName}${productBrand ? ` by ${productBrand}` : ''}${productPrice ? ` - ${productPrice}` : ''}`;
          const prompt = `You are optimizing product page content for AI search engines (ChatGPT, Gemini, Perplexity).

${productContext}

Current product page sentences:
${cleanSentences.slice(0, 5).map((s, i) => `${i + 1}. "${s}"`).join('\n')}

Generate 3-5 content improvement suggestions. For each suggestion, provide:
1. The EXACT current sentence to replace (copy from above)
2. An improved version optimized for AI search visibility (include product name, specific benefits, clear features)
3. Why this improves AI visibility

IMPORTANT: In your JSON response, do NOT use contractions or apostrophes. Use full words only. For example: "it is" not "it's", "cannot" not "can't".

Respond ONLY with a valid JSON array (no markdown code blocks, no extra text):
[
  {
    "currentSentence": "exact sentence from above",
    "improvedSentence": "AI-optimized version with product details",
    "reason": "why this improves AI search visibility"
  }
]`;

          console.log('[Product Suggestions] Calling AI with prompt length:', prompt.length);
          const aiResponse = await llmService.callGeminiAPI(prompt, 'gemini-2.0-flash');
          console.log('[Product Suggestions] AI response received:', aiResponse.text?.substring(0, 500));
          
          let aiSuggestions = [];
          try {
            // Try standard JSON extraction first
            let rawJson = extractJSONFromMarkdown(aiResponse.text || '[]');
            aiSuggestions = Array.isArray(rawJson) ? rawJson : [];
            
            // If that failed, try manual extraction as fallback
            if (aiSuggestions.length === 0) {
              console.log('[Product Suggestions] JSON extraction returned empty, trying manual parse...');
              const text = aiResponse.text || '';
              
              // Extract each suggestion object manually
              const suggestionMatches = text.matchAll(/"currentSentence"\s*:\s*"([^"]+)"\s*,\s*"improvedSentence"\s*:\s*"([^"]+)"\s*,\s*"reason"\s*:\s*"([^"]+)"/g);
              
              for (const match of suggestionMatches) {
                aiSuggestions.push({
                  currentSentence: match[1],
                  improvedSentence: match[2],
                  reason: match[3]
                });
              }
              console.log('[Product Suggestions] Manual parse extracted:', aiSuggestions.length, 'suggestions');
            }
          } catch (parseError) {
            console.error('[Product Suggestions] All parsing failed:', parseError);
            aiSuggestions = [];
          }
          console.log('[Product Suggestions] Parsed AI suggestions:', aiSuggestions.length);
          
          if (Array.isArray(aiSuggestions) && aiSuggestions.length > 0) {
            aiSuggestions.forEach((sug, index) => {
              if (sug.currentSentence && sug.improvedSentence) {
                console.log(`[Product Suggestions] Adding suggestion ${index + 1}:`, {
                  current: sug.currentSentence.substring(0, 50),
                  improved: sug.improvedSentence.substring(0, 50)
                });
          suggestions.push({
            type: 'sentence_replacement',
                  priority: index === 0 ? 'high' : 'medium',
                  description: sug.reason || `Improve product content for AI search visibility`,
                  implementation: `Replace: "${sug.currentSentence.substring(0, 60)}..." WITH: "${sug.improvedSentence.substring(0, 60)}..."`,
                  impact: 'Improves product visibility in AI search engines like ChatGPT, Gemini, Perplexity',
                  currentContent: sug.currentSentence,
                  enhancedContent: sug.improvedSentence,
                  exactReplacement: { find: sug.currentSentence, replace: sug.improvedSentence },
                  sentenceReplacement: { find: sug.currentSentence, replace: sug.improvedSentence }
                });
              }
            });
            console.log('[Product Suggestions] Total suggestions added:', suggestions.length);
          } else {
            console.warn('[Product Suggestions] No valid AI suggestions parsed');
          }
        } catch (error) {
          console.error('[Product Suggestions] AI generation failed:', error);
        }
      } else {
        console.warn('[Product Suggestions] Not generating AI suggestions:', {
          hasCleanSentences: cleanSentences.length > 0,
          hasGeminiKey: !!process.env.GEMINI_API_KEY
        });
      }
    }

    // Category page schema suggestions disabled (user wants only sentence replacements)
    // if (isCategoryPage) {
    //   const linkRegex = /<a[^>]+href=[\"']([^\"']+)[\"'][^>]*>([\s\S]*?)<\/a>/gi;
    //   const items = [];
    //   const seen = new Set();
    //   let m;
    //   while ((m = linkRegex.exec(fullPageHtml)) && items.length < 10) {
    //     const href = m[1] || '';
    //     if (!/\/(product|products|item)\//i.test(href)) continue;
    //     let abs = href;
    //     try { abs = new URL(href, hostForAbs || url || 'https://example.com').href; } catch {}
    //     if (seen.has(abs)) continue;
    //     seen.add(abs);
    //     items.push({ '@type': 'ListItem', position: items.length + 1, url: abs });
    //   }
    //   if (items.length >= 2) {
    //     const itemListSchema = {
    //       '@context': 'https://schema.org',
    //       '@type': 'ItemList',
    //       itemListElement: items
    //     };
    //     const itemListJson = JSON.stringify(itemListSchema, null, 2);
    //     suggestions.push({
    //       type: 'schema',
    //       priority: 'medium',
    //       description: 'Add ItemList JSON-LD for category/listing pages',
    //       implementation: `<script type="application/ld+json">\n${itemListJson}\n</script>`,
    //       impact: 'Improves search understanding of product listings',
    //       currentContent: 'No ItemList schema detected',
    //       enhancedContent: 'Inject ItemList JSON-LD into <head>',
    //       exactReplacement: { find: '</head>', replace: `  <script type="application/ld+json">\n${itemListJson}\n</script>\n</head>` }
    //     });
    //   }
    // }

    // TL;DR paragraph suggestion disabled (user wants only sentence replacements)
    // if (!isProductPage && !isCategoryPage && (extractedContent || '').split(/\s+/).length > 600 && !/tl;dr|tldr|summary/i.test(extractedContent)) {
    //   const tldr = 'TL;DR: Summarize the key takeaways in 2-3 sentences here.';
    //   suggestions.push({
    //     type: 'paragraph',
    //     priority: 'medium',
    //     description: 'Add a TL;DR summary near the top of the article',
    //     implementation: `<p>${tldr}</p>`,
    //     impact: 'Improves user engagement and AI answerability',
    //     exactReplacement: { find: '<body>', replace: `<body>\n  <p>${tldr}</p>` }
    //   });
    // }

    // BLOG/ARTICLE PAGE: Generate AI-optimized content suggestions
    if (!isProductPage && !isCategoryPage) {
      // Extract clean, readable sentences from blog/article
      const cleanSentences = (extractedContent || '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .split(/[.!?]+\s/)
        .map(s => s.trim())
        .filter(s => {
          if (s.length < 30 || s.length > 500) return false;
          const letterRatio = ((s.match(/[a-zA-Z]/g) || []).length) / s.length;
          const specialCharRatio = ((s.match(/[{}\[\]<>|&;()]/g) || []).length) / s.length;
          const hasCode = /trackNode|getElementById|window\.|document\.|function\s*\(/i.test(s);
          return letterRatio > 0.6 && specialCharRatio < 0.1 && !hasCode;
        })
        .slice(0, 10);
      
      console.log('[Blog Suggestions] Extracted clean sentences:', cleanSentences.length);
      console.log('[Blog Suggestions] Sample sentences:', cleanSentences.slice(0, 3));
      
      // Use AI to generate blog-specific content improvements for AI search visibility
      if (cleanSentences.length > 0 && process.env.GEMINI_API_KEY) {
        try {
          const articleContext = `Article/Blog: ${pageTitle || 'Content'}`;
          const prompt = `You are optimizing blog/article content for AI search engines (ChatGPT, Gemini, Perplexity).

${articleContext}

Current article sentences:
${cleanSentences.slice(0, 5).map((s, i) => `${i + 1}. "${s}"`).join('\n')}

Generate 3-5 content improvement suggestions. For each suggestion, provide:
1. The EXACT current sentence to replace (copy from above)
2. An improved version optimized for AI search visibility (more specific, clear, informative, includes key topics)
3. Why this improves AI visibility

Focus on:
- Replacing vague statements with specific information
- Adding clear, factual details
- Making content more answerable by AI
- Improving clarity and directness

IMPORTANT: In your JSON response, do NOT use contractions or apostrophes. Use full words only. For example: "it is" not "it's", "cannot" not "can't".

Respond ONLY with a valid JSON array (no markdown code blocks, no extra text):
[
  {
    "currentSentence": "exact sentence from above",
    "improvedSentence": "AI-optimized version with specific details",
    "reason": "why this improves AI search visibility"
  }
]`;

          console.log('[Blog Suggestions] Calling AI with prompt length:', prompt.length);
          const aiResponse = await llmService.callGeminiAPI(prompt, 'gemini-2.0-flash');
          console.log('[Blog Suggestions] AI response received:', aiResponse.text?.substring(0, 500));
          
          let aiSuggestions = [];
          try {
            // Try standard JSON extraction first
            let rawJson = extractJSONFromMarkdown(aiResponse.text || '[]');
            aiSuggestions = Array.isArray(rawJson) ? rawJson : [];
            
            // If that failed, try manual extraction as fallback
            if (aiSuggestions.length === 0) {
              console.log('[Blog Suggestions] JSON extraction returned empty, trying manual parse...');
              const text = aiResponse.text || '';
              
              // Extract each suggestion object manually
              const suggestionMatches = text.matchAll(/"currentSentence"\s*:\s*"([^"]+)"\s*,\s*"improvedSentence"\s*:\s*"([^"]+)"\s*,\s*"reason"\s*:\s*"([^"]+)"/g);
              
              for (const match of suggestionMatches) {
                aiSuggestions.push({
                  currentSentence: match[1],
                  improvedSentence: match[2],
                  reason: match[3]
                });
              }
              console.log('[Blog Suggestions] Manual parse extracted:', aiSuggestions.length, 'suggestions');
            }
          } catch (parseError) {
            console.error('[Blog Suggestions] All parsing failed:', parseError);
            aiSuggestions = [];
          }
          console.log('[Blog Suggestions] Parsed AI suggestions:', aiSuggestions.length);
          
          if (Array.isArray(aiSuggestions) && aiSuggestions.length > 0) {
            aiSuggestions.forEach((sug, index) => {
              if (sug.currentSentence && sug.improvedSentence) {
                console.log(`[Blog Suggestions] Adding suggestion ${index + 1}`);
            suggestions.push({
              type: 'sentence_replacement',
                  priority: index === 0 ? 'high' : 'medium',
                  description: sug.reason || `Improve content for AI search visibility`,
                  implementation: `Replace: "${sug.currentSentence.substring(0, 60)}..." WITH: "${sug.improvedSentence.substring(0, 60)}..."`,
                  impact: 'Improves content visibility in AI search engines like ChatGPT, Gemini, Perplexity',
                  currentContent: sug.currentSentence,
                  enhancedContent: sug.improvedSentence,
                  exactReplacement: { find: sug.currentSentence, replace: sug.improvedSentence },
                  sentenceReplacement: { find: sug.currentSentence, replace: sug.improvedSentence }
            });
          }
        });
            console.log('[Blog Suggestions] Total suggestions added:', suggestions.length);
          } else {
            console.warn('[Blog Suggestions] No valid AI suggestions parsed');
          }
        } catch (error) {
          console.error('[Blog Suggestions] AI generation failed:', error);
        }
      } else {
        console.warn('[Blog Suggestions] Not generating AI suggestions:', {
          hasCleanSentences: cleanSentences.length > 0,
          hasGeminiKey: !!process.env.GEMINI_API_KEY
          });
        }
      }

    // OLD suggestion logic removed - now using AI-powered suggestions above

    // All meta/structure suggestions below are disabled (user wants only sentence replacements)
    if (false) {
    // 2. Check for missing meta description

    if (!fullPageHtml.includes('meta name="description"') && !fullPageHtml.includes('meta name=\'description\'')) {

      const suggestedDescription = pageDescription || extractedContent.substring(0, 160);

      

      suggestions.push({

        type: 'meta_description',

        priority: 'high',

        description: 'Add a compelling meta description for better SEO',

        implementation: `<meta name="description" content="${suggestedDescription}">`,

        impact: 'Improves click-through rates from search results',

        currentContent: 'No meta description found in page head',

        enhancedContent: `Add meta description: "${suggestedDescription}"`,

        exactReplacement: {

          find: '</head>',

          replace: `    <meta name="description" content="${suggestedDescription}">\n</head>`

        }

      });

    }



    // 3. Check for missing title tag

    if (!fullPageHtml.includes('<title>')) {

      const suggestedTitle = pageTitle || extractedContent.split(' ').slice(0, 6).join(' ');

      

      suggestions.push({

        type: 'title',

        priority: 'high',

        description: 'Add a descriptive title tag',

        implementation: `<title>${suggestedTitle}</title>`,

        impact: 'Improves SEO and browser tab display',

        currentContent: 'No title tag found in page head',

        enhancedContent: `Add title: "${suggestedTitle}"`,

        exactReplacement: {

          find: '</head>',

          replace: `    <title>${suggestedTitle}</title>\n</head>`

        }

      });

    }



    // 4. Check for long paragraphs and suggest breaking them

    const longParagraphs = pageParagraphs.filter(p => p.length > 200);

    if (longParagraphs.length > 0) {

      const exampleParagraph = longParagraphs[0];

      const sentences = exampleParagraph.split(/[.!?]+/).filter(s => s.trim().length > 10);

      if (sentences.length > 2) {

        const midPoint = Math.floor(sentences.length / 2);

        const firstHalf = sentences.slice(0, midPoint).join('. ') + '.';

        const secondHalf = sentences.slice(midPoint).join('. ');

        

        suggestions.push({

          type: 'paragraph',

          priority: 'medium',

          description: 'Break content into smaller paragraphs for better readability',

          implementation: `<p>${firstHalf}</p>\n<p>${secondHalf}</p>`,

          impact: 'Improves readability and user engagement',

          currentContent: `Long paragraph (${exampleParagraph.length} chars): "${exampleParagraph.substring(0, 100)}..."`,

          enhancedContent: `Split into 2 paragraphs: "${firstHalf.substring(0, 80)}..." and "${secondHalf.substring(0, 80)}..."`,

          exactReplacement: {

            find: exampleParagraph,

            replace: `<p>${firstHalf}</p>\n<p>${secondHalf}</p>`

          }

        });

      }

    }



    // 5. Check for missing lists and suggest converting content to lists

    if (!extractedContent.includes('•') && !extractedContent.includes('-') && !extractedContent.includes('1.')) {

      const sentences = extractedContent.split(/[.!?]+/).filter(s => s.trim().length > 20);

      const listCandidates = sentences.slice(0, 3);

      

      if (listCandidates.length > 0) {

        const listItems = listCandidates.map(sentence => `<li>${sentence.trim()}</li>`).join('\n');

        const actualListContent = listCandidates.join('. ');

        

        suggestions.push({

          type: 'list',

          priority: 'medium',

          description: 'Add bullet points or numbered lists for key information',

          implementation: `<ul>\n${listItems}\n</ul>`,

          impact: 'Makes content more scannable and LLM-friendly',

          currentContent: `Content without lists: "${actualListContent.substring(0, 120)}..."`,

          enhancedContent: `Convert to bullet points: ${listCandidates.length} items`,

          exactReplacement: {

            find: actualListContent,

            replace: `<ul>\n${listItems}\n</ul>`

          }

        });

      }

    }



    // 6. Check for missing subheadings

    const h2Headings = pageHeadings.filter(h => h.level === 'h2');

    const h3Headings = pageHeadings.filter(h => h.level === 'h3');

    

    if (h2Headings.length === 0 && h3Headings.length === 0 && extractedContent.length > 500) {

      // Find a good topic for subheading from the content

      const sentences = extractedContent.split(/[.!?]+/).filter(s => s.trim().length > 20);

      const suggestedSubheading = sentences.length > 0 ? sentences[0].substring(0, 50) : 'Key Topics';

      

      suggestions.push({

        type: 'subheadings',

        priority: 'high',

        description: 'Add subheadings to break up long content sections',

        implementation: `<h2>${suggestedSubheading}</h2>`,

        impact: 'Improves content scannability and SEO structure',

        currentContent: `Long content (${extractedContent.length} chars) without subheadings`,

        enhancedContent: `Add H2 subheading: "${suggestedSubheading}"`,

        exactReplacement: {

          find: extractedContent.substring(0, 100),

          replace: `<h2>${suggestedSubheading}</h2>\n\n${extractedContent.substring(0, 100)}`

        }

      });

    }







    // 8. Check for missing Open Graph tags

    if (!fullPageHtml.includes('og:title') && !fullPageHtml.includes('property="og:title"')) {

      suggestions.push({

        type: 'open_graph',

        priority: 'medium',

        description: 'Add Open Graph tags for better social media sharing',

        implementation: `<meta property="og:title" content="${pageTitle || 'Article Title'}">

<meta property="og:description" content="${pageDescription || extractedContent.substring(0, 160)}">

<meta property="og:type" content="article">

<meta property="og:url" content="${url}">`,

        impact: 'Improves social media sharing appearance',

        currentContent: 'No Open Graph tags found',

        enhancedContent: `Add OG tags for "${pageTitle || 'Article'}"`,

        exactReplacement: {

          find: '</head>',

          replace: `    <meta property="og:title" content="${pageTitle || 'Article Title'}">

    <meta property="og:description" content="${pageDescription || extractedContent.substring(0, 160)}">

    <meta property="og:type" content="article">

    <meta property="og:url" content="${url}">
</head>`

        }

      });

    }



    // 9. Check for missing viewport meta tag

    if (!fullPageHtml.includes('viewport') && !fullPageHtml.includes('name="viewport"')) {

      suggestions.push({

        type: 'viewport',

        priority: 'medium',

        description: 'Add viewport meta tag for responsive design',

        implementation: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,

        impact: 'Ensures proper mobile display',

        currentContent: 'No viewport meta tag found',

        enhancedContent: 'Add responsive viewport meta tag',

        exactReplacement: {

          find: '</head>',

          replace: `    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>`

        }

      });

    }



    // 10. Check for missing canonical URL

    if (!fullPageHtml.includes('rel="canonical"') && !fullPageHtml.includes('rel=\'canonical\'')) {

      suggestions.push({

        type: 'canonical',

        priority: 'medium',

        description: 'Add canonical URL to prevent duplicate content issues',

        implementation: `<link rel="canonical" href="${url}">`,

        impact: 'Prevents SEO duplicate content issues',

        currentContent: 'No canonical URL found',

        enhancedContent: `Add canonical URL: ${url}`,

        exactReplacement: {

          find: '</head>',

          replace: `    <link rel="canonical" href="${url}">\n</head>`

        }

      });

    }



    // 11. Check for missing keywords meta tag

    if (!fullPageHtml.includes('meta name="keywords"') && !fullPageHtml.includes('meta name=\'keywords\'')) {

      const keywords = extractedContent.split(/\s+/)

        .filter(word => word.length > 4)

        .slice(0, 10)

        .join(', ');

      

      suggestions.push({

        type: 'keywords',

        priority: 'low',

        description: 'Add keywords meta tag for better SEO',

        implementation: `<meta name="keywords" content="${keywords}">`,

        impact: 'Provides additional SEO context',

        currentContent: 'No keywords meta tag found',

        enhancedContent: `Add keywords: "${keywords.substring(0, 50)}..."`,

        exactReplacement: {

          find: '</head>',

          replace: `    <meta name="keywords" content="${keywords}">\n</head>`

        }

      });

    }



    // 12. Content structure analysis and suggestions

    if (pageParagraphs.length > 0) {

      const avgParagraphLength = pageParagraphs.reduce((sum, p) => sum + p.length, 0) / pageParagraphs.length;

      

      if (avgParagraphLength > 300) {

        suggestions.push({

          type: 'content_structure',

          priority: 'medium',

          description: 'Optimize paragraph structure for better readability',

          implementation: 'Break long paragraphs into shorter, more digestible sections',

          impact: 'Improves user engagement and readability',

          currentContent: `Average paragraph length: ${Math.round(avgParagraphLength)} characters`,

          enhancedContent: 'Break into shorter paragraphs (150-200 chars each)',

          exactReplacement: {

            find: pageParagraphs[0],

            replace: pageParagraphs[0].split('. ').map(s => `<p>${s.trim()}</p>`).join('\n')

          }

        });

      }

    }



    // 13. List optimization suggestions

    if (pageLists.length === 0 && pageParagraphs.length > 3) {

      const listCandidates = pageParagraphs.slice(0, 3);

      const listItems = listCandidates.map(p => `<li>${p.substring(0, 100)}...</li>`).join('\n');

      

      suggestions.push({

        type: 'list_optimization',

        priority: 'medium',

        description: 'Convert content into structured lists for better organization',

        implementation: `<ul>\n${listItems}\n</ul>`,

        impact: 'Improves content scannability and user experience',

        currentContent: `Content has ${pageParagraphs.length} paragraphs but no lists`,

        enhancedContent: 'Convert key points into bullet lists',

        exactReplacement: {

          find: listCandidates.join(' '),

          replace: `<ul>\n${listItems}\n</ul>`

        }

      });

    }



    // 14. AI-friendly content restructuring

    if (extractedContent.length > 1000) {

      const aiRestructurePrompt = `Analyze this content and suggest how to restructure it to be more AI-friendly. Focus on:

1. Improving the existing content structure

2. Making content more scannable for AI

3. Enhancing readability and flow



IMPORTANT: Provide improved content that replaces the existing content, not structured metadata or labels. Do not add "Headline:", "Introduction:", etc. labels.



Content: ${extractedContent.substring(0, 800)}



Respond with specific restructuring suggestions in this format:

RESTRUCTURE: [improved content that replaces the original]`;

      

      try {

        const restructureResponse = await llmService.callGeminiAPI(aiRestructurePrompt, 'gemini-2.0-flash');

        const restructureSuggestions = restructureResponse.text.split('RESTRUCTURE:').filter(p => p.trim().length > 0);

        

        restructureSuggestions.forEach((suggestion, index) => {

          const cleanSuggestion = suggestion.trim();

          if (cleanSuggestion.length > 20) {

            suggestions.push({

              type: 'ai_content_restructure',

              priority: 'medium',

              description: `AI-friendly content restructuring: Improve content structure and readability`,

              implementation: cleanSuggestion,

              impact: 'Improves AI comprehension and content structure',

              currentContent: 'Original content structure',

              enhancedContent: cleanSuggestion,

              exactReplacement: {

                find: extractedContent.substring(index * 300, (index + 1) * 300),

                replace: cleanSuggestion

              }

            });

          }

        });

      } catch (error) {

        console.warn('Failed to generate AI restructuring suggestions:', error);

      }

    }

    } // End of if (false) block - all meta/structure suggestions disabled



    // Step 3: Calculate scores based on actual content

    let seoScore = 50;

    let llmScore = 50;

    let readabilityScore = 50;



    if (extractedContent.length > 300) seoScore += 10;

    if (fullPageHtml.includes('<h1>')) seoScore += 15;

    if (fullPageHtml.includes('<h2>')) seoScore += 10;

    if (fullPageHtml.includes('meta name="description"')) seoScore += 10;

    if (fullPageHtml.includes('<title>')) seoScore += 10;

    if (extractedContent.length > 1000) seoScore += 10;



    if (suggestions.length < 3) llmScore += 15;

    if (fullPageHtml.includes('<h2>')) llmScore += 10;

    if (extractedContent.includes('•') || extractedContent.includes('-')) llmScore += 5;



    const sentences = extractedContent.split(/[.!?]+/).length;

    const words = extractedContent.split(/\s+/).length;

    const avgSentenceLength = words / sentences;

    

    if (avgSentenceLength < 20) readabilityScore += 20;

    if (avgSentenceLength < 15) readabilityScore += 10;

    if (extractedContent.includes('\n\n')) readabilityScore += 10;

    if (extractedContent.includes('•') || extractedContent.includes('-')) readabilityScore += 10;



    // Step 4: Enhanced metadata extraction

    const extractAuthor = (html) => {

      // Try multiple author extraction methods

      const authorPatterns = [

        /<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i,

        /<meta[^>]*property=["']article:author["'][^>]*content=["']([^"']+)["']/i,

        /<meta[^>]*property=["']og:author["'][^>]*content=["']([^"']+)["']/i,

        /<span[^>]*class=["'][^"']*author[^"']*["'][^>]*>([^<]+)<\/span>/i,

        /<div[^>]*class=["'][^"']*author[^"']*["'][^>]*>([^<]+)<\/div>/i,

        /<p[^>]*class=["'][^"']*author[^"']*["'][^>]*>([^<]+)<\/p>/i,

        /by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,

        /author[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,

        /written\s+by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i

      ];

      

      for (const pattern of authorPatterns) {

        const match = html.match(pattern);

        if (match && match[1] && match[1].length > 2) {

          return match[1].trim();

        }

      }

      

      // Try to extract from JSON-LD schema

      const schemaMatch = html.match(/"author":\s*{[^}]*"name":\s*"([^"]+)"/i);

      if (schemaMatch) {

        return schemaMatch[1].trim();

      }

      

      return 'Unknown';

    };



    const extractKeywords = (html, content) => {

      // Prefer meta keywords if present

      const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);

      if (keywordsMatch) {

        return keywordsMatch[1].split(',').map(k => k.trim()).filter(Boolean);

      }



      const raw = (content || '').toString();

      const text = raw.replace(/\s+/g, ' ').trim();

      const lower = text.toLowerCase();



      // Tokenize and remove stopwords

      const tokens = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

      const stop = new Set(['this','that','with','from','they','have','will','been','were','said','each','which','their','time','would','there','could','other','about','many','then','them','these','some','what','when','where','your','very','just','into','than','more','only','over','such','most','even','make','like','through','back','after','first','good','well','should','because','those','people','still','every','here','think','also','another','come','before','always','both','together','often','important','until','once','second','later','real','almost','above','sometimes','being','leave','within','between','across','around','over','under','into','onto','among','while','whereas']);



      // Build n-grams (2-3 words) excluding stopwords with AI-friendly boosting

      const candidates = new Map();

      const scorePhrase = (phrase, bonus = 0) => {

        const key = phrase.toLowerCase();

        let score = 1 + bonus;

        

        // Boost AI-friendly technical terms significantly

        if (aiTechnicalTerms.includes(key)) score += 5;

        if (aiTechnicalTerms.some(term => key.includes(term))) score += 3;

        

        // Boost longer, more specific terms

        if (phrase.split(' ').length >= 2) score += 2;

        if (phrase.length > 8) score += 1;

        

        // Boost compound terms and technical jargon

        if (phrase.includes('-') || /[A-Z]/.test(phrase)) score += 2;

        

        const prev = candidates.get(key) || 0;

        candidates.set(key, prev + score);

      };



      const filtered = tokens.filter(t => t.length > 2 && !stop.has(t));

      for (let i = 0; i < filtered.length; i++) {

        const w1 = filtered[i];

        scorePhrase(w1, 0); // allow specific domain single words too

        if (i + 1 < filtered.length) {

          const w2 = filtered[i + 1];

          scorePhrase(`${w1} ${w2}`, 1);

        }

        if (i + 2 < filtered.length) {

          const w2 = filtered[i + 1];

          const w3 = filtered[i + 2];

          scorePhrase(`${w1} ${w2} ${w3}`, 2);

        }

      }



      // Boost phrases from title and headings with AI focus

      const boostFromText = (t) => {

        const words = t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

        for (let i = 0; i < words.length; i++) {

          if (i + 1 < words.length) scorePhrase(`${words[i]} ${words[i+1]}`, 3);

          if (i + 2 < words.length) scorePhrase(`${words[i]} ${words[i+1]} ${words[i+2]}`, 4);

        }

      };

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

      if (titleMatch) boostFromText(titleMatch[1]);

      const headingMatch = html.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];

      headingMatch.forEach(h => boostFromText(h.replace(/<[^>]*>/g, '')));



      // Keep only phrases that actually occur in the original text as whole words

      const existsInText = (p) => new RegExp(`(^|[^a-z0-9])${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(lower);



      // AI-friendly keyword patterns that increase AI visibility

      const aiFriendlyPatterns = [

        // Technical terms that AI models recognize well

        /(?:artificial intelligence|ai|machine learning|ml|deep learning|neural networks|nlp|natural language processing)/gi,

        /(?:data science|analytics|insights|metrics|performance|optimization|efficiency|automation)/gi,

        /(?:cloud computing|saas|platform|integration|api|workflow|pipeline|architecture)/gi,

        /(?:business intelligence|reporting|dashboard|visualization|trends|patterns|correlations)/gi,

        /(?:digital transformation|innovation|technology|solution|strategy|implementation|deployment)/gi,

        /(?:user experience|ux|interface|design|usability|accessibility|responsive|mobile)/gi,

        /(?:security|compliance|governance|risk|audit|monitoring|alerting|incident)/gi,

        /(?:scalability|performance|reliability|availability|backup|recovery|disaster)/gi,

        // Domain-specific terms for better AI recognition

        /(?:migration|tenant|onedrive|sharepoint|teams|cloudfuze|microsoft 365|google workspace)/gi,

        /(?:version history|permissions|ownership|metadata|timestamps|retention|cross-tenant|cutover)/gi

      ];



      // Extract AI-friendly technical terms

      const aiTechnicalTerms = [];

      aiFriendlyPatterns.forEach(pattern => {

        const matches = text.match(pattern);

        if (matches) {

          aiTechnicalTerms.push(...matches.map(m => m.toLowerCase()));

        }

      });



      // Extract structured data and schema markup keywords

      const schemaKeywords = [];

      const schemaMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/gi);

      if (schemaMatch) {

        schemaMatch.forEach(schema => {

          try {

            const schemaData = JSON.parse(schema.replace(/<script[^>]*>/, '').replace(/<\/script>/, ''));

            if (schemaData.name) {

              const nameWords = schemaData.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);

              nameWords.forEach(word => scorePhrase(word, 4));

            }

            if (schemaData.description) {

              const descWords = schemaData.description.toLowerCase().split(/\s+/).filter(w => w.length > 4);

              descWords.slice(0, 5).forEach(word => scorePhrase(word, 2));

            }

          } catch (e) {

            // Skip invalid JSON

          }

        });

      }



      const entries = Array.from(candidates.entries())

        .filter(([p]) => p.length >= 4 && existsInText(p))

        .map(([p, s]) => {

          let score = s;

          // Additional AI-friendly boosting

          if (aiTechnicalTerms.some(term => p.includes(term))) score += 3;

          if (p.split(' ').length >= 2) score += 2; // bigram/trigram bonus

          return [p, score];

        })

        .sort((a, b) => b[1] - a[1]);



      // Deduplicate overlapping phrases by favoring longer, higher-scored ones

      const selected = [];

      const used = new Set();

      for (const [phrase] of entries) {

        const wordsInPhrase = phrase.split(' ').length;

        if (wordsInPhrase === 1 && !aiTechnicalTerms.some(term => phrase.includes(term))) continue; // skip generic unigrams unless AI-friendly

        const key = phrase.toLowerCase();

        if (used.has(key)) continue;

        selected.push(phrase);

        used.add(key);

        if (selected.length >= 15) break; // Increased to 15 for more AI-friendly keywords

      }



      return selected;

    };



    // Generate metadata using actual extracted data

    const extractedMetadata = generateMetadata(fullPageHtml, extractedContent);

    const metadata = {

      title: pageTitle || extractedContent.split(' ').slice(0, 8).join(' '),

      description: pageDescription || extractedContent.substring(0, 160),

      keywords: pageKeywords.length > 0 ? pageKeywords : extractedMetadata.keywords,

      author: pageAuthor || extractedMetadata.author,

      publishDate: extractedMetadata.publishDate, // Use extracted date from metadataExtractor

      lastModified: extractedMetadata.lastModified, // Use extracted date from metadataExtractor

      readingTime: Math.ceil(extractedContent.split(/\s+/).length / 200),

      // Accurate word count: collapse whitespace and split on spaces

      wordCount: (extractedContent || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length,

      language: 'en',

      // Additional extracted data

      headings: pageHeadings.length,

      paragraphs: pageParagraphs.length,

      lists: pageLists.length,

      contentStructure: {

        headings: pageHeadings,

        paragraphs: pageParagraphs.slice(0, 5), // First 5 paragraphs

        lists: pageLists.slice(0, 3) // First 3 lists

      }

    };



    // Schema markup suggestion DISABLED - user wants only AI content suggestions
    /* DISABLED
    suggestions.push({

      type: 'schema',

      priority: 'high',

      description: 'Add structured data markup for better search engine understanding',

      implementation: `<script type="application/ld+json">

{

  "@context": "https://schema.org",

  "@type": "Article",

  "headline": "${pageTitle || 'Article Title'}",

  "description": "${pageDescription || extractedContent.substring(0, 160)}",

  "author": {

    "@type": "Person",

    "name": "Author Name"

  },

  "publisher": {

    "@type": "Organization",

    "name": "Publisher Name"

  },

  "datePublished": "${metadata.publishDate || ''}",

  "dateModified": "${metadata.lastModified || ''}"

}
</script>`,

      impact: 'Improves search engine visibility and rich snippets',

      currentContent: 'No structured data markup found',

      enhancedContent: `Add JSON-LD schema for "${pageTitle || 'Article'}"`,

      exactReplacement: {

        find: '</head>',

        replace: `    <script type="application/ld+json">

{

  "@context": "https://schema.org",

  "@type": "Article",

  "headline": "${pageTitle || 'Article Title'}",

  "description": "${pageDescription || extractedContent.substring(0, 160)}",

  "author": {

    "@type": "Person",

    "name": "Author Name"

  },

  "publisher": {

    "@type": "Organization",

    "name": "Publisher Name"

  },

  "datePublished": "${metadata.publishDate || ''}",

  "dateModified": "${metadata.lastModified || ''}"

}

</script>\n</head>`

      }

    });
    END DISABLED SCHEMA SUGGESTION */

    // Step 5: Generate structured data

    const structuredData = {

      articleSchema: {

        '@context': 'https://schema.org',

        '@type': 'Article',

        headline: metadata.title,

        description: metadata.description,

        author: {

          '@type': 'Person',

          name: metadata.author

        },

        publisher: {

          '@type': 'Organization',

          name: 'Publisher Name'

        },

        datePublished: metadata.publishDate || null,

        dateModified: metadata.lastModified || null,

        mainEntityOfPage: {

          '@type': 'WebPage',

          '@id': url

        }

      }

    };

    // Enrich structured data for ecommerce contexts
    try {
      if (isProductPage) {
        const h1 = (pageHeadings.find(h => (h.level||'').toLowerCase() === 'h1') || {}).text || pageTitle || '';
        const currencyMatch = fullPageHtml.match(/product:price:currency[^>]*content=["']([^"']+)/i) || fullPageHtml.match(/(?:priceCurrency|currency)"?\s*[:=]\s*"([A-Z]{3})"/i);
        const amountMatch = fullPageHtml.match(/product:price:amount[^>]*content=["']([^"']+)/i) || fullPageHtml.match(/(?:price|priceAmount)"?\s*[:=]\s*"?([0-9][0-9.,]*)"?/i) || fullPageHtml.match(/(?:[$₹€£]|INR|USD|EUR|GBP)\s?\d[\d.,]*/i);
        const availabilityMatch = fullPageHtml.match(/availability[^>]*\b(InStock|OutOfStock)\b/i);
        const brandMeta = fullPageHtml.match(/\"brand\"\s*:\s*\{[\s\S]*?\"name\"\s*:\s*\"([^\"]+)\"/i);
        const brand = (brandMeta && brandMeta[1]) || '';
        const priceCurrency = (currencyMatch && currencyMatch[1]) || 'USD';
        const priceAmountRaw = (amountMatch && amountMatch[1]) || '';
        const priceNumeric = priceAmountRaw.replace(/[^0-9.]/g, '');
        const availability = availabilityMatch ? `https://schema.org/${availabilityMatch[1]}` : undefined;

        structuredData.productSchema = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: h1 || 'Product',
          description: pageDescription || (extractedContent || '').slice(0,160),
          ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
          ...(priceNumeric ? { offers: { '@type': 'Offer', price: priceNumeric, priceCurrency, ...(availability ? { availability } : {}), url } } : {})
        };
      } else if (isCategoryPage) {
        const linkRegex = /<a[^>]+href=[\"']([^\"']+)[\"'][^>]*>([\s\S]*?)<\/a>/gi;
        const items = [];
        const seen = new Set();
        let m;
        while ((m = linkRegex.exec(fullPageHtml)) && items.length < 10) {
          const href = m[1] || '';
          if (!/\/(product|products|item)\//i.test(href)) continue;
          let abs = href;
          try { abs = new URL(href, hostForAbs || url || 'https://example.com').href; } catch {}
          if (seen.has(abs)) continue;
          seen.add(abs);
          items.push({ '@type': 'ListItem', position: items.length + 1, url: abs });
        }
        if (items.length >= 2) {
          structuredData.itemListSchema = {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: items
          };
        }
      }
    } catch (e) {
      console.warn('[Structural Content Crawler] Failed to enrich ecommerce structured data:', e?.message);
    }



      // Generate FAQs strictly from the provided content

      let faqs = [];

      try {

        const normalizeQ = (t) => {

          const q = String(t || '').trim();

          if (!q) return '';

          return q.endsWith('?') ? q : `${q}?`;

        };



        // 1) Prefer LLM but constrain it to content-only facts

        if (process.env.GEMINI_API_KEY) {

          const prompt = `You are given the exact page text. Create 3-5 FAQs that are strictly grounded in this text. 

Return a pure JSON array of objects: [{"question":"...","answer":"..."}] with no extra text. 

Rules: 

- Only include facts explicitly present in the content. 

- Keep answers concise (<= 300 chars) and copy or closely paraphrase sentences from the text. 

- If you cannot find enough facts, return fewer items. 

Title: ${pageTitle}\n\nContent:\n${extractedContent.substring(0, 6000)}`;

          try {

            const resp = await llmService.callGeminiAPI(prompt, 'gemini-2.0-flash');

            const json = extractJSONFromMarkdown(resp.text || '[]');

            if (Array.isArray(json)) {

              faqs = json

                .filter(f => f && f.question && f.answer)

                .slice(0, 5)

                .map(f => ({

                  question: normalizeQ(String(f.question).slice(0, 200)),

                  answer: String(f.answer).slice(0, 500)

                }));

            }

          } catch (e) {

            console.warn('[Structural Content Crawler] LLM FAQ generation failed, falling back to heuristics.');

          }

        }



        // 2) Heuristic fallback: derive from headings and first paragraphs

        if (faqs.length === 0) {

          const candidates = [];

          if (pageTitle) {

            candidates.push({ q: normalizeQ(`What is ${pageTitle}`), a: (pageParagraphs[0] || extractedContent).slice(0, 300) });

          }

          // Use up to first 4 headings with the first available paragraph as answer

          pageHeadings.slice(0, 4).forEach((h, idx) => {

            const question = normalizeQ(h.text);

            const answer = (pageParagraphs[idx + 1] || pageParagraphs[idx] || pageParagraphs[0] || extractedContent).slice(0, 300);

            if (question && answer) candidates.push({ q: question, a: answer });

          });

          // Deduplicate by question text

          const seen = new Set();

          faqs = candidates.filter(c => {

            const key = c.q.toLowerCase();

            if (seen.has(key)) return false;

            seen.add(key);

            return true;

          }).slice(0, 5).map(c => ({ question: c.q, answer: c.a }));

        }

      } catch (e) {

        faqs = [];

      }



    console.log('[Structural Content Crawler] Generated suggestions:', suggestions.length);

    console.log('[Structural Content Crawler] Sample suggestion:', suggestions[0]);



      // Compute GEO score breakdown and total

      const computeGeoScore = ({ url, extractedContent, fullPageHtml, structuredData, metadata }) => {

        const text = (extractedContent || '').toString();

        const html = (fullPageHtml || '').toString();

        const words = text.trim().split(/\s+/).filter(Boolean).length || 1;

        const host = (() => { try { return new URL(url).host.replace(/^www\./,''); } catch { return ''; } })();



        // Evidence & Attribution

        const links = Array.from(html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)).map(m => m[1]);

        const external = links.filter(href => { try { const u = new URL(href, url); return u.host.replace(/^www\./,'') !== host; } catch { return false; } });

        const citationPerK = external.length / (words/1000);

        let citation_density = Math.max(0, Math.min(5, citationPerK * 0.6)); // scale down density

        if (citationPerK > 8) citation_density = Math.max(0, 5 - (citationPerK-8)*0.8);

        const sentenceCount = (text.match(/[.!?]\s/g) || []).length || 1;

        const citation_coverage = Math.max(0, Math.min(15, (external.length / Math.max(5, sentenceCount)) * 10)); // lower coverage slope

        const uniqueDomains = new Set(external.map(h => { try { return new URL(h, url).host.replace(/^www\./,''); } catch { return h; } })).size;

        const qualityBoost = external.reduce((acc, href) => {

          try { const h = new URL(href, url).host;

            if (/\.gov$|\.gov\./i.test(h)) return acc+2.0;

            if (/\.edu$|\.edu\./i.test(h)) return acc+1.5;

            if (/\b(nature|ieee|acm|who|un|iso|w3c)\b/i.test(h)) return acc+1.5;

            return acc+0.5; } catch { return acc; }

        }, 0);

        const httpsShare = external.length ? external.filter(h => /^https:/i.test(h)).length / external.length : 0;

        const domainDiversityBonus = Math.min(3, uniqueDomains * 0.4);

        const citation_quality = Math.max(0, Math.min(10, qualityBoost * 0.35 + httpsShare * 2 + domainDiversityBonus));

        const evidence_attribution_score = parseFloat((citation_coverage + citation_quality + citation_density).toFixed(1));



        // Answerability & Snippetability

        const hasTLDR = /\b(tl;dr|tldr|key takeaways|summary|in short|quick summary)\b/i.test(text);

        const bulletsNearTop = /\n\s*[\-•\*]\s+/.test(text.slice(0, 800)) ? 1 : 0;

        const tldr_presence = Math.min(7, (hasTLDR ? 5.0 : 0) + (bulletsNearTop ? 1.0 : 0));

        const shortBlock = text.split(/\n\n/).find(p => p.trim().split(/\s+/).length <= 90);

        const direct_answer = Math.min(10, shortBlock ? 7.5 : 1.5);

        const faqItems = (structuredData && structuredData.faqSchema && Array.isArray(structuredData.faqSchema.mainEntity)) ? structuredData.faqSchema.mainEntity.length : 0;

        const faq_alignment = Math.min(8, faqItems > 0 ? Math.min(8, 2.5 + Math.log2(1+faqItems)*1.5) : 0.5);

        const answerability_snippetability_score = parseFloat((direct_answer + tldr_presence + faq_alignment).toFixed(1));



        // Structured Understanding

        const jsonldTypes = [];

        try { if (structuredData?.articleSchema) jsonldTypes.push('Article'); if (structuredData?.faqSchema) jsonldTypes.push('FAQPage'); } catch {}

        const hasArticleBasics = !!(structuredData?.articleSchema?.headline && structuredData?.articleSchema?.author && structuredData?.articleSchema?.datePublished);

        const json_ld_completeness = Math.min(8, (jsonldTypes.includes('Article') ? (hasArticleBasics ? 5 : 3) : 0) + (jsonldTypes.includes('FAQPage') ? 2 : 0));

        // Metrics computed deterministically (no hard-coded zeros)

        const ldScripts = (html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi) || []).length;

        const facts_api_presence = Math.max(0, Math.min(6, (ldScripts >= 1 ? 3 : 0) + (/schema\.org/i.test(html) ? 1.5 : 0) + (/faq|howto|article|webpage/i.test(html) ? 1.0 : 0)));

        const llm_discovery = Math.max(0, Math.min(6, (/ai\.txt/i.test(html) ? 3 : 0) + (/sitemap\.xml/i.test(html) ? 1.5 : 0) + (/robots\.txt/i.test(html) ? 1.0 : 0) + (/feed|rss/i.test(html) ? 0.5 : 0)));

        const structured_understanding_score = parseFloat((json_ld_completeness + facts_api_presence + llm_discovery).toFixed(1));



        // Freshness & Stability

        const now = new Date();

        const last = new Date(metadata?.lastModified || metadata?.publishDate || now.toISOString());

        const days = Math.max(0, Math.floor((now - last)/(1000*60*60*24)));

        const freshness = days <= 30 ? 5.5 : days >= 365 ? 0 : parseFloat((5.5 * (1 - (days-30)/335)).toFixed(1));

        const cadence = (metadata?.publishDate && metadata?.lastModified && metadata.publishDate !== metadata.lastModified) ? 3.0 : 0.8;

        const freshScore = parseFloat((freshness + cadence).toFixed(1));



        // Entity & Topic Coverage

        const entities = new Set((text.match(/[A-Z][a-zA-Z0-9\-]{2,}(?:\s+[A-Z][a-zA-Z0-9\-]{2,})*/g) || []).slice(0, 200));

        const entity_coverage = Math.min(5, entities.size >= 10 ? 5 : entities.size * 0.4);

        const h2CountFast = (html.match(/<h2\b/gi) || []).length; const h3CountFast = (html.match(/<h3\b/gi) || []).length;

        const topic_recall = Math.max(0, Math.min(5, h2CountFast + Math.min(5, Math.floor(h3CountFast * 0.5))));

        const entityScore = parseFloat((entity_coverage + topic_recall).toFixed(1));



        const plaintext_extraction = Math.min(3, words > 200 ? 2.5 : 1.0);

        const copyability = Math.min(2, /\n\s*[\-•\*]|<table|<code/i.test(html) ? 1.5 : 1.0);

        const retrieval = parseFloat((plaintext_extraction + copyability).toFixed(1));



        // Normalize by category maxima and apply weights to produce 0–100

        const evidence_pct = evidence_attribution_score / 30.0;

        const ans_pct = answerability_snippetability_score / 25.0;

        const structured_pct = structured_understanding_score / 20.0;

        const fresh_pct = freshScore / 10.0;

        const entity_pct = entityScore / 10.0;

        const retrieval_pct = retrieval / 5.0;

        const total = 0.30*evidence_pct + 0.25*ans_pct + 0.20*structured_pct + 0.10*fresh_pct + 0.10*entity_pct + 0.05*retrieval_pct;

        

        return {

          geo_score_total: parseFloat(Math.max(0, Math.min(100, total*100)).toFixed(1)),

          categories: {

            evidence_attribution: { score: evidence_attribution_score, evidence_pct, citation_coverage, citation_quality, citation_density },

            answerability_snippetability: { score: answerability_snippetability_score, ans_pct, direct_answer, tldr_presence, faq_alignment },

            structured_understanding: { score: structured_understanding_score, structured_pct, json_ld_completeness, facts_api_presence, llm_discovery },

            freshness_stability: { score: freshScore, fresh_pct, freshness, cadence },

            entity_topic_coverage: { score: entityScore, entity_pct, entity_coverage, topic_recall },

            retrieval_copyability: { score: retrieval, retrieval_pct, plaintext_extraction, copyability }

          }

        };

      };



      const geo = computeGeoScore({ url, extractedContent, fullPageHtml, structuredData, metadata });



      // Content Quality Score (editorial) per rubric

      const computeContentQuality = ({ url, text, html, target_query, audience, competitors_context }) => {

        const pageText = (text || '').toString();

        const pageHtml = (html || '').toString();

        const words = pageText.trim().split(/\s+/).filter(Boolean);

        const wordCount = words.length || 1;

        const sentences = pageText.split(/[.!?]+\s/).filter(s => s.trim().length > 0);

        const sentenceCount = Math.max(1, sentences.length);



        // syllable estimate (very rough)

        const syllables = words.reduce((acc, w) => acc + (w.toLowerCase().match(/[aeiouy]{1,2}/g)?.length || 1), 0);

        const flesch = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllables / wordCount);

        const flesch_mapped = Math.max(0, Math.min(8, (flesch - 30) / 10)); // 30->0, 110->8



        const avgSentenceLen = wordCount / sentenceCount;

        const avg_sentence_len = Math.max(0, Math.min(6, 6 - Math.max(0, (avgSentenceLen - 18) / 4))); // best around <=18



        const passiveMatches = pageText.match(/\b(was|were|been|being|be)\s+\w+ed\b/gi) || [];

        const passive_ratio = passiveMatches.length / sentenceCount;

        const passive_voice_ratio = Math.max(0, Math.min(6, 6 - passive_ratio * 12));

        const readability_clarity = parseFloat((flesch_mapped + avg_sentence_len + passive_voice_ratio).toFixed(1)); // /20 cap handled by mapping



        // Structure & coherence

        const h1 = (pageHtml.match(/<h1\b/gi) || []).length;

        const h2 = (pageHtml.match(/<h2\b/gi) || []).length;

        const h3 = (pageHtml.match(/<h3\b/gi) || []).length;

        const heading_hierarchy = Math.max(0, Math.min(6, (h1 === 1 ? 3 : 1) + Math.min(3, h2 * 0.5 + h3 * 0.25)));

        // Paragraph detection: prefer HTML <p> blocks, fallback to newlines

        const pMatches = [...(pageHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [])].map(m => m[1]);

        let paragraphs = pMatches.map(s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);

        if (paragraphs.length === 0) paragraphs = pageText.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

        if (paragraphs.length === 0) paragraphs = pageText.split(/\n+/).map(p => p.trim()).filter(Boolean);

        if (paragraphs.length === 0) paragraphs = [pageText.trim()].filter(Boolean);

        const paragraphWords = paragraphs.map(p => p.split(/\s+/).filter(Boolean).length);

        const withinBand = paragraphWords.filter(n => n >= 60 && n <= 160).length / Math.max(1, paragraphWords.length);

        const paragraph_length_distribution = Math.max(0, Math.min(5, withinBand * 5));

        const transitions = (pageText.match(/\b(in conclusion|however|moreover|furthermore|in addition|on the other hand|for example|for instance)\b/gi) || []).length;

        const transitions_logical = Math.max(0, Math.min(4, transitions * 0.5));

        const structure_coherence = parseFloat((heading_hierarchy + paragraph_length_distribution + transitions_logical).toFixed(1));



        // Depth & coverage

        const subtopicSignals = h2 + h3;

        const subtopic_completeness = Math.max(0, Math.min(12, (subtopicSignals * 2) + Math.min(4, Math.floor(wordCount / 600))));

        const examplesSignals = (pageText.match(/\b(for example|for instance|case study|use case|e\.g\.)\b/gi) || []).length + (pageHtml.match(/<ul|<ol|<pre|<code|<table/gi) || []).length;

        const examples_use_cases = Math.max(0, Math.min(8, examplesSignals * 1.2));

        const depth_coverage = parseFloat((subtopic_completeness + examples_use_cases).toFixed(1));



        // Originality (requires competitors_context; conservative otherwise)

        let embedding_similarity_penalty = 5.0; // start mid if no data

        let ngram_jaccard_penalty = 2.5;

        if (Array.isArray(competitors_context) && competitors_context.length > 0) {

          const compTexts = competitors_context.map(c => (c.snippet || c.text || '').toString().toLowerCase());

          const ngrams = new Set(pageText.toLowerCase().match(/\b\w{4,}\b/g) || []);

          const overlaps = compTexts.map(t => {

            const set2 = new Set(t.match(/\b\w{4,}\b/g) || []);

            const inter = [...ngrams].filter(x => set2.has(x)).length;

            const uni = new Set([...ngrams, ...set2]).size || 1;

            return inter / uni;

          });

          const jaccard = overlaps.length ? overlaps.reduce((a,b)=>a+b,0)/overlaps.length : 0;

          ngram_jaccard_penalty = Math.max(0, Math.min(5, (1 - jaccard) * 5));

          // crude similarity proxy: token overlap ratio used to simulate embedding similarity

          const simPenalty = Math.max(0, Math.min(10, (1 - Math.min(0.92, 0.7 + jaccard)) * 12));

          embedding_similarity_penalty = simPenalty;

        }

        const originality = parseFloat((embedding_similarity_penalty + ngram_jaccard_penalty).toFixed(1));



        // Accuracy & source use (light)

        const numbers = pageText.match(/\b\d{2,}(?:[.,]\d+)?\b/g) || [];

        const links = Array.from(pageHtml.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)).map(m=>m[1]);

        const citesNearNumbers = numbers.slice(0, 10).filter(n => new RegExp(n).test(pageHtml)).length;

        const claim_consistency_sample = Math.max(0, Math.min(5, (citesNearNumbers / Math.max(1, Math.min(10, numbers.length))) * 5));

        const quoteBlocks = (pageHtml.match(/<blockquote/gi) || []).length;

        const quote_paraphrase_integrity = Math.max(0, Math.min(5, (links.length ? 2.5 : 1) + Math.min(2.5, quoteBlocks * 0.8)));

        const accuracy_source_use = parseFloat((quote_paraphrase_integrity + claim_consistency_sample).toFixed(1));



        // Style & tone

        const longWords = (pageText.match(/\b\w{12,}\b/g) || []).length;

        const jargon_ratio = Math.max(0, Math.min(4, 4 - (longWords / wordCount) * 60)); // more long words => lower

        const audience_match = Math.max(0, Math.min(6, audience ? 4.0 : 3.0));

        const style_tone = parseFloat((audience_match + jargon_ratio).toFixed(1));



        // Accessibility & presentation

        const imgs = (pageHtml.match(/<img\b/gi) || []).length;

        const imgsWithAlt = (pageHtml.match(/<img\b[^>]*alt=\s*["'][^"']+["']/gi) || []).length;

        const alt_text_coverage = Math.max(0, Math.min(4, imgs ? (imgsWithAlt / imgs) * 4 : 3));

        const table_code_formatting_quality = Math.max(0, Math.min(3, ((pageHtml.match(/<table|<pre|<code/gi) || []).length) * 0.8));

        // Use tag-stripped HTML length to better approximate visible text proportion

        const htmlStripped = pageHtml.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '');

        const text_html_ratio_val = (pageText || htmlStripped).length / Math.max(1, pageHtml.length);

        const text_html_ratio = Math.max(0, Math.min(3, text_html_ratio_val * 6)); // ~0.5 => 3

        const accessibility_presentation = parseFloat((alt_text_coverage + table_code_formatting_quality + text_html_ratio).toFixed(1));



        // Content Quality: Normalize to category maxima and apply weights

        const readability_pct = readability_clarity / 20.0;

        const structure_pct = structure_coherence / 15.0;

        const depth_pct = depth_coverage / 20.0;

        const originality_pct = originality / 15.0;

        const accuracy_pct = accuracy_source_use / 10.0;

        const style_pct = style_tone / 10.0;

        const access_pct = accessibility_presentation / 10.0;

        const total =

          0.20*readability_pct +

          0.15*structure_pct +

          0.20*depth_pct +

          0.15*originality_pct +

          0.10*accuracy_pct +

          0.10*style_pct +

          0.10*access_pct;

        const content_quality_total = parseFloat(Math.max(0, Math.min(100, total*100)).toFixed(1));



        return {

          content_quality_total,

          categories: {

            readability_clarity: { score: readability_clarity, flesch_mapped, avg_sentence_len, passive_voice_ratio: passive_voice_ratio },

            structure_coherence: { score: structure_coherence, heading_hierarchy, paragraph_length_distribution, transitions_logical_order: transitions_logical },

            depth_coverage: { score: depth_coverage, subtopic_completeness, examples_use_cases },

            originality: { score: originality, embedding_similarity_penalty, ngram_jaccard_penalty },

            accuracy_source_use: { score: accuracy_source_use, quote_paraphrase_integrity, claim_consistency_sample },

            style_tone: { score: style_tone, audience_match, jargon_ratio },

            accessibility_presentation: { score: accessibility_presentation, alt_text_coverage, table_code_formatting_quality, text_html_ratio }

          }

        };

      };



      const quality = computeContentQuality({ url, text: extractedContent, html: fullPageHtml, target_query: null, audience: null, competitors_context: null });



      const analysisResult = {

      originalContent: extractedContent,

      structuredContent: fullPageHtml, // Include the full HTML for code section

        seoScore: Math.min(seoScore, 100),

        geoScoreTotal: geo.geo_score_total,

        geoBreakdown: geo.categories,

        contentQualityScoreTotal: quality.content_quality_total,

        contentQualityBreakdown: quality.categories,

      llmOptimizationScore: Math.min(llmScore, 100),

      readabilityScore: Math.min(readabilityScore, 100),

      suggestions: suggestions.filter(s => s.type === 'sentence_replacement'),

        metadata,

        faqs, // top-level FAQs strictly derived from content

      structuredData,

      fullPageHtml: fullPageHtml, // Include the full crawled HTML

      pageTitle: pageTitle,

      pageDescription: pageDescription,

      crawledUrl: url

    };

    console.log('[Structural Content Crawler] Final suggestions count:', analysisResult.suggestions.length);
    console.log('[Structural Content Crawler] Returning analysis with suggestions');

    return res.json({ success: true, analysis: analysisResult });



  } catch (error) {

    console.error('[Structural Content Crawler] Error:', error);

    return res.status(500).json({ 

      success: false, 

      error: 'Failed to crawl and analyze structural content' 

    });

  }

});
// Persist last structure analysis per user (keyed by URL)

app.post('/api/structure/last', authenticateToken, async (req, res) => {

  try {

    const userId = req.user?.id || req.user?.email || 'anonymous';

    const { analysis } = req.body || {};

    if (!analysis) return res.status(400).json({ success: false, error: 'analysis payload required' });

    

    const url = (analysis?.crawledUrl || analysis?.url || analysis?.metadata?.url || '').toString().slice(0, 512) || null;

    const contentHash = require('crypto').createHash('md5').update(JSON.stringify(analysis)).digest('hex');

    

    // Save to PostgreSQL database

    await db.saveStructureAnalysis({

      id: require('crypto').randomUUID(),

      userId,

      url,

      contentHash,

      analysis,

      fullPageHtml: analysis.fullPageHtml || null,

      originalContent: analysis.originalContent || null

    });

    

    return res.json({ success: true });

  } catch (e) {

    console.error('[Structure Analysis] Error saving:', e);

    return res.status(500).json({ success: false, error: 'Failed to persist analysis' });

  }

});



// Fetch last structure analysis per user; optionally by url

app.get('/api/structure/last', authenticateToken, async (req, res) => {

  try {

    const userId = req.user?.id || req.user?.email || 'anonymous';

    const url = (req.query?.url || '').toString().slice(0, 512) || null;

    

    // Get from PostgreSQL database

    const analysis = await db.getLastStructureAnalysis(userId, url);

    

    if (analysis) {

      return res.json({ success: true, analysis: analysis.analysis });

    }

    

    return res.json({ success: true, analysis: null });

  } catch (e) {

    console.error('[Structure Analysis] Error fetching:', e);

    return res.status(500).json({ success: false, error: 'Failed to fetch analysis' });

  }

});

// Google Analytics 4 metrics for a specific page

app.post('/api/analytics/ga4', authenticateToken, async (req, res) => {

  try {

    const { propertyId = process.env.GA4_PROPERTY_ID, pagePath, days = 28 } = req.body || {};

    if (!propertyId) return res.status(400).json({ success: false, error: 'GA4 propertyId is required' });

    if (!pagePath) return res.status(400).json({ success: false, error: 'pagePath is required (e.g., /blog/post)' });



    // Lazy import to avoid requiring package unless used

    const { BetaAnalyticsDataClient } = require('@google-analytics/data');



    // Support key as JSON string or environment vars

    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

    const serviceKey = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/\\n/g, '\n');

    const serviceJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) : null;



    const client = new BetaAnalyticsDataClient({

      credentials: serviceJson || (serviceEmail && serviceKey ? { client_email: serviceEmail, private_key: serviceKey } : undefined)

    });



    const endDate = 'today';

    const startDate = `${days}daysAgo`;



    const [report] = await client.runReport({

      property: `properties/${propertyId}`,

      dateRanges: [{ startDate, endDate }],

      dimensions: [{ name: 'pagePath' }],

      metrics: [

        { name: 'screenPageViews' },

        { name: 'totalUsers' },

        { name: 'sessions' },

        { name: 'averageSessionDuration' }

      ],

      dimensionFilter: {

        filter: {

          fieldName: 'pagePath',

          stringFilter: { value: pagePath }

        }

      }

    });



    let metrics = { views: 0, users: 0, sessions: 0, avgSessionDuration: 0 };

    if (report.rows && report.rows.length > 0) {

      const row = report.rows[0];

      const get = (idx) => parseFloat(row.metricValues[idx]?.value || '0');

      metrics = {

        views: get(0),

        users: get(1),

        sessions: get(2),

        avgSessionDuration: get(3)

      };

    }



    return res.json({ success: true, metrics, debug: { rowCount: report.rows?.length || 0 } });

  } catch (error) {

    console.error('[GA4] Error:', error);

    return res.status(500).json({ success: false, error: 'Failed to fetch GA4 metrics', details: error.message });

  }

});



// Google Search Console metrics for a specific page

app.post('/api/analytics/search-console', authenticateToken, async (req, res) => {

  try {

    const { siteUrl = process.env.GSC_SITE_URL, pageUrl, days = 28 } = req.body || {};

    if (!siteUrl) return res.status(400).json({ success: false, error: 'GSC siteUrl is required (e.g., https://example.com/ )' });

    if (!pageUrl) return res.status(400).json({ success: false, error: 'pageUrl is required (full URL to the page)' });



    const { google } = require('googleapis');

    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

    const serviceKey = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/\\n/g, '\n');

    const serviceJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) : null;



    const jwtClient = new (require('google-auth-library').JWT)(

      serviceJson?.client_email || serviceEmail,

      undefined,

      serviceJson?.private_key || serviceKey,

      ['https://www.googleapis.com/auth/webmasters.readonly']

    );

    await jwtClient.authorize();



    const webmasters = google.webmasters({ version: 'v3', auth: jwtClient });

    const endDate = new Date();

    const startDate = new Date();

    startDate.setDate(endDate.getDate() - (parseInt(days, 10) || 28));



    const resp = await webmasters.searchanalytics.query({

      siteUrl,

      requestBody: {

        startDate: startDate.toISOString().slice(0, 10),

        endDate: endDate.toISOString().slice(0, 10),

        dimensions: ['query'],

        rowLimit: 25,

        dimensionFilterGroups: [

          {

            groupType: 'and',

            filters: [

              { dimension: 'page', operator: 'equals', expression: pageUrl }

            ]

          }

        ]

      }

    });



    const rows = resp.data.rows || [];

    const totals = rows.reduce((acc, r) => {

      acc.clicks += r.clicks || 0;

      acc.impressions += r.impressions || 0;

      return acc;

    }, { clicks: 0, impressions: 0 });

    const avgCtr = rows.length ? (rows.reduce((s, r) => s + (r.ctr || 0), 0) / rows.length) : 0;

    const avgPosition = rows.length ? (rows.reduce((s, r) => s + (r.position || 0), 0) / rows.length) : 0;



    return res.json({

      success: true,

      metrics: {

        clicks: Math.round(totals.clicks),

        impressions: Math.round(totals.impressions),

        ctr: +(avgCtr * 100).toFixed(2),

        position: +avgPosition.toFixed(2)

      },

      topQueries: rows.slice(0, 10).map(r => ({ query: (r.keys || [])[0] || '', clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: +(r.ctr * 100).toFixed(2), position: +(r.position || 0).toFixed(1) }))

    });

  } catch (error) {

    console.error('[Search Console] Error:', error);

    return res.status(500).json({ success: false, error: 'Failed to fetch Search Console metrics', details: error.message });

  }

});



// LLM Visibility metrics for a specific page (beta)

// Returns counts by provider representing how often the page/domain appears in LLM answers/citations.

// Note: This is a lightweight placeholder implementation that can be wired to real automation later.

app.post('/api/analytics/llm-visibility', authenticateToken, async (req, res) => {

  try {

    const { pageUrl, days = 28 } = req.body || {};

    if (!pageUrl) return res.status(400).json({ success: false, error: 'pageUrl is required (full URL to the page)' });



    // Derive domain for domain-level visibility fallbacks

    let domain = '';

    try { domain = new URL(pageUrl).hostname; } catch {}



    // Placeholder counts; to be replaced by real automation (Perplexity/Bing Copilot/ChatGPT scraping via Selenium)

    // When wired, attach: { provider, count, lastChecked, sampleAnswers: [...] }

    const byProvider = [

      { provider: 'ChatGPT', count: 0 },

      { provider: 'Bing Copilot', count: 0 },

      { provider: 'Perplexity', count: 0 }

    ];



    // If we have an AI visibility/citation service available, attempt a simple domain-level estimation

    try {

      if (typeof citationAnalysisService?.analyzeCitations === 'function' && domain) {

        const domainAnalysis = await citationAnalysisService.analyzeCitations(domain);

        const approx = Math.max(0, Math.floor((domainAnalysis?.totalCitations || 0) * 0.0001));

        // Distribute a small portion across providers for a rough signal

        byProvider[0].count = Math.floor(approx * 0.4);

        byProvider[1].count = Math.floor(approx * 0.35);

        byProvider[2].count = Math.floor(approx * 0.25);

      }

    } catch (e) {

      // Silent fallback to zeros

    }



    const total = byProvider.reduce((s, p) => s + (p.count || 0), 0);

    return res.json({ success: true, metrics: { total, byProvider, days }, note: 'LLM visibility is a beta estimate. Connect automation for real counts.' });

  } catch (error) {

    console.error('[LLM Visibility] Error:', error);

    return res.status(500).json({ success: false, error: 'Failed to fetch LLM visibility metrics', details: error.message });

  }

});



// Shopify API Endpoints

// Get all Shopify connections

app.get('/api/shopify/connections', authenticateToken, async (req, res) => {

  try {

    // For now, return empty array - in production this would query the database

    res.json({ success: true, connections: [] });

  } catch (error) {

    console.error('[Shopify Connections] Error:', error);

    res.status(500).json({ success: false, error: error.message });

  }

});



// Connect Shopify storefront

app.post('/api/shopify/storefront/connect', authenticateToken, async (req, res) => {

  try {

    console.log('[Shopify Storefront Connect] Request body:', req.body);

    const { shop, token } = req.body;

    

    if (!shop || !token) {

      console.log('[Shopify Storefront Connect] Missing fields - shop:', shop, 'token:', token ? 'present' : 'missing');

      return res.status(400).json({ 

        success: false, 

        error: 'Missing required fields: shop and token' 

      });

    }



    // Validate shop format

    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;

    console.log('[Shopify Storefront Connect] Using shop domain:', shopDomain);

    

    // Test the connection by making a simple API call

    try {

      const testUrl = `https://${shopDomain}/admin/api/2023-10/shop.json`;

      console.log('[Shopify Storefront Connect] Testing URL:', testUrl);

      

      const testResponse = await axios.get(testUrl, {

        headers: {

          'X-Shopify-Access-Token': token,

          'Accept': 'application/json'

        }

      });

      

      console.log('[Shopify Storefront Connect] Test response status:', testResponse.status);

      

      if (testResponse.status === 200) {

        // Store the connection (in production, save to database)

        const connection = {

          shop: shopDomain,

          token: token,

          connectedAt: new Date().toISOString(),

          userId: req.user.id

        };

        

        console.log('[Shopify Storefront Connect] Connection successful');

        // For now, just return success - in production, save to database

        res.json({ 

          success: true, 

          message: 'Storefront connected successfully',

          connection: {

            shop: shopDomain,

            connectedAt: connection.connectedAt

          }

        });

      } else {

        console.log('[Shopify Storefront Connect] Invalid response status:', testResponse.status);

        res.status(400).json({ 

          success: false, 

          error: 'Invalid token or shop domain' 

        });

      }

    } catch (testError) {

      console.error('[Shopify Storefront Connect] Test failed:', testError.message);

      console.error('[Shopify Storefront Connect] Test error details:', testError.response?.data);

      res.status(400).json({ 

        success: false, 

        error: 'Failed to connect to Shopify store. Please check your token and shop domain.' 

      });

    }

  } catch (error) {

    console.error('[Shopify Storefront Connect] Error:', error);

    res.status(500).json({ success: false, error: error.message });

  }

});



// Get storefront connections

app.get('/api/shopify/storefront/connections', authenticateToken, async (req, res) => {

  try {

    // For now, return empty array - in production this would query the database

    res.json({ success: true, connections: [] });

  } catch (error) {

    console.error('[Shopify Storefront Connections] Error:', error);

    res.status(500).json({ success: false, error: error.message });

  }

});



// Delete Shopify connection

app.delete('/api/shopify/connection', authenticateToken, async (req, res) => {

  try {

    const { shop } = req.query;

    

    if (!shop) {

      return res.status(400).json({ 

        success: false, 

        error: 'Missing required parameter: shop' 

      });

    }



    // For now, just return success - in production, delete from database

    res.json({ 

      success: true, 

      message: 'Connection deleted successfully' 

    });

  } catch (error) {

    console.error('[Shopify Connection Delete] Error:', error);

    res.status(500).json({ success: false, error: error.message });

  }

});



// Test storefront connection

app.get('/api/shopify/storefront/test', authenticateToken, async (req, res) => {

  try {

    const { shop } = req.query;

    

    if (!shop) {

      return res.status(400).json({ 

        success: false, 

        error: 'Missing required parameter: shop' 

      });

    }



    // For now, return a mock successful test

    res.json({ 

      success: true, 

      message: 'Storefront connection test successful',

      shop: shop

    });

  } catch (error) {

    console.error('[Shopify Storefront Test] Error:', error);

    res.status(500).json({ success: false, error: error.message });

  }

});



// Shopify Credentials endpoints

app.get('/api/shopify/credentials', authenticateToken, async (req, res) => {

  try {

    // For now, return empty array - in production this would query the database

    res.json({ success: true, credentials: [] });

  } catch (error) {

    console.error('[Shopify Credentials] Error:', error);

    res.status(500).json({ success: false, error: error.message });

  }

});
app.post('/api/shopify/credentials', authenticateToken, async (req, res) => {

  try {

    const { name, apiKey, apiSecret, redirectUri } = req.body;

    

    if (!apiKey || !apiSecret) {

      return res.status(400).json({ 

        success: false, 

        error: 'Missing required fields: apiKey and apiSecret' 

      });

    }



    // For now, just return success - in production, save to database

    const credential = {

      id: Date.now().toString(),

      name: name || 'Shopify Credential',

      apiKey: apiKey,

      apiSecret: apiSecret,

      redirectUri: redirectUri,

      createdAt: new Date().toISOString(),

      userId: req.user.id

    };



    res.json({ 

      success: true, 

      message: 'Credential created successfully',

      credential: {

        id: credential.id,

        name: credential.name,

        createdAt: credential.createdAt

      }

    });

  } catch (error) {

    console.error('[Shopify Credentials Create] Error:', error);

    res.status(500).json({ success: false, error: error.message });

  }

});



app.delete('/api/shopify/credentials/:id', authenticateToken, async (req, res) => {

  try {

    const { id } = req.params;

    

    if (!id) {

      return res.status(400).json({ 

        success: false, 

        error: 'Missing required parameter: id' 

      });

    }



    // For now, just return success - in production, delete from database

    res.json({ 

      success: true, 

      message: 'Credential deleted successfully' 

    });

  } catch (error) {

    console.error('[Shopify Credentials Delete] Error:', error);

    res.status(500).json({ success: false, error: error.message });

  }

});



// Start server

app.listen(PORT, '0.0.0.0', () => {

  console.log(`Server running on port ${PORT}`);

  console.log(`Server bound to all interfaces (0.0.0.0:${PORT})`);

  console.log(`Authentication: Enabled`);

  console.log(`Database: Connected`);

  console.log(`Structural Content Crawler: Available at /api/structural-content/crawl`);

});



// Period Badges: rolling averages for metrics (moved below app/db init)

app.get('/api/period-averages/:competitor', async (req, res) => {

  try {

    const competitor = req.params.competitor;

    const { metric = 'RAVI' } = req.query;

    const now = new Date();

    const toIso = now.toISOString();

    const monthlyFrom = new Date(now); monthlyFrom.setDate(monthlyFrom.getDate() - 30);

    const yearlyFrom = new Date(now); yearlyFrom.setDate(yearlyFrom.getDate() - 365);

    const monthlyRows = await db.getVisibilityLogsBetween(competitor, String(metric), monthlyFrom.toISOString(), toIso);

    const yearlyRows = await db.getVisibilityLogsBetween(competitor, String(metric), yearlyFrom.toISOString(), toIso);

    const avg = (rows) => rows.length > 0 ? rows.reduce((a, r) => a + (Number(r.value) || 0), 0) / rows.length : null;

    const monthlyAvg = avg(monthlyRows);

    const yearlyAvg = avg(yearlyRows);

    res.json({

      success: true,

      competitor,

      metric,

      monthly: {

        avg: monthlyAvg !== null ? Number(monthlyAvg.toFixed(2)) : null,

        lowConfidence: monthlyRows.length < 5,

        count: monthlyRows.length

      },

      yearly: {

        avg: yearlyAvg !== null ? Number(yearlyAvg.toFixed(2)) : null,

        lowConfidence: yearlyRows.length < 5,

        count: yearlyRows.length

      }

    });

  } catch (e) {

    console.error('[Period Averages] Error:', e);

    res.status(500).json({ success: false, error: 'Failed to compute period averages' });

  }

});