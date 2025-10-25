// Automatic Database Schema Fix Script
// Run this to add missing columns and tables for login functionality

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kabini_ai',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function fixDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting database schema fix...\n');
    
    // 1. Add email_verified column
    console.log('Step 1: Adding email_verified column to users table...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ email_verified column added (or already exists)\n');
    
    // 2. Create email_verification_tokens table
    console.log('Step 2: Creating email_verification_tokens table...');
    await client.query(`
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
    `);
    console.log('✅ email_verification_tokens table created (or already exists)\n');
    
    // 3. Create indexes
    console.log('Step 3: Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
    `);
    console.log('✅ Indexes created\n');
    
    // 4. Delete old admin user
    console.log('Step 4: Removing old admin user (will be recreated)...');
    const result = await client.query(`
      DELETE FROM users WHERE email = 'admin@kabini.ai';
    `);
    if (result.rowCount > 0) {
      console.log(`✅ Deleted ${result.rowCount} old admin user(s)\n`);
    } else {
      console.log('ℹ️  No existing admin user to delete\n');
    }
    
    // 5. Verify changes
    console.log('Step 5: Verifying changes...');
    const columnCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email_verified';
    `);
    
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'email_verification_tokens';
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ email_verified column verified');
    } else {
      console.log('❌ email_verified column NOT found');
    }
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ email_verification_tokens table verified');
    } else {
      console.log('❌ email_verification_tokens table NOT found');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 DATABASE FIX COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('\nNext steps:');
    console.log('1. Restart your backend server:');
    console.log('   node server.js');
    console.log('');
    console.log('2. Look for this message:');
    console.log('   "✅ Default admin user created successfully!"');
    console.log('');
    console.log('3. Try logging in at http://localhost:5173');
    console.log('   Email: admin@kabini.ai');
    console.log('   Password: Admin@123456');
    console.log('');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ ERROR FIXING DATABASE:');
    console.error('='.repeat(50));
    console.error(error.message);
    console.error('\nPlease check:');
    console.error('1. PostgreSQL is running');
    console.error('2. Database credentials in .env are correct');
    console.error('3. Database "kabini_ai" exists');
    console.error('4. You have permission to modify the database');
    console.error('\nCurrent configuration:');
    console.error('- DB_HOST:', process.env.DB_HOST || 'localhost');
    console.error('- DB_NAME:', process.env.DB_NAME || 'kabini_ai');
    console.error('- DB_USER:', process.env.DB_USER || 'postgres');
    console.error('- DB_PORT:', process.env.DB_PORT || 5432);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
console.log('🔧 Database Schema Fix Tool');
console.log('='.repeat(50));
console.log('This will add missing columns and tables for login');
console.log('='.repeat(50) + '\n');

fixDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

