#!/usr/bin/env node

/**
 * Test database connection and user creation
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // Test connection
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log(`   Connected at: ${result.rows[0].now}`);
    
    // Test user creation
    console.log('\n🧪 Testing user creation...');
    
    // Generate a unique email
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;
    const password = 'testpass123';
    
    // Create user
    const userResult = await client.query(`
      INSERT INTO users (
        email, password, first_name, last_name, role, 
        is_active, email_verified, referral_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email
    `, [
      email,
      password, // Plain text as requested
      'Test',
      'User',
      'investor',
      true,
      false,
      `TEST${timestamp.toString().substring(7)}`
    ]);
    
    console.log('✅ User created successfully');
    console.log(`   User ID: ${userResult.rows[0].id}`);
    console.log(`   Email: ${userResult.rows[0].email}`);
    
    // Create user balance
    await client.query(`
      INSERT INTO user_balances (
        user_id, total_balance, profit_balance, deposit_balance, 
        bonus_balance, credit_score_balance
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [userResult.rows[0].id, 0.00, 0.00, 0.00, 0.00, 0.00]);
    
    console.log('✅ User balance created successfully');
    
    // Test user retrieval
    const retrieveResult = await client.query(`
      SELECT * FROM users WHERE email = $1
    `, [email]);
    
    console.log('✅ User retrieved successfully');
    console.log(`   User: ${retrieveResult.rows[0].first_name} ${retrieveResult.rows[0].last_name}`);
    
    client.release();
    console.log('\n🎉 All database tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  testDatabaseConnection();
}

module.exports = { testDatabaseConnection };
