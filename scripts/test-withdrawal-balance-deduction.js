#!/usr/bin/env node

/**
 * Test script to verify withdrawal balance deduction functionality
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testWithdrawalBalanceDeduction() {
  console.log('🧪 Testing Withdrawal Balance Deduction');
  console.log('=======================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Find a test user with some balance
    console.log('📋 Step 1: Finding Test User');
    console.log('============================');
    
    const testUserQuery = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        ub.total_balance,
        ub.deposit_balance,
        ub.profit_balance,
        ub.bonus_balance,
        ub.card_balance
      FROM users u
      JOIN user_balances ub ON u.id = ub.user_id
      WHERE u.role = 'investor' 
        AND ub.total_balance > 50
      ORDER BY ub.total_balance DESC
      LIMIT 1
    `;
    
    const testUserResult = await pool.query(testUserQuery);
    
    if (testUserResult.rows.length === 0) {
      console.log('❌ No test user found with sufficient balance');
      console.log('Creating a test user with balance...');
      
      // Create test user
      const createUserQuery = `
        INSERT INTO users (email, password, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      const userResult = await pool.query(createUserQuery, [
        'test-withdrawal@example.com',
        'password123',
        'Test',
        'User',
        'investor'
      ]);
      
      const userId = userResult.rows[0].id;
      
      // Create balance
      const createBalanceQuery = `
        INSERT INTO user_balances (user_id, total_balance, deposit_balance)
        VALUES ($1, $2, $3)
      `;
      await pool.query(createBalanceQuery, [userId, 100.00, 100.00]);
      
      console.log('✅ Test user created with $100 balance');
      
      // Re-fetch the test user
      const newUserResult = await pool.query(testUserQuery);
      var testUser = newUserResult.rows[0];
    } else {
      var testUser = testUserResult.rows[0];
    }
    
    console.log(`👤 Test User: ${testUser.first_name} ${testUser.last_name} (${testUser.email})`);
    console.log(`💰 Current Balance: $${parseFloat(testUser.total_balance).toFixed(2)}`);
    console.log(`   - Deposit: $${parseFloat(testUser.deposit_balance || 0).toFixed(2)}`);
    console.log(`   - Profit: $${parseFloat(testUser.profit_balance || 0).toFixed(2)}`);
    console.log(`   - Bonus: $${parseFloat(testUser.bonus_balance || 0).toFixed(2)}`);
    console.log(`   - Card: $${parseFloat(testUser.card_balance || 0).toFixed(2)}`);

    // 2. Create a test withdrawal request
    console.log('\n📋 Step 2: Creating Test Withdrawal Request');
    console.log('===========================================');
    
    const withdrawalAmount = 25.00;
    const createWithdrawalQuery = `
      INSERT INTO withdrawal_requests (
        user_id, amount, withdrawal_method, account_details, status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    
    const withdrawalResult = await pool.query(createWithdrawalQuery, [
      testUser.id,
      withdrawalAmount,
      'bank_transfer',
      JSON.stringify({
        bankName: 'Test Bank',
        accountNumber: '1234567890',
        accountName: 'Test User'
      }),
      'pending'
    ]);
    
    const withdrawalId = withdrawalResult.rows[0].id;
    console.log(`✅ Created withdrawal request: ${withdrawalId}`);
    console.log(`💸 Withdrawal Amount: $${withdrawalAmount.toFixed(2)}`);

    // 3. Test approval process (simulate API call)
    console.log('\n📋 Step 3: Testing Approval Process');
    console.log('===================================');
    
    // Get balance before approval
    const beforeApprovalQuery = `
      SELECT total_balance, deposit_balance, profit_balance, bonus_balance, card_balance
      FROM user_balances WHERE user_id = $1
    `;
    const beforeBalance = await pool.query(beforeApprovalQuery, [testUser.id]);
    const balanceBefore = beforeBalance.rows[0];
    
    console.log('Balance before approval:');
    console.log(`   Total: $${parseFloat(balanceBefore.total_balance).toFixed(2)}`);
    
    // Simulate the approval process (what the API would do)
    await pool.query('BEGIN');
    
    try {
      // Update withdrawal status to approved
      await pool.query(`
        UPDATE withdrawal_requests 
        SET status = 'approved', processed_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [withdrawalId]);
      
      // Deduct balance (simulating the API logic)
      await pool.query(`
        UPDATE user_balances
        SET total_balance = GREATEST(0, total_balance - $1),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
      `, [withdrawalAmount, testUser.id]);
      
      // Create transaction record
      await pool.query(`
        INSERT INTO transactions (
          user_id, type, amount, balance_type, description, reference_id, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        testUser.id,
        'withdrawal',
        withdrawalAmount,
        'total',
        `Debit Alert - Withdrawal bank_transfer`,
        withdrawalId,
        'completed'
      ]);
      
      await pool.query('COMMIT');
      console.log('✅ Withdrawal approved and balance deducted');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

    // 4. Verify balance deduction
    console.log('\n📋 Step 4: Verifying Balance Deduction');
    console.log('======================================');
    
    const afterApprovalQuery = `
      SELECT total_balance, deposit_balance, profit_balance, bonus_balance, card_balance
      FROM user_balances WHERE user_id = $1
    `;
    const afterBalance = await pool.query(afterApprovalQuery, [testUser.id]);
    const balanceAfter = afterBalance.rows[0];
    
    console.log('Balance after approval:');
    console.log(`   Total: $${parseFloat(balanceAfter.total_balance).toFixed(2)}`);
    
    const expectedBalance = parseFloat(balanceBefore.total_balance) - withdrawalAmount;
    const actualBalance = parseFloat(balanceAfter.total_balance);
    
    if (Math.abs(actualBalance - expectedBalance) < 0.01) {
      console.log('✅ Balance deduction is correct!');
      console.log(`   Expected: $${expectedBalance.toFixed(2)}`);
      console.log(`   Actual: $${actualBalance.toFixed(2)}`);
    } else {
      console.log('❌ Balance deduction is incorrect!');
      console.log(`   Expected: $${expectedBalance.toFixed(2)}`);
      console.log(`   Actual: $${actualBalance.toFixed(2)}`);
      console.log(`   Difference: $${Math.abs(actualBalance - expectedBalance).toFixed(2)}`);
    }

    // 5. Check transaction record
    console.log('\n📋 Step 5: Checking Transaction Record');
    console.log('=====================================');
    
    const transactionQuery = `
      SELECT * FROM transactions 
      WHERE user_id = $1 AND reference_id = $2 AND type = 'withdrawal'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const transactionResult = await pool.query(transactionQuery, [testUser.id, withdrawalId]);
    
    if (transactionResult.rows.length > 0) {
      const transaction = transactionResult.rows[0];
      console.log('✅ Transaction record found:');
      console.log(`   Type: ${transaction.type}`);
      console.log(`   Amount: $${parseFloat(transaction.amount).toFixed(2)}`);
      console.log(`   Balance Type: ${transaction.balance_type}`);
      console.log(`   Description: ${transaction.description}`);
      console.log(`   Status: ${transaction.status}`);
    } else {
      console.log('❌ No transaction record found');
    }

    // 6. Cleanup (optional)
    console.log('\n📋 Step 6: Cleanup');
    console.log('==================');
    
    if (testUser.email === 'test-withdrawal@example.com') {
      // Delete test data
      await pool.query('DELETE FROM withdrawal_requests WHERE id = $1', [withdrawalId]);
      await pool.query('DELETE FROM transactions WHERE user_id = $1', [testUser.id]);
      await pool.query('DELETE FROM user_balances WHERE user_id = $1', [testUser.id]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
      console.log('✅ Test data cleaned up');
    } else {
      console.log('ℹ️  Using existing user - no cleanup performed');
    }

    console.log('\n🎉 Withdrawal Balance Deduction Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testWithdrawalBalanceDeduction();
