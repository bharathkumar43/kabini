// Manually verify a user's email in the database
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

async function verifyUser(email) {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking user:', email);
    
    // Check current status
    const result = await client.query(
      'SELECT email, email_verified, is_active, created_at FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found with email:', email);
      return;
    }
    
    const user = result.rows[0];
    console.log('\n📋 Current Status:');
    console.log('  Email:', user.email);
    console.log('  Email Verified:', user.email_verified);
    console.log('  Is Active:', user.is_active);
    console.log('  Created At:', user.created_at);
    
    if (user.email_verified) {
      console.log('\n✅ Email is already verified!');
      console.log('   You can login with this account.');
    } else {
      console.log('\n⚠️  Email is NOT verified. Marking as verified...');
      
      // Update email_verified to true
      await client.query(
        'UPDATE users SET email_verified = true WHERE email = $1',
        [email]
      );
      
      console.log('✅ Email has been verified!');
      console.log('   You can now login with this account.');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ DONE! Try logging in now:');
    console.log('   Email:', email);
    console.log('   Password: (the password you used during signup)');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'anushreddydasari@gmail.com';

verifyUser(email).catch(console.error);

