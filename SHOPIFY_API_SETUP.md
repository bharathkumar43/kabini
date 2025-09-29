# Shopify API Setup Guide

## Issues Identified
1. **404 Errors**: Backend API endpoints for Shopify integration are not implemented or not running
2. **Authentication Errors**: Invalid or expired tokens for `/api/auth/me` endpoint
3. **Token Issues**: Authentication tokens are invalid or expired

## Authentication Issues
The errors show that the authentication system is not working properly:
- `/api/auth/me` returns 404 (endpoint missing)
- Tokens are being marked as "Invalid or expired"
- This affects all API calls that require authentication

## Required Backend Endpoints

### Authentication Endpoints (Critical)
- `GET /auth/me` - Get current user information
- `POST /auth/refresh` - Refresh expired tokens
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### Shopify Integration Endpoints
The frontend expects these API endpoints to be available:

### Shopify OAuth Integration
- `GET /shopify/connections` - List connected Shopify stores
- `DELETE /shopify/connection?shop={shop}` - Disconnect a store
- `GET /shopify/auth/start?shop={shop}&credsId={credsId}` - Start OAuth flow

### Shopify Credentials Management (BYO App)
- `POST /shopify/credentials` - Save custom app credentials
- `GET /shopify/credentials` - List saved credentials
- `DELETE /shopify/credentials/{id}` - Delete credentials

### Shopify Storefront API
- `POST /shopify/storefront/connect` - Save storefront token
- `GET /shopify/storefront/test?shop={shop}` - Test storefront connection
- `GET /shopify/storefront/connections` - List storefront connections
- `GET /shopify/storefront/products?shop={shop}&after={cursor}` - List products
- `GET /shopify/storefront/product?shop={shop}&handle={handle}` - Get single product

### Shopify Admin API
- `GET /shopify/products?after={cursor}&shop={shop}` - List products via Admin API
- `GET /shopify/product?handle={handle}&shop={shop}` - Get product by handle
- `GET /shopify/product?id={id}&shop={shop}` - Get product by ID

### Shopify Public API
- `GET /shopify/public-product?url={url}&shop={shop}&handle={handle}` - Get public product
- `GET /shopify/public-list?shop={shop}` - List public products

## Quick Fix Options

### Option 1: Implement Backend API
Implement the missing endpoints in your backend service using the Shopify API documentation.

### Option 2: Mock Endpoints (Development)
Create mock endpoints that return empty data for development:

```javascript
// Mock responses for development
app.get('/shopify/connections', (req, res) => {
  res.json({ shops: [] });
});

app.get('/shopify/credentials', (req, res) => {
  res.json({ items: [] });
});

app.post('/shopify/storefront/connect', (req, res) => {
  res.json({ success: true, message: 'Mock connection successful' });
});
```

### Option 3: Disable Shopify Features
Comment out the Shopify integration modal and use a simpler placeholder until the API is ready.

## Current Frontend Behavior
The frontend now gracefully handles both authentication and API issues:
- **Authentication Issues**: Shows blue warning with retry button
- **API Unavailable**: Shows gray warning with retry button  
- **Graceful Degradation**: Continues to work with limited functionality
- **User Feedback**: Provides helpful error messages and guidance
- **Debug Logging**: Detailed error information for developers

## Troubleshooting Steps

### Step 1: Check Authentication
1. Verify `/api/auth/me` endpoint exists and works
2. Check if authentication tokens are valid
3. Ensure token refresh mechanism is working
4. Test login/logout functionality

### Step 2: Check Backend API
1. Verify your backend server is running
2. Check the API_BASE_URL environment variable
3. Test basic API connectivity with a simple endpoint
4. Verify CORS settings if running on different domains

### Step 3: Fix Missing Endpoints
1. Implement the required authentication endpoints first
2. Add Shopify integration endpoints
3. Test each endpoint individually
4. Use mock data for development if needed

### Step 4: Test Integration
1. Test authentication flow
2. Test Shopify connection with real store
3. Verify all modes work (OAuth, Storefront, Public, BYO)
4. Check error handling and user feedback
