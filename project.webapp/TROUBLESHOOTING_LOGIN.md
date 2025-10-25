# 🔧 Troubleshooting: 401 Unauthorized Error

## Issue: "Invalid email or password" when logging in with admin credentials

### Root Cause Analysis

The 401 error with admin credentials typically means:
1. ❌ Backend hasn't been restarted after code changes
2. ❌ Database tables haven't been updated
3. ❌ Admin user hasn't been created in database
4. ❌ Environment variables not configured correctly

---

## 🚨 IMMEDIATE FIX - Step by Step

### Step 1: Stop All Running Processes

**Stop Backend:**
- Press `Ctrl+C` in the backend terminal

**Stop Frontend:**
- Press `Ctrl+C` in the frontend terminal

---

### Step 2: Update Database Schema

The database needs the new columns and tables. Run this SQL:

```bash
# Connect to PostgreSQL
psql -U postgres -d kabini_ai
```

Then run these SQL commands:

```sql
-- Add email_verified column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- Check if admin user exists
SELECT email, email_verified, is_active FROM users WHERE email = 'admin@kabini.ai';

-- If admin doesn't exist or email_verified is false, delete and recreate
DELETE FROM users WHERE email = 'admin@kabini.ai';

-- Exit PostgreSQL
\q
```

---

### Step 3: Verify Backend Environment

Check `project.webapp/backend/.env` exists and contains:

```bash
# Critical settings
ENABLE_LOCAL_AUTH=true
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Database settings
DB_HOST=localhost
DB_NAME=kabini_ai
DB_USER=postgres
DB_PASSWORD=your_actual_password
```

**If `.env` doesn't exist:**

```bash
cd project.webapp/backend
cp env.example .env
# Then edit .env with your actual values
```

---

### Step 4: Restart Backend (IMPORTANT!)

```bash
cd project.webapp/backend
node server.js
```

**Look for these EXACT messages:**

```
✅ Database connected successfully
🔐 Local authentication enabled, creating default admin user...
✅ =============================================
✅ Default admin user created successfully!
✅ Email: admin@kabini.ai
✅ Password: Admin@123456
✅ Please change the password after first login
✅ =============================================
```

**If you DON'T see these messages:**
- Backend environment is not configured correctly
- ENABLE_LOCAL_AUTH might not be true
- Database connection might be failing

---

### Step 5: Restart Frontend

```bash
cd project.webapp
npm run dev
```

---

### Step 6: Try Login Again

1. Open: `http://localhost:5173`
2. Email: `admin@kabini.ai`
3. Password: `Admin@123456`
4. Click "Sign In"

---

## 🔍 Detailed Diagnostics

### Check 1: Backend Console Output

When you start the backend, you should see:

```
🔐 [Server] Environment Configuration Check:
🔐 [Server] AUTH_TYPE: local
🔐 [Server] ENABLE_LOCAL_AUTH: true
✅ Database connected successfully
🔐 Local authentication enabled, creating default admin user...
✅ =============================================
✅ Default admin user created successfully!
✅ Email: admin@kabini.ai
✅ Password: Admin@123456
✅ Please change the password after first login
✅ =============================================
Server running on http://localhost:5000
```

**If you see:**
- `ℹ️ Admin user already exists` - Good! Admin is already created
- `❌ Error creating default admin` - Database issue, check connection
- Nothing about admin - ENABLE_LOCAL_AUTH is not true

---

### Check 2: Verify Admin User in Database

```bash
psql -U postgres -d kabini_ai -c "SELECT email, email_verified, is_active, roles FROM users WHERE email = 'admin@kabini.ai';"
```

**Expected output:**
```
       email        | email_verified | is_active |       roles
--------------------+----------------+-----------+------------------
 admin@kabini.ai    | t              | t         | ["admin","user"]
```

**If email_verified is `f` (false):**
```sql
UPDATE users SET email_verified = true WHERE email = 'admin@kabini.ai';
```

