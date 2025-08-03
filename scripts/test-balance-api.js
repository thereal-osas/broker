#!/usr/bin/env node

/**
 * Test balance API calculation logic
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testBalanceAPI() {
  console.log('🧪 Testing balance API calculation logic...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Get a test user
    console.log('\n📋 Step 1: Finding test user...');
    const userResult = await pool.query(`
      SELECT u.id, u.email, ub.* 
      FROM users u 
      JOIN user_balances ub ON u.id = ub.user_id 
      WHERE u.role = 'investor'
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No investor users found');
      return;
    }
    
    const testUser = userResult.rows[0];
    console.log(`✅ Test user: ${testUser.email}`);
    
    // 2. Show current database values
    console.log('\n📋 Step 2: Current database balance values...');
    console.log(`Database total_balance: $${testUser.total_balance}`);
    console.log(`Database profit_balance: $${testUser.profit_balance}`);
    console.log(`Database deposit_balance: $${testUser.deposit_balance}`);
    console.log(`Database bonus_balance: $${testUser.bonus_balance}`);
    console.log(`Database credit_score_balance: ${testUser.credit_score_balance} CRD`);
    
    // 3. Simulate API calculation logic
    console.log('\n📋 Step 3: API calculation logic...');
    const profit_balance = parseFloat(testUser.profit_balance || 0);
    const deposit_balance = parseFloat(testUser.deposit_balance || 0);
    const bonus_balance = parseFloat(testUser.bonus_balance || 0);
    const credit_score_balance = parseFloat(testUser.credit_score_balance || 0);
    
    // Current API logic: recalculates total by summing components
    const api_calculated_total = profit_balance + deposit_balance + bonus_balance;
    
    console.log(`API calculated total: $${api_calculated_total.toFixed(2)}`);
    console.log(`Database stored total: $${parseFloat(testUser.total_balance).toFixed(2)}`);
    console.log(`Difference: $${(api_calculated_total - parseFloat(testUser.total_balance)).toFixed(2)}`);
    
    // 4. Check recent transactions
    console.log('\n📋 Step 4: Recent transactions affecting total_balance...');
    const transactions = await pool.query(`
      SELECT type, amount, balance_type, description, created_at
      FROM transactions 
      WHERE user_id = $1 AND balance_type = 'total'
      ORDER BY created_at DESC 
      LIMIT 5
    `, [testUser.id]);
    
    if (transactions.rows.length > 0) {
      console.log('Recent total_balance transactions:');
      transactions.rows.forEach((tx, index) => {
        console.log(`${index + 1}. ${tx.type}: $${tx.amount} - ${tx.description} (${tx.created_at})`);
      });
    } else {
      console.log('No recent total_balance transactions found');
    }
    
    // 5. Demonstrate the problem
    console.log('\n📋 Step 5: Demonstrating the balance sync issue...');
    
    // Simulate an investment deduction (what happens in the backend)
    const investmentAmount = 50;
    console.log(`\nSimulating $${investmentAmount} investment...`);
    
    await pool.query('BEGIN');
    
    try {
      // Backend deducts from total_balance directly
      await pool.query(`
        UPDATE user_balances 
        SET total_balance = total_balance - $1 
        WHERE user_id = $2
      `, [investmentAmount, testUser.id]);
      
      // Check what database shows now
      const afterDeduction = await pool.query(`
        SELECT * FROM user_balances WHERE user_id = $1
      `, [testUser.id]);
      
      const newBalance = afterDeduction.rows[0];
      console.log(`\nAfter $${investmentAmount} deduction:`);
      console.log(`Database total_balance: $${newBalance.total_balance}`);
      console.log(`Database profit_balance: $${newBalance.profit_balance}`);
      console.log(`Database deposit_balance: $${newBalance.deposit_balance}`);
      console.log(`Database bonus_balance: $${newBalance.bonus_balance}`);
      
      // What API would return (recalculated)
      const new_api_total = parseFloat(newBalance.profit_balance) + 
                           parseFloat(newBalance.deposit_balance) + 
                           parseFloat(newBalance.bonus_balance);
      
      console.log(`\nAPI would return: $${new_api_total.toFixed(2)}`);
      console.log(`Database shows: $${parseFloat(newBalance.total_balance).toFixed(2)}`);
      console.log(`❌ MISMATCH: API ignores the deduction!`);
      
      await pool.query('ROLLBACK');
      console.log('\n🔄 Changes rolled back');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
    console.log('\n🎯 ISSUE IDENTIFIED:');
    console.log('   The API recalculates total_balance by summing components,');
    console.log('   but investments/withdrawals deduct from total_balance directly.');
    console.log('   This causes the frontend to show outdated balances.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testBalanceAPI();
