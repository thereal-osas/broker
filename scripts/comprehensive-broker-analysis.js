#!/usr/bin/env node

/**
 * Comprehensive Broker Application Analysis
 * Identifies critical functionality issues after deployment
 */

require('dotenv').config();
const { Pool } = require('pg');

async function comprehensiveBrokerAnalysis() {
  console.log('🔍 Comprehensive Broker Application Analysis');
  console.log('============================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Issue 1: Database Schema Validation
    console.log('📋 Issue 1: Database Schema Validation');
    console.log('=====================================');
    
    // Check user_balances table schema
    const balanceSchema = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_balances' 
      ORDER BY ordinal_position
    `);
    
    console.log('user_balances table schema:');
    balanceSchema.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'NULL'}, nullable: ${col.is_nullable})`);
    });
    
    const balanceColumns = balanceSchema.rows.map(row => row.column_name);
    const expectedColumns = ['total_balance', 'card_balance', 'credit_score_balance'];
    const oldColumns = ['profit_balance', 'deposit_balance', 'bonus_balance'];
    
    console.log('\nBalance Schema Analysis:');
    console.log(`Expected columns present: ${expectedColumns.every(col => balanceColumns.includes(col)) ? '✅' : '❌'}`);
    console.log(`Old columns removed: ${oldColumns.every(col => !balanceColumns.includes(col)) ? '✅' : '❌'}`);
    
    if (oldColumns.some(col => balanceColumns.includes(col))) {
      console.log('❌ CRITICAL: Old balance columns still exist:', oldColumns.filter(col => balanceColumns.includes(col)));
    }

    // Check live trade tables
    const liveTradeSchema = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('live_trade_plans', 'user_live_trades', 'hourly_live_trade_profits')
    `);
    
    const liveTradeTableNames = liveTradeSchema.rows.map(row => row.table_name);
    const requiredLiveTradeTables = ['live_trade_plans', 'user_live_trades', 'hourly_live_trade_profits'];
    
    console.log('\nLive Trade Tables:');
    requiredLiveTradeTables.forEach(table => {
      const exists = liveTradeTableNames.includes(table);
      console.log(`   ${table}: ${exists ? '✅' : '❌'}`);
    });

    // Issue 2: Transaction Constraints Validation
    console.log('\n📋 Issue 2: Transaction Constraints Validation');
    console.log('==============================================');
    
    const constraints = await pool.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name LIKE '%transactions_%'
    `);
    
    console.log('Transaction constraints:');
    constraints.rows.forEach(constraint => {
      console.log(`   ${constraint.constraint_name}:`);
      console.log(`      ${constraint.check_clause}`);
    });

    // Test constraint compatibility
    try {
      await pool.query('BEGIN');
      
      // Test balance_type constraint
      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance_type, description)
        VALUES ($1, $2, $3, $4, $5)
      `, ['00000000-0000-0000-0000-000000000000', 'investment', 50.00, 'total', 'Test total balance']);
      
      console.log('✅ balance_type="total" works');
      
      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance_type, description)
        VALUES ($1, $2, $3, $4, $5)
      `, ['00000000-0000-0000-0000-000000000000', 'admin_funding', 25.00, 'card', 'Test card balance']);
      
      console.log('✅ balance_type="card" works');
      
      await pool.query('ROLLBACK');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.log('❌ Transaction constraint test failed:', error.message);
    }

    // Issue 3: Live Trade Management API Analysis
    console.log('\n📋 Issue 3: Live Trade Data Analysis');
    console.log('===================================');
    
    if (liveTradeTableNames.includes('user_live_trades')) {
      const liveTradeColumns = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'user_live_trades'
        ORDER BY ordinal_position
      `);
      
      console.log('user_live_trades columns:');
      liveTradeColumns.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type}`);
      });
      
      // Check for sample live trades
      const sampleTrades = await pool.query(`
        SELECT id, status, amount, start_time, end_time
        FROM user_live_trades 
        ORDER BY created_at DESC 
        LIMIT 3
      `);
      
      console.log(`\nSample live trades (${sampleTrades.rows.length} found):`);
      sampleTrades.rows.forEach(trade => {
        console.log(`   ${trade.id.substring(0, 8)}: ${trade.status}, $${trade.amount}`);
      });
    }

    // Issue 4: Withdrawal Request Analysis
    console.log('\n📋 Issue 4: Withdrawal Request Analysis');
    console.log('======================================');
    
    const withdrawalSchema = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'withdrawal_requests'
      ORDER BY ordinal_position
    `);
    
    console.log('withdrawal_requests columns:');
    withdrawalSchema.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
    });
    
    // Check for sample withdrawal requests
    const sampleWithdrawals = await pool.query(`
      SELECT id, status, amount, created_at
      FROM withdrawal_requests 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    console.log(`\nSample withdrawal requests (${sampleWithdrawals.rows.length} found):`);
    sampleWithdrawals.rows.forEach(withdrawal => {
      console.log(`   ${withdrawal.id.substring(0, 8)}: ${withdrawal.status}, $${withdrawal.amount}`);
    });

    // Issue 5: Balance Update Operations Test
    console.log('\n📋 Issue 5: Balance Update Operations Test');
    console.log('=========================================');
    
    try {
      await pool.query('BEGIN');
      
      // Test balance update with new structure
      const testUserId = '00000000-0000-0000-0000-000000000001';
      
      // Create test balance record
      await pool.query(`
        INSERT INTO user_balances (user_id, total_balance, card_balance, credit_score_balance)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO UPDATE SET
          total_balance = EXCLUDED.total_balance,
          card_balance = EXCLUDED.card_balance,
          credit_score_balance = EXCLUDED.credit_score_balance
      `, [testUserId, 100.00, 0.00, 0]);
      
      // Test balance deduction
      await pool.query(`
        UPDATE user_balances 
        SET total_balance = GREATEST(0, total_balance - $2),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `, [testUserId, 50.00]);
      
      console.log('✅ Balance deduction operation works');
      
      // Test balance addition
      await pool.query(`
        UPDATE user_balances 
        SET card_balance = card_balance + $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `, [testUserId, 25.00]);
      
      console.log('✅ Balance addition operation works');
      
      await pool.query('ROLLBACK');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.log('❌ Balance update test failed:', error.message);
    }

    // Issue 6: Foreign Key Constraints Check
    console.log('\n📋 Issue 6: Foreign Key Constraints Check');
    console.log('========================================');
    
    const foreignKeys = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('user_live_trades', 'withdrawal_requests', 'transactions', 'user_balances')
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    console.log('Foreign key constraints:');
    foreignKeys.rows.forEach(fk => {
      console.log(`   ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    // Summary and Recommendations
    console.log('\n🎯 ANALYSIS SUMMARY');
    console.log('==================');
    
    const issues = [];
    const recommendations = [];
    
    // Check for schema issues
    if (!expectedColumns.every(col => balanceColumns.includes(col))) {
      issues.push('Missing required balance columns');
      recommendations.push('Run balance structure migration');
    }
    
    if (oldColumns.some(col => balanceColumns.includes(col))) {
      issues.push('Old balance columns still exist');
      recommendations.push('Remove old balance columns');
    }
    
    if (!requiredLiveTradeTables.every(table => liveTradeTableNames.includes(table))) {
      issues.push('Missing live trade tables');
      recommendations.push('Create missing live trade tables');
    }
    
    if (issues.length === 0) {
      console.log('✅ No critical schema issues detected');
    } else {
      console.log('❌ Critical issues found:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
      
      console.log('\n📋 Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Check specific API endpoints for code issues');
    console.log('2. Review error logs from failed operations');
    console.log('3. Test admin functionality with corrected schema');
    console.log('4. Verify transaction handling in all APIs');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

comprehensiveBrokerAnalysis();
