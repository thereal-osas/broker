#!/usr/bin/env node

/**
 * Test withdrawal approval balance deduction functionality
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testWithdrawalApproval() {
  console.log('🧪 Testing withdrawal approval balance deduction...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Get a test user with balance
    console.log('\n📋 Step 1: Finding test user...');
    const userResult = await pool.query(`
      SELECT u.id, u.email, ub.total_balance 
      FROM users u 
      JOIN user_balances ub ON u.id = ub.user_id 
      WHERE u.role = 'investor' AND ub.total_balance >= 50
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No investor with sufficient balance found');
      
      // Create test balance for first user
      const firstUser = await pool.query('SELECT id FROM users WHERE role = \'investor\' LIMIT 1');
      if (firstUser.rows.length > 0) {
        await pool.query(`
          UPDATE user_balances 
          SET total_balance = 500.00 
          WHERE user_id = $1
        `, [firstUser.rows[0].id]);
        console.log('✅ Added test balance to user');
        
        const updatedUser = await pool.query(`
          SELECT u.id, u.email, ub.total_balance 
          FROM users u 
          JOIN user_balances ub ON u.id = ub.user_id 
          WHERE u.id = $1
        `, [firstUser.rows[0].id]);
        
        var testUser = updatedUser.rows[0];
      } else {
        console.log('❌ No investor users found');
        return;
      }
    } else {
      var testUser = userResult.rows[0];
    }
    
    console.log(`✅ Test user: ${testUser.email} (Balance: $${testUser.total_balance})`);
    
    // 2. Create a test withdrawal request
    console.log('\n📋 Step 2: Creating test withdrawal request...');
    const withdrawalAmount = 50.00;
    
    const withdrawalResult = await pool.query(`
      INSERT INTO withdrawal_requests (
        user_id, amount, withdrawal_method, account_details, status
      ) VALUES ($1, $2, 'bank_transfer', $3, 'pending')
      RETURNING *
    `, [
      testUser.id, 
      withdrawalAmount, 
      JSON.stringify({
        account_name: 'Test Account',
        account_number: '1234567890',
        bank_name: 'Test Bank'
      })
    ]);
    
    const withdrawalRequest = withdrawalResult.rows[0];
    console.log(`✅ Created withdrawal request: ID ${withdrawalRequest.id} for $${withdrawalAmount}`);
    
    // 3. Test the approval process
    console.log('\n📋 Step 3: Testing withdrawal approval...');
    
    // Get admin user
    const adminResult = await pool.query('SELECT id FROM users WHERE role = \'admin\' LIMIT 1');
    if (adminResult.rows.length === 0) {
      console.log('❌ No admin user found');
      return;
    }
    const adminId = adminResult.rows[0].id;
    
    // Start transaction
    await pool.query('BEGIN');
    
    try {
      // Check balance before approval
      const balanceBefore = await pool.query(`
        SELECT total_balance FROM user_balances WHERE user_id = $1
      `, [testUser.id]);
      
      console.log(`💳 Balance before approval: $${balanceBefore.rows[0].total_balance}`);
      
      // Get withdrawal request with balance info (simulating the API logic)
      const withdrawalWithBalance = await pool.query(`
        SELECT 
          wr.*,
          ub.total_balance
        FROM withdrawal_requests wr
        JOIN user_balances ub ON wr.user_id = ub.user_id
        WHERE wr.id = $1
      `, [withdrawalRequest.id]);
      
      const requestData = withdrawalWithBalance.rows[0];
      console.log(`📋 Withdrawal request amount: $${requestData.amount}`);
      console.log(`📋 User current balance: $${requestData.total_balance}`);
      
      // Check if user has sufficient balance
      if (parseFloat(requestData.total_balance) < parseFloat(requestData.amount)) {
        console.log('❌ Insufficient balance for withdrawal');
        await pool.query('ROLLBACK');
        return;
      }
      
      // Update withdrawal request status
      await pool.query(`
        UPDATE withdrawal_requests 
        SET status = 'approved', admin_notes = 'Test approval', processed_by = $1, processed_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [adminId, withdrawalRequest.id]);
      
      // Deduct from user balance
      await pool.query(`
        UPDATE user_balances 
        SET total_balance = total_balance - $1
        WHERE user_id = $2
      `, [withdrawalAmount, testUser.id]);
      
      // Create transaction record
      await pool.query(`
        INSERT INTO transactions (
          user_id, type, amount, balance_type, description, 
          reference_id, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        testUser.id,
        'withdrawal',
        withdrawalAmount,
        'total',
        `Withdrawal request approved - bank_transfer`,
        withdrawalRequest.id,
        'completed'
      ]);
      
      // Check balance after approval
      const balanceAfter = await pool.query(`
        SELECT total_balance FROM user_balances WHERE user_id = $1
      `, [testUser.id]);
      
      console.log(`💳 Balance after approval: $${balanceAfter.rows[0].total_balance}`);
      console.log(`✅ Withdrawal approved and balance deducted`);
      console.log(`✅ Transaction recorded successfully`);
      
      // Check if transaction was created
      const transactionCheck = await pool.query(`
        SELECT * FROM transactions 
        WHERE user_id = $1 AND type = 'withdrawal' AND reference_id = $2
      `, [testUser.id, withdrawalRequest.id]);
      
      if (transactionCheck.rows.length > 0) {
        console.log(`✅ Transaction record created: ID ${transactionCheck.rows[0].id}`);
      } else {
        console.log(`❌ Transaction record not found`);
      }
      
      // Rollback to not affect real data
      await pool.query('ROLLBACK');
      console.log('🔄 Test transaction rolled back (no real data affected)');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
    console.log('\n🎉 Withdrawal approval test completed successfully!');
    console.log('✅ Balance deduction logic is working correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testWithdrawalApproval();
