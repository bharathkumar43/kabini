// Reset a user's password in the database
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'kabini_ai',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function resetPassword(email, newPassword) {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Looking for user:', email);
    
    // Check if user exists
    const result = await client.query(
      'SELECT id, email, email_verified FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found with email:', email);
      return;
    }
    
    const user = result.rows[0];
    console.log('✅ User found:', user.email);
    console.log('   Email Verified:', user.email_verified);
    
    // Hash the new password
    console.log('\n🔐 Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log('✅ Password hashed');
    
    // Update password
    console.log('💾 Updating password in database...');
    await client.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, user.id]
    );
    console.log('✅ Password updated successfully!');
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ PASSWORD RESET COMPLETE!');
    console.log('='.repeat(50));
    console.log('\nYou can now login with:');
    console.log('  Email:', email);
    console.log('  Password:', newPassword);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Get email and password from command line
const email = process.argv[2] || 'anushreddydasari@gmail.com';
const password = process.argv[3] || 'SecurePass123!';

console.log('🔧 Resetting password for:', email);
console.log('🔑 New password:', password);
console.log('');

resetPassword(email, password).catch(console.error);

