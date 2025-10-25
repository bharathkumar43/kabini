# 🚨 EMERGENCY FIX - Infinite Auth Loop

## Problem
The frontend is stuck in an infinite loop checking authentication. This makes the login page unusable.

## Quick Fix - Clear Browser Data

### Step 1: Clear localStorage

Open browser console (F12) and run:

```javascript
localStorage.clear();
location.reload();
```

### Step 2: Hard Refresh

Press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)

### Step 3: If Still Not Working - Restart Everything

```bash
# 1. Stop frontend (Ctrl+C)
# 2. Stop backend (Ctrl+C)

# 3. Clear browser cache completely
# Go to browser settings → Clear browsing data → Everything

# 4. Restart backend
cd project.webapp\backend
node server.js

# 5. Restart frontend in a new terminal
cd project.webapp
npm run dev

# 6. Open in INCOGNITO/PRIVATE window
# Chrome: Ctrl+Shift+N
# Firefox: Ctrl+Shift+P
```

## To Create New Account

1. **Make sure backend is running**
   - Check terminal shows: "Server running on http://localhost:5000"
   - Check for: "✅ Default admin user created successfully!"

2. **Open in incognito window**: `http://localhost:5173`

3. **Click "Sign up" link** at bottom of login page

4. **Fill in the form**:
   - Name: Your Name
   - Display Name: Your Display Name  
   - Email: your.email@company.com (must be professional email)
   - Password: At least 8 characters with uppercase, lowercase, and number
   
5. **Submit** - You'll get a verification email

## If Registration Still Fails

Check backend console for errors. Common issues:

- **Email validation error**: Use a professional email (not @gmail, @yahoo, etc.)
- **Password validation error**: Must be 8+ chars with uppercase, lowercase, number
- **Backend not running**: Restart backend server

## Alternative: Use Admin Account

If you can't create a new account, use the admin account:

```
Email: admin@kabini.ai
Password: Admin@123456
```

This should work immediately after the backend starts.

