#!/usr/bin/env node

/**
 * Debug withdrawal approval to find the exact issue
 */

require('dotenv').config();
const { Pool } = require('pg');

async function debugWithdrawalApproval() {
  console.log('🔍 Debugging withdrawal approval process...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Check existing withdrawal requests
    console.log('\n📋 Step 1: Checking existing withdrawal requests...');
    const existingWithdrawals = await pool.query(`
      SELECT 
        wr.*,
        u.email,
        ub.total_balance
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      LEFT JOIN user_balances ub ON u.id = ub.user_id
      ORDER BY wr.created_at DESC
      LIMIT 5
    `);
    
    console.log(`Found ${existingWithdrawals.rows.length} withdrawal requests:`);
    existingWithdrawals.rows.forEach((wr, index) => {
      console.log(`${index + 1}. ID: ${wr.id}`);
      console.log(`   User: ${wr.email}`);
      console.log(`   Amount: $${wr.amount} (type: ${typeof wr.amount})`);
      console.log(`   Status: ${wr.status}`);
      console.log(`   User Balance: $${wr.total_balance} (type: ${typeof wr.total_balance})`);
      console.log(`   Balance >= Amount: ${parseFloat(wr.total_balance || 0) >= parseFloat(wr.amount)}`);
      console.log('');
    });
    
    // 2. Check if there are any pending withdrawals
    const pendingWithdrawals = existingWithdrawals.rows.filter(wr => wr.status === 'pending');
    
    if (pendingWithdrawals.length > 0) {
      console.log(`📋 Found ${pendingWithdrawals.length} pending withdrawal(s)`);
      
      const testWithdrawal = pendingWithdrawals[0];
      console.log(`\n🧪 Testing approval logic for withdrawal ID: ${testWithdrawal.id}`);
      
      // Simulate the API logic
      const amount = parseFloat(testWithdrawal.amount);
      const userBalance = parseFloat(testWithdrawal.total_balance || 0);
      
      console.log(`Amount to withdraw: $${amount}`);
      console.log(`User balance: $${userBalance}`);
      console.log(`Sufficient balance: ${userBalance >= amount}`);
      
      if (userBalance < amount) {
        console.log('❌ Would fail: Insufficient balance');
      } else {
        console.log('✅ Would pass: Sufficient balance');
        
        // Test the actual approval process
        console.log('\n🔧 Testing actual approval process...');
        
        await pool.query('BEGIN');
        
        try {
          // Update withdrawal request
          await pool.query(`
            UPDATE withdrawal_requests 
            SET status = 'approved', admin_notes = 'Debug test', processed_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [testWithdrawal.id]);
          
          // Deduct from balance
          await pool.query(`
            UPDATE user_balances 
            SET total_balance = total_balance - $1
            WHERE user_id = $2
          `, [amount, testWithdrawal.user_id]);
          
          // Create transaction
          await pool.query(`
            INSERT INTO transactions (
              user_id, type, amount, balance_type, description, 
              reference_id, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            testWithdrawal.user_id,
            'withdrawal',
            amount,
            'total',
            `Withdrawal request approved - ${testWithdrawal.withdrawal_method}`,
            testWithdrawal.id,
            'completed'
          ]);
          
          // Check final balance
          const finalBalance = await pool.query(`
            SELECT total_balance FROM user_balances WHERE user_id = $1
          `, [testWithdrawal.user_id]);
          
          console.log(`✅ Approval successful!`);
          console.log(`   Final balance: $${finalBalance.rows[0].total_balance}`);
          console.log(`   Expected balance: $${userBalance - amount}`);
          
          // Rollback
          await pool.query('ROLLBACK');
          console.log('🔄 Changes rolled back');
          
        } catch (error) {
          await pool.query('ROLLBACK');
          console.log('❌ Approval failed:', error.message);
        }
      }
    } else {
      console.log('📋 No pending withdrawals found');
      
      // Create a test withdrawal
      console.log('\n🔧 Creating test withdrawal...');
      
      const testUser = await pool.query(`
        SELECT u.id, u.email, ub.total_balance 
        FROM users u 
        JOIN user_balances ub ON u.id = ub.user_id 
        WHERE u.role = 'investor' AND ub.total_balance >= 50
        LIMIT 1
      `);
      
      if (testUser.rows.length > 0) {
        const user = testUser.rows[0];
        console.log(`Using test user: ${user.email} (Balance: $${user.total_balance})`);
        
        const testWithdrawal = await pool.query(`
          INSERT INTO withdrawal_requests (
            user_id, amount, withdrawal_method, account_details, status
          ) VALUES ($1, $2, 'bank_transfer', $3, 'pending')
          RETURNING *
        `, [
          user.id,
          25.00,
          JSON.stringify({
            account_name: 'Test Account',
            account_number: '1234567890',
            bank_name: 'Test Bank'
          })
        ]);
        
        console.log(`✅ Created test withdrawal: ID ${testWithdrawal.rows[0].id}`);
        console.log('   You can now test the approval process through the admin interface');
      } else {
        console.log('❌ No suitable test user found');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

debugWithdrawalApproval();
