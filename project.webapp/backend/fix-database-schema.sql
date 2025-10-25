-- Fix Database Schema for Admin Login
-- Run this script to add missing columns and tables

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

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- 4. Delete existing admin user (if any) so it can be recreated
DELETE FROM users WHERE email = 'admin@kabini.ai';

-- 5. Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND column_name IN ('email_verified', 'email', 'password', 'is_active');

-- 6. Check if email_verification_tokens table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'email_verification_tokens'
) AS email_tokens_table_exists;

-- Done! Now restart your backend server and the admin user will be created automatically.

