#!/usr/bin/env node

/**
 * Debug script to investigate balance display issues
 */

require('dotenv').config();
const { Pool } = require('pg');

async function debugBalanceIssues() {
  console.log('🔍 Debugging Balance Display Issues');
  console.log('===================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Check for negative balances
    console.log('📋 Step 1: Checking for Negative Balances');
    console.log('==========================================');
    
    const negativeBalances = await pool.query(`
      SELECT 
        u.email,
        u.first_name,
        u.last_name,
        ub.total_balance,
        ub.profit_balance,
        ub.deposit_balance,
        ub.bonus_balance,
        ub.credit_score_balance,
        ub.card_balance
      FROM user_balances ub
      JOIN users u ON ub.user_id = u.id
      WHERE ub.profit_balance < 0 
         OR ub.deposit_balance < 0 
         OR ub.bonus_balance < 0 
         OR ub.card_balance < 0
      ORDER BY u.email
    `);
    
    if (negativeBalances.rows.length > 0) {
      console.log(`❌ Found ${negativeBalances.rows.length} users with negative balances:`);
      negativeBalances.rows.forEach(user => {
        console.log(`   👤 ${user.first_name} ${user.last_name} (${user.email})`);
        console.log(`      Total: $${parseFloat(user.total_balance || 0).toFixed(2)}`);
        console.log(`      Profit: $${parseFloat(user.profit_balance || 0).toFixed(2)}`);
        console.log(`      Deposit: $${parseFloat(user.deposit_balance || 0).toFixed(2)}`);
        console.log(`      Bonus: $${parseFloat(user.bonus_balance || 0).toFixed(2)}`);
        console.log(`      Card: $${parseFloat(user.card_balance || 0).toFixed(2)}`);
        console.log(`      Credit Score: ${user.credit_score_balance}`);
        console.log('');
      });
    } else {
      console.log('✅ No negative balances found');
    }

    // 2. Check for total balance discrepancies
    console.log('\n📋 Step 2: Checking Total Balance Discrepancies');
    console.log('===============================================');
    
    const discrepancies = await pool.query(`
      SELECT 
        u.email,
        u.first_name,
        u.last_name,
        ub.total_balance as stored_total,
        (ub.profit_balance + ub.deposit_balance + ub.bonus_balance + ub.card_balance) as calculated_total,
        ABS(ub.total_balance - (ub.profit_balance + ub.deposit_balance + ub.bonus_balance + ub.card_balance)) as difference
      FROM user_balances ub
      JOIN users u ON ub.user_id = u.id
      WHERE ABS(ub.total_balance - (ub.profit_balance + ub.deposit_balance + ub.bonus_balance + ub.card_balance)) > 0.01
      ORDER BY difference DESC
    `);
    
    if (discrepancies.rows.length > 0) {
      console.log(`❌ Found ${discrepancies.rows.length} users with total balance discrepancies:`);
      discrepancies.rows.forEach(user => {
        console.log(`   👤 ${user.first_name} ${user.last_name} (${user.email})`);
        console.log(`      Stored Total: $${parseFloat(user.stored_total || 0).toFixed(2)}`);
        console.log(`      Calculated Total: $${parseFloat(user.calculated_total || 0).toFixed(2)}`);
        console.log(`      Difference: $${parseFloat(user.difference || 0).toFixed(2)}`);
        console.log('');
      });
    } else {
      console.log('✅ No total balance discrepancies found');
    }

    // 3. Check for NULL values
    console.log('\n📋 Step 3: Checking for NULL Values');
    console.log('===================================');
    
    const nullValues = await pool.query(`
      SELECT 
        u.email,
        u.first_name,
        u.last_name,
        CASE WHEN ub.total_balance IS NULL THEN 'total_balance' END as null_total,
        CASE WHEN ub.profit_balance IS NULL THEN 'profit_balance' END as null_profit,
        CASE WHEN ub.deposit_balance IS NULL THEN 'deposit_balance' END as null_deposit,
        CASE WHEN ub.bonus_balance IS NULL THEN 'bonus_balance' END as null_bonus,
        CASE WHEN ub.card_balance IS NULL THEN 'card_balance' END as null_card,
        CASE WHEN ub.credit_score_balance IS NULL THEN 'credit_score_balance' END as null_credit
      FROM user_balances ub
      JOIN users u ON ub.user_id = u.id
      WHERE ub.total_balance IS NULL 
         OR ub.profit_balance IS NULL 
         OR ub.deposit_balance IS NULL 
         OR ub.bonus_balance IS NULL 
         OR ub.card_balance IS NULL
         OR ub.credit_score_balance IS NULL
    `);
    
    if (nullValues.rows.length > 0) {
      console.log(`❌ Found ${nullValues.rows.length} users with NULL balance values:`);
      nullValues.rows.forEach(user => {
        console.log(`   👤 ${user.first_name} ${user.last_name} (${user.email})`);
        const nullFields = [user.null_total, user.null_profit, user.null_deposit, user.null_bonus, user.null_card, user.null_credit].filter(Boolean);
        console.log(`      NULL fields: ${nullFields.join(', ')}`);
        console.log('');
      });
    } else {
      console.log('✅ No NULL balance values found');
    }

    // 4. Sample balance data for analysis
    console.log('\n📋 Step 4: Sample Balance Data');
    console.log('=============================');
    
    const sampleData = await pool.query(`
      SELECT 
        u.email,
        u.first_name,
        u.last_name,
        ub.total_balance,
        ub.profit_balance,
        ub.deposit_balance,
        ub.bonus_balance,
        ub.credit_score_balance,
        ub.card_balance,
        ub.updated_at
      FROM user_balances ub
      JOIN users u ON ub.user_id = u.id
      ORDER BY ub.updated_at DESC
      LIMIT 5
    `);
    
    console.log('Recent balance records:');
    sampleData.rows.forEach(user => {
      console.log(`   👤 ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`      Total: $${parseFloat(user.total_balance || 0).toFixed(2)}`);
      console.log(`      Profit: $${parseFloat(user.profit_balance || 0).toFixed(2)}`);
      console.log(`      Deposit: $${parseFloat(user.deposit_balance || 0).toFixed(2)}`);
      console.log(`      Bonus: $${parseFloat(user.bonus_balance || 0).toFixed(2)}`);
      console.log(`      Card: $${parseFloat(user.card_balance || 0).toFixed(2)}`);
      console.log(`      Credit Score: ${user.credit_score_balance}`);
      console.log(`      Last Updated: ${user.updated_at}`);
      console.log('');
    });

    console.log('\n🎉 Balance Debug Analysis Complete!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

debugBalanceIssues();
