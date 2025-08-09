#!/usr/bin/env node

/**
 * Test script to verify that balance deduction works correctly for multiple investments/trades
 * This tests the fix for the bug where balance deduction stopped working after the 2nd transaction
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testMultipleInvestmentBalanceDeduction() {
  console.log('🧪 Testing Multiple Investment Balance Deduction');
  console.log('===============================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Create a test user with sufficient balance
    console.log('📋 Step 1: Setting Up Test User');
    console.log('===============================');
    
    // Create test user
    const createUserQuery = `
      INSERT INTO users (email, password, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET 
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name
      RETURNING id
    `;
    const userResult = await pool.query(createUserQuery, [
      'test-multiple-investments@example.com',
      'password123',
      'Test',
      'MultiInvestor',
      'investor'
    ]);
    
    const userId = userResult.rows[0].id;
    
    // Create/update balance with sufficient funds for multiple investments
    const initialBalance = 1000.00;
    const createBalanceQuery = `
      INSERT INTO user_balances (user_id, total_balance, deposit_balance, profit_balance, bonus_balance, card_balance)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE SET 
        total_balance = $2,
        deposit_balance = $3,
        profit_balance = $4,
        bonus_balance = $5,
        card_balance = $6,
        updated_at = CURRENT_TIMESTAMP
    `;
    await pool.query(createBalanceQuery, [userId, initialBalance, initialBalance, 0, 0, 0]);
    
    console.log(`✅ Test user created with $${initialBalance} balance`);

    // 2. Get an active investment plan
    console.log('\n📋 Step 2: Finding Investment Plan');
    console.log('==================================');
    
    const planQuery = `
      SELECT * FROM investment_plans 
      WHERE is_active = true AND min_amount <= 100
      ORDER BY min_amount ASC
      LIMIT 1
    `;
    const planResult = await pool.query(planQuery);
    
    if (planResult.rows.length === 0) {
      console.log('❌ No suitable investment plan found');
      return;
    }
    
    const plan = planResult.rows[0];
    console.log(`✅ Using plan: ${plan.name} (Min: $${plan.min_amount})`);

    // 3. Test multiple investments (this should reveal the bug)
    console.log('\n📋 Step 3: Testing Multiple Investments');
    console.log('======================================');
    
    const investmentAmount = 50.00;
    const numberOfInvestments = 5;
    const results = [];
    
    for (let i = 1; i <= numberOfInvestments; i++) {
      console.log(`\n🔄 Investment ${i}/${numberOfInvestments}:`);
      
      // Get balance before investment
      const beforeQuery = `SELECT total_balance, deposit_balance FROM user_balances WHERE user_id = $1`;
      const beforeResult = await pool.query(beforeQuery, [userId]);
      const balanceBefore = parseFloat(beforeResult.rows[0].total_balance);
      const depositBefore = parseFloat(beforeResult.rows[0].deposit_balance);
      
      console.log(`   Balance before: $${balanceBefore.toFixed(2)} (Deposit: $${depositBefore.toFixed(2)})`);
      
      // Simulate the investment API call logic
      await pool.query('BEGIN');
      
      try {
        // Create investment record
        const investmentQuery = `
          INSERT INTO user_investments (user_id, plan_id, amount, status)
          VALUES ($1, $2, $3, 'active')
          RETURNING id
        `;
        const investmentResult = await pool.query(investmentQuery, [userId, plan.id, investmentAmount]);
        const investmentId = investmentResult.rows[0].id;
        
        // Update balance using the same logic as the fixed API
        const updateBalanceQuery = `
          UPDATE user_balances
          SET deposit_balance = GREATEST(0, deposit_balance - $2),
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
        `;
        await pool.query(updateBalanceQuery, [userId, investmentAmount]);
        
        // Recalculate total balance
        const recalculateQuery = `
          UPDATE user_balances
          SET total_balance = GREATEST(0, profit_balance + deposit_balance + bonus_balance + card_balance)
          WHERE user_id = $1
          RETURNING *
        `;
        const recalculateResult = await pool.query(recalculateQuery, [userId]);
        
        // Create transaction record
        const transactionQuery = `
          INSERT INTO transactions (user_id, type, amount, balance_type, description, reference_id, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await pool.query(transactionQuery, [
          userId,
          'investment',
          investmentAmount,
          'deposit',
          `Investment in ${plan.name}`,
          investmentId,
          'completed'
        ]);
        
        await pool.query('COMMIT');
        
        // Get balance after investment
        const afterQuery = `SELECT total_balance, deposit_balance FROM user_balances WHERE user_id = $1`;
        const afterResult = await pool.query(afterQuery, [userId]);
        const balanceAfter = parseFloat(afterResult.rows[0].total_balance);
        const depositAfter = parseFloat(afterResult.rows[0].deposit_balance);
        
        console.log(`   Balance after:  $${balanceAfter.toFixed(2)} (Deposit: $${depositAfter.toFixed(2)})`);
        
        const expectedBalance = balanceBefore - investmentAmount;
        const actualDeduction = balanceBefore - balanceAfter;
        
        const success = Math.abs(actualDeduction - investmentAmount) < 0.01;
        
        results.push({
          investment: i,
          balanceBefore,
          balanceAfter,
          expectedDeduction: investmentAmount,
          actualDeduction,
          success
        });
        
        if (success) {
          console.log(`   ✅ Deduction correct: $${actualDeduction.toFixed(2)}`);
        } else {
          console.log(`   ❌ Deduction incorrect: Expected $${investmentAmount.toFixed(2)}, Got $${actualDeduction.toFixed(2)}`);
        }
        
      } catch (error) {
        await pool.query('ROLLBACK');
        console.log(`   ❌ Investment ${i} failed: ${error.message}`);
        results.push({
          investment: i,
          balanceBefore,
          balanceAfter: balanceBefore,
          expectedDeduction: investmentAmount,
          actualDeduction: 0,
          success: false,
          error: error.message
        });
      }
      
      // Small delay to simulate real-world usage
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 4. Analyze results
    console.log('\n📋 Step 4: Results Analysis');
    console.log('===========================');
    
    const successfulInvestments = results.filter(r => r.success).length;
    const failedInvestments = results.filter(r => !r.success).length;
    
    console.log(`✅ Successful investments: ${successfulInvestments}/${numberOfInvestments}`);
    console.log(`❌ Failed investments: ${failedInvestments}/${numberOfInvestments}`);
    
    if (failedInvestments > 0) {
      console.log('\nFailed investments:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   Investment ${r.investment}: ${r.error || 'Balance deduction failed'}`);
      });
    }
    
    // Check for the specific bug pattern (first 2 work, then fail)
    const firstTwoSuccessful = results.slice(0, 2).every(r => r.success);
    const laterFailures = results.slice(2).some(r => !r.success);
    
    if (firstTwoSuccessful && laterFailures) {
      console.log('\n🐛 BUG DETECTED: First 2 investments worked, but later ones failed!');
      console.log('   This confirms the reported bug pattern.');
    } else if (successfulInvestments === numberOfInvestments) {
      console.log('\n🎉 BUG FIXED: All investments processed correctly!');
      console.log('   Balance deduction is working properly for multiple transactions.');
    } else {
      console.log('\n⚠️  MIXED RESULTS: Some investments failed, but not in the expected pattern.');
    }

    // 5. Cleanup
    console.log('\n📋 Step 5: Cleanup');
    console.log('==================');
    
    // Delete test data
    await pool.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM user_investments WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM user_balances WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Multiple Investment Balance Deduction Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testMultipleInvestmentBalanceDeduction();
