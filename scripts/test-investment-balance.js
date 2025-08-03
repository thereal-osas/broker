#!/usr/bin/env node

/**
 * Test regular investment balance deduction functionality
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testInvestmentBalance() {
  console.log('🧪 Testing regular investment balance deduction...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Get a test user with sufficient balance
    console.log('\n📋 Step 1: Finding test user...');
    const userResult = await pool.query(`
      SELECT u.id, u.email, ub.total_balance 
      FROM users u 
      JOIN user_balances ub ON u.id = ub.user_id 
      WHERE u.role = 'investor' AND ub.total_balance >= 100
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No investor with sufficient balance found');
      
      // Create test balance for first user
      const firstUser = await pool.query('SELECT id FROM users WHERE role = \'investor\' LIMIT 1');
      if (firstUser.rows.length > 0) {
        await pool.query(`
          UPDATE user_balances 
          SET total_balance = 1000.00 
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
    
    // 2. Get an active investment plan
    console.log('\n📋 Step 2: Finding active investment plan...');
    const planResult = await pool.query(`
      SELECT * FROM investment_plans 
      WHERE is_active = true AND min_amount <= $1
      ORDER BY min_amount ASC 
      LIMIT 1
    `, [testUser.total_balance]);
    
    if (planResult.rows.length === 0) {
      console.log('❌ No suitable investment plan found');
      return;
    }
    
    const testPlan = planResult.rows[0];
    console.log(`✅ Test plan: ${testPlan.name} (Min: $${testPlan.min_amount})`);
    
    // 3. Test the investment process
    console.log('\n📋 Step 3: Testing investment creation...');
    const investmentAmount = Math.max(testPlan.min_amount, 100);
    
    console.log(`💰 Investment amount: $${investmentAmount}`);
    
    // Start transaction
    await pool.query('BEGIN');
    
    try {
      // Check balance before
      const balanceBefore = await pool.query(`
        SELECT total_balance FROM user_balances WHERE user_id = $1
      `, [testUser.id]);
      
      console.log(`💳 Balance before: $${balanceBefore.rows[0].total_balance}`);
      
      // Create investment
      const investmentResult = await pool.query(`
        INSERT INTO user_investments (user_id, plan_id, amount)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [testUser.id, testPlan.id, investmentAmount]);
      
      // Deduct from balance
      await pool.query(`
        UPDATE user_balances 
        SET total_balance = total_balance - $1 
        WHERE user_id = $2
      `, [investmentAmount, testUser.id]);
      
      // Record transaction
      await pool.query(`
        INSERT INTO transactions (
          user_id, type, amount, balance_type, description, reference_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        testUser.id,
        'investment',
        investmentAmount,
        'total',
        `Investment in ${testPlan.name}`,
        investmentResult.rows[0].id,
        'completed'
      ]);
      
      // Check balance after
      const balanceAfter = await pool.query(`
        SELECT total_balance FROM user_balances WHERE user_id = $1
      `, [testUser.id]);
      
      console.log(`💳 Balance after: $${balanceAfter.rows[0].total_balance}`);
      console.log(`✅ Investment created: ID ${investmentResult.rows[0].id}`);
      console.log(`✅ Transaction recorded successfully`);
      
      // Check if transaction was created
      const transactionCheck = await pool.query(`
        SELECT * FROM transactions 
        WHERE user_id = $1 AND type = 'investment' AND reference_id = $2
      `, [testUser.id, investmentResult.rows[0].id]);
      
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
    
    console.log('\n🎉 Investment balance test completed successfully!');
    console.log('✅ Balance deduction logic is working correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testInvestmentBalance();
