# Backend Shopify Endpoints Implementation Guide

## Current Issue
Your backend server is running on `http://localhost:5000` but missing Shopify API endpoints.
The frontend is trying to call `/api/shopify/storefront/connect` which returns 404.

## Quick Solution: Development Mode
I've added a **Development Mode** to the Shopify modal that allows you to test the UI without backend APIs:

1. Open the Shopify Connect modal
2. When you see the "Backend API Not Available" warning
3. Click **"Enable Dev Mode"** 
4. Now all Shopify operations will be simulated locally!

## Required Backend Endpoints

Here are the minimal endpoints you need to implement:

### 1. Storefront Connection (Priority 1)
```javascript
// POST /api/shopify/storefront/connect
app.post('/api/shopify/storefront/connect', (req, res) => {
  const { shop, token } = req.body;
  
  // Validate the storefront token with Shopify
  // Store the connection in your database
  
  res.json({ 
    success: true, 
    message: 'Storefront token saved successfully' 
  });
});
```

### 2. List Connections (Priority 1)
```javascript
// GET /api/shopify/connections
app.get('/api/shopify/connections', (req, res) => {
  // Get user's connected shops from database
  res.json({ 
    shops: [
      { shop: 'example-store.myshopify.com', type: 'oauth' },
      { shop: 'another-store.myshopify.com', type: 'storefront' }
    ]
  });
});
```

### 3. Disconnect Shop (Priority 2)
```javascript
// DELETE /api/shopify/connection
app.delete('/api/shopify/connection', (req, res) => {
  const { shop } = req.query;
  
  // Remove connection from database
  
  res.json({ 
    success: true, 
    message: `Disconnected from ${shop}` 
  });
});
```

### 4. OAuth Flow (Priority 2)
```javascript
// GET /api/shopify/auth/start
app.get('/api/shopify/auth/start', (req, res) => {
  const { shop, credsId } = req.query;
  
  // Redirect to Shopify OAuth
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(authUrl);
});
```

### 5. Credentials Management (Priority 3)
```javascript
// POST /api/shopify/credentials
app.post('/api/shopify/credentials', (req, res) => {
  const { name, apiKey, apiSecret, redirectUri } = req.body;
  
  // Store credentials securely in database
  
  res.json({ 
    success: true, 
    id: 'cred_123',
    message: 'Credentials saved' 
  });
});

// GET /api/shopify/credentials
app.get('/api/shopify/credentials', (req, res) => {
  // Get user's saved credentials
  res.json({ 
    items: [
      { id: 'cred_123', name: 'My App', apiKey: 'abc123***' }
    ]
  });
});
```

## Environment Variables Needed
```bash
SHOPIFY_CLIENT_ID=your_app_client_id
SHOPIFY_CLIENT_SECRET=your_app_client_secret
SHOPIFY_REDIRECT_URI=http://localhost:5000/api/shopify/auth/callback
```

## Testing Steps

### With Development Mode (Immediate)
1. Open Shopify modal in your app
2. Enable Development Mode
3. Test all functionality (works without backend)
4. Use this to continue frontend development

### With Real Backend (When Ready)
1. Implement the endpoints above
2. Test with Postman/curl first
3. Disable Development Mode in the modal
4. Test with real Shopify store

## Database Schema Suggestions
```sql
-- Shopify connections table
CREATE TABLE shopify_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  shop_domain VARCHAR(255) NOT NULL,
  access_token TEXT,
  connection_type VARCHAR(50), -- 'oauth', 'storefront', 'public'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Shopify credentials table (for BYO apps)
CREATE TABLE shopify_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255),
  api_key VARCHAR(255),
  api_secret TEXT, -- encrypted
  redirect_uri TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Next Steps
1. **Immediate**: Use Development Mode to continue UI testing
2. **Short-term**: Implement basic endpoints (storefront connect + list connections)
3. **Long-term**: Add full OAuth flow and credentials management
4. **Production**: Add proper authentication, validation, and error handling
