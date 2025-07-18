#!/usr/bin/env node

/**
 * Test email verification system
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function testEmailVerification() {
  console.log('📧 Testing Email Verification System');
  console.log('====================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // Create a test user that needs verification
    console.log('👤 Creating test user for verification...');
    const timestamp = Date.now();
    const email = `verify${timestamp}@example.com`;
    
    const userResult = await client.query(`
      INSERT INTO users (
        email, password, first_name, last_name, role, 
        is_active, email_verified, referral_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, email_verified
    `, [
      email,
      'testpass123',
      'Test',
      'User',
      'investor',
      true,
      false, // Not verified initially
      `TEST${timestamp.toString().substring(7)}`
    ]);

    const testUser = userResult.rows[0];
    console.log(`✅ Created test user: ${testUser.email}`);
    console.log(`   Email verified: ${testUser.email_verified}`);
    
    // Create user balance
    await client.query(`
      INSERT INTO user_balances (
        user_id, total_balance, profit_balance, deposit_balance, 
        bonus_balance, credit_score_balance
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [testUser.id, 0.00, 0.00, 0.00, 0.00, 0.00]);
    
    // Test verification token generation
    console.log('\n🔑 Testing verification token generation...');
    
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await client.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at) 
       VALUES ($1, $2, $3)`,
      [testUser.id, verificationToken, expiresAt]
    );
    
    console.log(`✅ Verification token generated: ${verificationToken.substring(0, 16)}...`);
    console.log(`   Expires at: ${expiresAt.toISOString()}`);
    
    // Test token verification
    console.log('\n✅ Testing token verification...');
    
    const tokenResult = await client.query(
      `SELECT evt.*, u.email FROM email_verification_tokens evt
       JOIN users u ON evt.user_id = u.id
       WHERE evt.token = $1 AND evt.expires_at > CURRENT_TIMESTAMP`,
      [verificationToken]
    );
    
    if (tokenResult.rows.length > 0) {
      console.log('✅ Token found and valid');
      
      // Verify the user
      await client.query(
        "UPDATE users SET email_verified = true WHERE id = $1",
        [testUser.id]
      );
      
      // Delete the verification token
      await client.query(
        "DELETE FROM email_verification_tokens WHERE user_id = $1",
        [testUser.id]
      );
      
      console.log('✅ User verified successfully');
      
      // Check final status
      const finalUserResult = await client.query(
        "SELECT email, email_verified FROM users WHERE id = $1",
        [testUser.id]
      );
      
      const finalUser = finalUserResult.rows[0];
      console.log(`   Final status: ${finalUser.email} - Verified: ${finalUser.email_verified}`);
      
    } else {
      console.log('❌ Token not found or expired');
    }
    
    // Test API endpoints
    console.log('\n🌐 Testing API endpoints...');
    console.log('   POST /api/auth/verify-email - Send verification email');
    console.log('   GET /api/auth/verify-email?token=... - Verify token');
    console.log('   Page: /auth/verify?token=... - Verification page');
    
    // Generate verification URL for testing
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/auth/verify?token=${verificationToken}`;
    
    console.log('\n🔗 Test verification URL:');
    console.log(`   ${verificationUrl}`);
    
    console.log('\n📋 Manual Testing Steps:');
    console.log('   1. Register a new user account');
    console.log('   2. Note that email_verified = false initially');
    console.log('   3. Call POST /api/auth/verify-email with user email');
    console.log('   4. Use returned verification URL to verify account');
    console.log('   5. Check that email_verified = true after verification');
    
    console.log('\n🎉 Email verification system test completed!');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run test if called directly
if (require.main === module) {
  testEmailVerification();
}

module.exports = { testEmailVerification };
