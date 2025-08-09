#!/usr/bin/env node

/**
 * Comprehensive Live Trade Issues Diagnosis
 * 
 * This script identifies all the issues preventing live trade balance deduction
 */

require('dotenv').config();
const { Pool } = require('pg');

async function diagnoseLiveTradeIssues() {
  console.log('🔍 Diagnosing Live Trade Balance Deduction Issues');
  console.log('================================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Issue 1: Check if live trade tables exist
    console.log('📋 Issue 1: Live Trade Tables Existence');
    console.log('=======================================');
    
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('live_trade_plans', 'user_live_trades', 'hourly_live_trade_profits')
      ORDER BY table_name
    `);
    
    const existingTables = tableCheck.rows.map(row => row.table_name);
    const requiredTables = ['live_trade_plans', 'user_live_trades', 'hourly_live_trade_profits'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    console.log('Required tables:', requiredTables.join(', '));
    console.log('Existing tables:', existingTables.join(', '));
    
    if (missingTables.length > 0) {
      console.log('❌ CRITICAL: Missing tables:', missingTables.join(', '));
      console.log('   This will cause "table does not exist" errors');
    } else {
      console.log('✅ All live trade tables exist');
    }

    // Issue 2: Check transaction type constraints
    console.log('\n📋 Issue 2: Transaction Type Constraints');
    console.log('=======================================');
    
    try {
      // Test if live_trade_investment type is allowed
      const constraintCheck = await pool.query(`
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%transactions_type_check%'
      `);
      
      if (constraintCheck.rows.length > 0) {
        const checkClause = constraintCheck.rows[0].check_clause;
        console.log('Current transaction type constraint:', checkClause);
        
        if (checkClause.includes('live_trade_investment')) {
          console.log('✅ live_trade_investment type is allowed');
        } else {
          console.log('❌ CRITICAL: live_trade_investment type is NOT allowed');
          console.log('   This will cause constraint violation errors');
        }
      } else {
        console.log('⚠️  No transaction type constraints found');
      }
    } catch (error) {
      console.log('❌ Error checking constraints:', error.message);
    }

    // Issue 3: Check balance type constraints
    console.log('\n📋 Issue 3: Balance Type Constraints');
    console.log('===================================');
    
    try {
      const balanceConstraintCheck = await pool.query(`
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_name LIKE '%transactions_balance_type_check%'
      `);
      
      if (balanceConstraintCheck.rows.length > 0) {
        const checkClause = balanceConstraintCheck.rows[0].check_clause;
        console.log('Current balance type constraint:', checkClause);
        
        if (checkClause.includes('card')) {
          console.log('✅ card balance type is supported');
        } else {
          console.log('⚠️  card balance type may not be supported');
        }
      }
    } catch (error) {
      console.log('❌ Error checking balance constraints:', error.message);
    }

    // Issue 4: Test actual live trade creation
    console.log('\n📋 Issue 4: Live Trade Creation Test');
    console.log('===================================');
    
    if (existingTables.includes('live_trade_plans') && existingTables.includes('user_live_trades')) {
      try {
        // Check if there are any live trade plans
        const planCount = await pool.query('SELECT COUNT(*) as count FROM live_trade_plans WHERE is_active = true');
        const activePlans = parseInt(planCount.rows[0].count);
        
        console.log(`Active live trade plans: ${activePlans}`);
        
        if (activePlans === 0) {
          console.log('❌ CRITICAL: No active live trade plans available');
          console.log('   Users cannot create live trades without plans');
        } else {
          console.log('✅ Live trade plans are available');
          
          // Get a sample plan
          const samplePlan = await pool.query('SELECT * FROM live_trade_plans WHERE is_active = true LIMIT 1');
          if (samplePlan.rows.length > 0) {
            const plan = samplePlan.rows[0];
            console.log(`Sample plan: ${plan.name} (Min: $${plan.min_amount})`);
          }
        }
      } catch (error) {
        console.log('❌ Error checking live trade plans:', error.message);
      }
    }

    // Issue 5: Test transaction creation
    console.log('\n📋 Issue 5: Transaction Creation Test');
    console.log('====================================');
    
    try {
      // Test if we can create a live_trade_investment transaction
      await pool.query('BEGIN');
      
      const testTransaction = await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance_type, description, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, ['00000000-0000-0000-0000-000000000000', 'live_trade_investment', 50.00, 'deposit', 'Test live trade transaction', 'completed']);
      
      console.log('✅ live_trade_investment transaction can be created');
      
      await pool.query('ROLLBACK'); // Don't actually save the test transaction
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.log('❌ CRITICAL: Cannot create live_trade_investment transaction');
      console.log('   Error:', error.message);
      
      if (error.message.includes('violates check constraint')) {
        console.log('   This confirms the transaction type constraint issue!');
      }
    }

    // Issue 6: Check user_balances table
    console.log('\n📋 Issue 6: User Balances Table Check');
    console.log('====================================');
    
    const balanceColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_balances' 
      AND column_name LIKE '%balance%'
      ORDER BY column_name
    `);
    
    const balanceColumnNames = balanceColumns.rows.map(row => row.column_name);
    console.log('Balance columns:', balanceColumnNames.join(', '));
    
    if (balanceColumnNames.includes('card_balance')) {
      console.log('✅ card_balance column exists');
    } else {
      console.log('❌ CRITICAL: card_balance column is missing');
    }

    // Summary
    console.log('\n🎯 DIAGNOSIS SUMMARY');
    console.log('===================');
    
    const issues = [];
    
    if (missingTables.length > 0) {
      issues.push(`Missing tables: ${missingTables.join(', ')}`);
    }
    
    if (!balanceColumnNames.includes('card_balance')) {
      issues.push('Missing card_balance column');
    }
    
    // Test constraint by trying to insert
    try {
      await pool.query('BEGIN');
      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance_type, description)
        VALUES ($1, $2, $3, $4, $5)
      `, ['00000000-0000-0000-0000-000000000000', 'live_trade_investment', 1.00, 'deposit', 'Test']);
      await pool.query('ROLLBACK');
    } catch (error) {
      if (error.message.includes('violates check constraint') && error.message.includes('type')) {
        issues.push('Transaction type constraint blocks live_trade_investment');
      }
    }
    
    if (issues.length === 0) {
      console.log('✅ No critical issues found - live trade should work');
    } else {
      console.log('❌ Critical issues found:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    console.log('\n📋 RECOMMENDED FIXES:');
    console.log('1. Run: node scripts/check-live-trade-tables.js');
    console.log('2. Run: node scripts/fix-live-trade-transaction-types.js');
    console.log('3. Run: node scripts/fix-balance-deduction-schema.js');
    console.log('4. Test live trade creation through UI');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

diagnoseLiveTradeIssues();
