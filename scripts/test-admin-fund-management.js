#!/usr/bin/env node

/**
 * Test admin fund management functionality
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

async function testAdminFundManagement() {
  console.log('🧪 Testing Admin Fund Management');
  console.log('=================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 3,
  });

  try {
    const client = await pool.connect();
    
    // Get a test user
    const userResult = await client.query(`
      SELECT id, email, first_name, last_name 
      FROM users 
      WHERE role = 'investor' 
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No investor users found. Creating test user...');
      
      // Create test user
      const timestamp = Date.now();
      const email = `testuser${timestamp}@example.com`;
      
      const newUserResult = await client.query(`
        INSERT INTO users (
          email, password, first_name, last_name, role, 
          is_active, email_verified, referral_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, email, first_name, last_name
      `, [
        email,
        'testpass123',
        'Test',
        'User',
        'investor',
        true,
        true,
        `TEST${timestamp.toString().substring(7)}`
      ]);

      // Create user balance
      await client.query(`
        INSERT INTO user_balances (
          user_id, total_balance, profit_balance, deposit_balance, 
          bonus_balance, credit_score_balance
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [newUserResult.rows[0].id, 0.00, 0.00, 0.00, 0.00, 0.00]);
      
      console.log(`✅ Created test user: ${email}`);
      userResult.rows[0] = newUserResult.rows[0];
    }
    
    const testUser = userResult.rows[0];
    console.log(`👤 Testing with user: ${testUser.email} (ID: ${testUser.id})`);
    
    // Get initial balance
    const initialBalanceResult = await client.query(`
      SELECT * FROM user_balances WHERE user_id = $1
    `, [testUser.id]);
    
    const initialBalance = initialBalanceResult.rows[0];
    console.log('\n💰 Initial balances:');
    console.log(`   Total: $${initialBalance.total_balance}`);
    console.log(`   Deposit: $${initialBalance.deposit_balance}`);
    console.log(`   Profit: $${initialBalance.profit_balance}`);
    console.log(`   Bonus: $${initialBalance.bonus_balance}`);
    
    // Test adding funds
    console.log('\n➕ Testing ADD funds...');
    const addAmount = 100.00;
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Update balance
      await client.query(`
        UPDATE user_balances 
        SET total_balance = total_balance + $1
        WHERE user_id = $2
      `, [addAmount, testUser.id]);
      
      // Create transaction record
      await client.query(`
        INSERT INTO transactions (
          user_id, type, amount, balance_type, description, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        testUser.id,
        'admin_funding',
        addAmount,
        'total',
        'Test admin funding',
        'completed'
      ]);
      
      await client.query('COMMIT');
      console.log(`✅ Successfully added $${addAmount}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error adding funds:', error.message);
    }
    
    // Check updated balance
    const updatedBalanceResult = await client.query(`
      SELECT * FROM user_balances WHERE user_id = $1
    `, [testUser.id]);
    
    const updatedBalance = updatedBalanceResult.rows[0];
    console.log('\n💰 Updated balances after ADD:');
    console.log(`   Total: $${updatedBalance.total_balance}`);
    console.log(`   Deposit: $${updatedBalance.deposit_balance}`);
    console.log(`   Profit: $${updatedBalance.profit_balance}`);
    console.log(`   Bonus: $${updatedBalance.bonus_balance}`);
    
    // Test subtracting funds
    console.log('\n➖ Testing SUBTRACT funds...');
    const subtractAmount = 25.00;
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Update balance
      await client.query(`
        UPDATE user_balances 
        SET total_balance = total_balance - $1
        WHERE user_id = $2
      `, [subtractAmount, testUser.id]);
      
      // Create transaction record
      await client.query(`
        INSERT INTO transactions (
          user_id, type, amount, balance_type, description, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        testUser.id,
        'admin_deduction',
        subtractAmount,
        'total',
        'Test admin deduction',
        'completed'
      ]);
      
      await client.query('COMMIT');
      console.log(`✅ Successfully subtracted $${subtractAmount}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error subtracting funds:', error.message);
    }
    
    // Check final balance
    const finalBalanceResult = await client.query(`
      SELECT * FROM user_balances WHERE user_id = $1
    `, [testUser.id]);
    
    const finalBalance = finalBalanceResult.rows[0];
    console.log('\n💰 Final balances after SUBTRACT:');
    console.log(`   Total: $${finalBalance.total_balance}`);
    console.log(`   Deposit: $${finalBalance.deposit_balance}`);
    console.log(`   Profit: $${finalBalance.profit_balance}`);
    console.log(`   Bonus: $${finalBalance.bonus_balance}`);
    
    // Check transaction history
    console.log('\n📊 Transaction history:');
    const transactionResult = await client.query(`
      SELECT type, amount, balance_type, description, status, created_at
      FROM transactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC
      LIMIT 5
    `, [testUser.id]);
    
    transactionResult.rows.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.type}: $${tx.amount} (${tx.balance_type}) - ${tx.description}`);
    });
    
    console.log('\n🎉 Admin fund management test completed!');
    
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
  testAdminFundManagement();
}

module.exports = { testAdminFundManagement };