**If no rows returned:**
- Admin user doesn't exist
- Backend needs to be restarted
- ENABLE_LOCAL_AUTH might be false

---

### Check 3: Test Backend Directly

Open a new terminal and test the backend:

```bash
curl -X POST http://localhost:5000/api/auth/local-login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@kabini.ai\",\"password\":\"Admin@123456\"}"
```

**Expected successful response:**
```json
{
  "success": true,
  "user": {...},
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresAt": "..."
}
```

**If you get 401:**
```json
{
  "error": "Invalid email or password..."
}
```
- Password is wrong (unlikely if using default)
- Email verification is false
- User doesn't exist

**If you get 400:**
```json
{
  "error": "Missing required fields..."
}
```
- Request format is wrong (not the issue here)

---

## 🛠️ Alternative: Manual Admin Creation

If automatic creation isn't working, create manually:

```bash
# Install bcrypt for password hashing
cd project.webapp/backend
npm install bcryptjs

# Create a script to hash the password
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('Admin@123456', 12).then(hash => console.log(hash));"
```

Copy the hash output, then:

```bash
psql -U postgres -d kabini_ai
```

```sql
-- Replace YOUR_HASH_HERE with the actual hash
INSERT INTO users (
    id, 
    email, 
    name, 
    display_name, 
    password, 
    roles, 
    is_active, 
    email_verified,
    created_at,
    updated_at
) VALUES (
    'admin-001',
    'admin@kabini.ai',
    'Admin User',
    'Administrator',
    'YOUR_HASH_HERE',
    '["admin","user"]',
    true,
    true,
    NOW(),
    NOW()
);

-- Verify
SELECT email, email_verified, is_active FROM users WHERE email = 'admin@kabini.ai';

\q
```

---

## 📋 Complete Checklist

Before trying to login, verify:

- [ ] Backend `.env` file exists with ENABLE_LOCAL_AUTH=true
- [ ] Database has `email_verified` column in users table
- [ ] Database has `email_verification_tokens` table
- [ ] Backend server is running (check port 5000)
- [ ] Backend shows admin creation success message
- [ ] Admin user exists in database with email_verified=true
- [ ] Frontend is running (check port 5173)
- [ ] No typos in email or password

---

## 🔑 Quick Commands Reference

```bash
# 1. Update database schema
psql -U postgres -d kabini_ai -f project.webapp/backend/migrations/add-email-verification.sql

# 2. Check admin user
psql -U postgres -d kabini_ai -c "SELECT * FROM users WHERE email = 'admin@kabini.ai';"

# 3. Delete admin to recreate
psql -U postgres -d kabini_ai -c "DELETE FROM users WHERE email = 'admin@kabini.ai';"

# 4. Restart backend
cd project.webapp/backend
node server.js

# 5. Test backend API
curl http://localhost:5000/api/health
```

---

## 💡 Still Not Working?

### Last Resort: Fresh Database Setup

```bash
# 1. Backup existing data (if needed)
pg_dump -U postgres kabini_ai > backup.sql

# 2. Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS kabini_ai;"
psql -U postgres -c "CREATE DATABASE kabini_ai;"

# 3. Restart backend (it will create all tables automatically)
cd project.webapp/backend
node server.js

# 4. Check for admin creation message
# 5. Try login again
```

---

## 📞 Debug Information to Collect

If still having issues, collect this information:

1. **Backend console output** (full startup logs)
2. **Database query result:**
   ```sql
   SELECT email, email_verified, is_active, created_at FROM users WHERE email = 'admin@kabini.ai';
   ```
3. **Backend .env content** (hide sensitive values)
4. **PostgreSQL version:** `psql --version`
5. **Node.js version:** `node --version`

---

## ✅ Success Indicators

You'll know it's working when:

1. Backend shows: "✅ Default admin user created successfully!"
2. Database query shows: `email_verified | t`
3. Health check works: `curl http://localhost:5000/api/health`
4. Login redirects to dashboard
5. No 401 errors in browser console

---

**Remember:** After successful login, CHANGE YOUR PASSWORD immediately!

