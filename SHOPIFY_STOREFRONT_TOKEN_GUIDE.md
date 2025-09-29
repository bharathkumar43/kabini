# How to Get Your Shopify Storefront Access Token

## What You Need
To connect your Shopify store and fetch products, you need:
1. **Store URL**: Your shop domain (e.g., `your-store.myshopify.com`)
2. **Storefront Access Token**: A token that allows reading products via Shopify's Storefront API

## Step-by-Step Guide

### Step 1: Access Your Shopify Admin
1. Go to your Shopify admin panel
2. Navigate to **Apps** in the left sidebar

### Step 2: Create a Private App (Recommended)
1. Click **"App and sales channel settings"** at the bottom of the Apps page
2. Click **"Develop apps"**
3. Click **"Create an app"**
4. Enter an app name (e.g., "Product Analysis Tool")
5. Click **"Create app"**

### Step 3: Configure API Access
1. Click **"Configure Storefront API scopes"**
2. Enable the following permissions:
   - ✅ **Read products, variants, and collections**
   - ✅ **Read product listings** (if available)
   - ✅ **Read inventory** (optional)
3. Click **"Save"**

### Step 4: Get Your Access Token
1. Click **"API credentials"** tab
2. Under **"Storefront access tokens"**, click **"Create token"**
3. Copy the generated token (starts with `shpat_`)
4. **Important**: Save this token securely - you won't be able to see it again!

### Step 5: Test Your Connection
1. Open the Shopify integration modal in your dashboard
2. Select **"Storefront (token)"** mode
3. Enter your store URL: `your-store.myshopify.com`
4. Paste your Storefront Access Token
5. Click **"Save Storefront Token"**
6. If successful, you'll see: "✅ Successfully connected to [Your Store Name]!"

### Step 6: Fetch Products
1. After connecting, you'll see your store in the "Connected Shops" section
2. Click the **"Fetch Products"** button next to your store
3. You'll see a list of your first 10 products with names and prices

## Troubleshooting

### ❌ "Invalid storefront access token"
- **Solution**: Double-check your token is correct and hasn't expired
- **Tip**: Make sure you copied the full token including `shpat_` prefix

### ❌ "Shop not found"
- **Solution**: Verify your shop domain is correct
- **Format**: Use `your-store.myshopify.com` (not `your-store.com`)

### ❌ "CORS error"
- **Solution**: This is expected in some browsers due to security policies
- **Workaround**: The integration works best in development mode or with a backend proxy

### ❌ "No products found"
- **Solution**: Make sure your store has published products
- **Check**: Verify products are visible in your online store

## What You Can Do Next

### ✅ Current Features (Working Now)
- Connect to your Shopify store
- Verify connection with real shop data
- Fetch and display product list (first 10 products)
- View product names and prices
- Manage multiple store connections

### 🚀 Future Enhancements (When Backend is Ready)
- Detailed product analysis
- Competitor comparison
- AI visibility scoring
- Product performance tracking
- Bulk product import for analysis

## Security Notes
- **Never share your Storefront Access Token** publicly
- Tokens are stored locally in your browser
- For production use, tokens should be stored securely on the backend
- Consider rotating tokens periodically for security

## Need Help?
If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify your Shopify app permissions
3. Test with a simple product first
4. Contact support if problems persist

---

**Ready to connect?** Open the Shopify integration modal and follow the steps above! 🚀
