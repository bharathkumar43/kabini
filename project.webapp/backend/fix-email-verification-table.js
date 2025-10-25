// Fix email_verification_tokens table - ensure it has proper constraints
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

async function fixEmailVerificationTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing email_verification_tokens table...\n');
    
    // Drop the existing table and recreate with proper structure
    console.log('Step 1: Dropping old email_verification_tokens table...');
    await client.query(`DROP TABLE IF EXISTS email_verification_tokens CASCADE;`);
    console.log('✅ Old table dropped\n');
    
    // Recreate table with proper structure
    console.log('Step 2: Creating email_verification_tokens table with proper constraints...');
    await client.query(`
      CREATE TABLE email_verification_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id)
      );
    `);
    console.log('✅ Table created with UNIQUE(user_id) constraint\n');
    
    // Create indexes
    console.log('Step 3: Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id_unique ON email_verification_tokens(user_id);
    `);
    console.log('✅ Indexes created\n');
    
    console.log('='.repeat(50));
    console.log('🎉 EMAIL VERIFICATION TABLE FIXED!');
    console.log('='.repeat(50));
    console.log('\nNow restart your backend:');
    console.log('  node server.js');
    console.log('');
    console.log('Then try signing up with a new email!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ ERROR:');
    console.error('='.repeat(50));
    console.error(error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixEmailVerificationTable().catch(console.error);

