# 🔧 MANUAL DATABASE FIX - Required for Login

## The Problem
Your database is missing the `email_verified` column. This is why login fails with:
```
❌ Error creating default admin: error: column "email_verified" of relation "users" does not exist
```

## ⚡ Quick Fix (2 Minutes)

### Step 1: Open PostgreSQL

**Option A: Using pgAdmin**
1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Open your `kabini_ai` database
4. Click "Query Tool" (or press F5)

**Option B: Using Command Line**
```bash
# Find your psql executable, usually at:
# C:\Program Files\PostgreSQL\16\bin\psql.exe
# or C:\Program Files\PostgreSQL\15\bin\psql.exe

# Run it:
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d kabini_ai
```

### Step 2: Run These SQL Commands

Copy and paste ALL of these commands into your SQL tool:

```sql
-- 1. Add email_verified column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- 2. Create email_verification_tokens table
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

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- 4. Delete old admin user (will be recreated)
DELETE FROM users WHERE email = 'admin@kabini.ai';

-- 5. Verify the changes worked
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'email_verified';
```

### Step 3: You Should See This Output

```
 column_name    | data_type 
----------------+-----------
 email_verified | boolean
(1 row)
```

If you see that output, it worked! ✅

### Step 4: Restart Backend Server

Stop your current backend (Ctrl+C in the terminal) and restart:

```bash
cd project.webapp\backend
node server.js
```

### Step 5: Look for Success Message

You should now see:

```
✅ =============================================
✅ Default admin user created successfully!
✅ Email: admin@kabini.ai
✅ Password: Admin@123456
✅ Please change the password after first login
✅ =============================================
```

### Step 6: Try Login Again

Go to `http://localhost:5173` and login with:
- Email: `admin@kabini.ai`
- Password: `Admin@123456`

---

## 🎯 Alternative: Using pgAdmin GUI

1. **Open pgAdmin**
2. **Navigate to:** Servers → PostgreSQL → Databases → kabini_ai
3. **Right-click on kabini_ai** → Query Tool
4. **Paste the SQL commands** from Step 2 above
5. **Click Execute** (or press F5)
6. **Check the output** for success messages
7. **Restart backend server**

---

## ✅ How to Verify It Worked

Run this query in PostgreSQL:

```sql
-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'email_verified';

-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'email_verification_tokens';
```

You should see:
```
 column_name    
----------------
 email_verified

 table_name                
---------------------------
 email_verification_tokens
```

---

## 🚨 If You Get Errors

### Error: "relation users does not exist"
**Solution:** Your database hasn't been initialized yet
```sql
-- Let the backend create the tables automatically
-- Just start the backend and it will create all tables
```

### Error: "permission denied"
**Solution:** Use a user with proper permissions
```bash
# Use postgres superuser
psql -U postgres -d kabini_ai
```

### Error: "database kabini_ai does not exist"
**Solution:** Create the database first
```sql
CREATE DATABASE kabini_ai;
```

---

## 📋 Complete Fix Checklist

- [ ] Open PostgreSQL (pgAdmin or psql)
- [ ] Connect to `kabini_ai` database
- [ ] Run all SQL commands from Step 2
- [ ] Verify `email_verified` column exists
- [ ] Verify `email_verification_tokens` table exists
- [ ] Delete old admin user
- [ ] Restart backend server
- [ ] See "Default admin user created successfully!" message
- [ ] Try login at http://localhost:5173
- [ ] Login works! ✅

---

## 💡 Pro Tip

After this works, the database will have the correct schema. Future restarts of the backend will automatically create the admin user if it doesn't exist.

---

**Need help?** Share the exact error message you're seeing!

