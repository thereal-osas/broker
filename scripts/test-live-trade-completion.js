#!/usr/bin/env node

/**
 * Test Live Trade Completion System
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testLiveTradeCompletion() {
  console.log('🧪 Testing Live Trade Completion System');
  console.log('======================================\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test 1: Check for expired active trades
    console.log('📋 Test 1: Checking for Expired Active Trades');
    console.log('==============================================');
    
    const expiredTradesQuery = `
      SELECT 
        ult.id,
        ult.status,
        ult.amount,
        ult.start_time,
        ltp.duration_hours,
        ltp.name as plan_name,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ult.start_time)) / 3600 as hours_elapsed,
        (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ult.start_time)) / 3600) - ltp.duration_hours as hours_overdue
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      WHERE ult.status = 'active'
        AND ult.start_time + INTERVAL '1 hour' * ltp.duration_hours <= CURRENT_TIMESTAMP
      ORDER BY hours_overdue DESC
    `;
    
    const expiredTrades = await pool.query(expiredTradesQuery);
    
    if (expiredTrades.rows.length === 0) {
      console.log('✅ No expired active trades found - system is working correctly');
    } else {
      console.log(`❌ Found ${expiredTrades.rows.length} expired active trades that should be completed:`);
      expiredTrades.rows.forEach(trade => {
        console.log(`   🚨 Trade ${trade.id.substring(0, 8)}`);
        console.log(`      Plan: ${trade.plan_name} (${trade.duration_hours}h duration)`);
        console.log(`      Hours Overdue: ${parseFloat(trade.hours_overdue).toFixed(2)}`);
        console.log(`      Amount: $${parseFloat(trade.amount).toFixed(2)}`);
        console.log('');
      });
    }

    // Test 2: Test completion query logic
    console.log('📋 Test 2: Testing Completion Query Logic');
    console.log('=========================================');
    
    // Test the exact query used in completeExpiredLiveTrades
    const completionTestQuery = `
      SELECT ult.id, ult.user_id, ult.amount, ult.start_time, ult.total_profit,
             ult.live_trade_plan_id, ltp.name as plan_name, ltp.duration_hours, ltp.hourly_profit_rate
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      WHERE ult.status = 'active'
      AND ult.start_time + INTERVAL '1 hour' * ltp.duration_hours <= CURRENT_TIMESTAMP
    `;
    
    const completionTest = await pool.query(completionTestQuery);
    console.log(`Completion query would find: ${completionTest.rows.length} trades to complete`);
    
    if (completionTest.rows.length > 0) {
      console.log('Trades that would be completed:');
      completionTest.rows.forEach(trade => {
        console.log(`   - ${trade.id.substring(0, 8)} (${trade.plan_name})`);
      });
    }

    // Test 3: Test active trades query logic
    console.log('\n📋 Test 3: Testing Active Trades Query Logic');
    console.log('============================================');
    
    // Test the query used in getActiveLiveTrades
    const activeTradesQuery = `
      SELECT 
        ult.id,
        ult.user_id,
        ult.live_trade_plan_id,
        ult.amount,
        ult.start_time,
        ult.total_profit,
        ltp.hourly_profit_rate,
        ltp.duration_hours
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      WHERE ult.status = 'active'
      AND ult.start_time + INTERVAL '1 hour' * ltp.duration_hours > CURRENT_TIMESTAMP
    `;
    
    const activeTrades = await pool.query(activeTradesQuery);
    console.log(`Active trades query finds: ${activeTrades.rows.length} trades for profit distribution`);

    // Test 4: Simulate completion process
    console.log('\n📋 Test 4: Simulating Completion Process');
    console.log('========================================');
    
    if (completionTest.rows.length > 0) {
      console.log('⚠️  WARNING: Found trades that should be completed but are still active');
      console.log('This indicates the automated completion process is not running properly');
      console.log('');
      console.log('Recommended actions:');
      console.log('1. Check if cron job is properly scheduled');
      console.log('2. Manually run: POST /api/cron/calculate-live-trade-profits');
      console.log('3. Or use admin force completion: POST /api/admin/live-trade/force-completion');
    } else {
      console.log('✅ No trades need completion - system appears to be working');
    }

    // Test 5: Check recent completions
    console.log('\n📋 Test 5: Checking Recent Completions');
    console.log('=====================================');
    
    const recentCompletions = await pool.query(`
      SELECT 
        ult.id,
        ult.status,
        ult.start_time,
        ult.end_time,
        ltp.name as plan_name,
        ltp.duration_hours,
        EXTRACT(EPOCH FROM (ult.end_time - ult.start_time)) / 3600 as actual_duration_hours
      FROM user_live_trades ult
      JOIN live_trade_plans ltp ON ult.live_trade_plan_id = ltp.id
      WHERE ult.status = 'completed'
        AND ult.end_time IS NOT NULL
      ORDER BY ult.end_time DESC
      LIMIT 5
    `);
    
    if (recentCompletions.rows.length === 0) {
      console.log('No recent completions found');
    } else {
      console.log('Recent completions:');
      recentCompletions.rows.forEach(trade => {
        const actualHours = parseFloat(trade.actual_duration_hours).toFixed(2);
        const expectedHours = trade.duration_hours;
        const timingStatus = Math.abs(actualHours - expectedHours) < 1 ? '✅' : '⚠️';
        
        console.log(`   ${timingStatus} ${trade.id.substring(0, 8)} (${trade.plan_name})`);
        console.log(`      Expected: ${expectedHours}h, Actual: ${actualHours}h`);
        console.log(`      Completed: ${new Date(trade.end_time).toLocaleString()}`);
        console.log('');
      });
    }

    // Summary and recommendations
    console.log('🎯 TEST SUMMARY');
    console.log('===============');
    
    const issues = [];
    const recommendations = [];
    
    if (expiredTrades.rows.length > 0) {
      issues.push(`${expiredTrades.rows.length} trades are overdue for completion`);
      recommendations.push('Run manual completion or check cron job scheduling');
    }
    
    if (completionTest.rows.length > 0) {
      issues.push('Completion logic would find trades to complete but they remain active');
      recommendations.push('Verify cron job is running and completion function is working');
    }
    
    if (issues.length === 0) {
      console.log('✅ Live trade completion system appears to be working correctly');
    } else {
      console.log('❌ Issues detected:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
      
      console.log('\n📋 Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n📋 Manual Actions Available:');
    console.log('1. Force completion: POST /api/admin/live-trade/force-completion');
    console.log('2. Run profit distribution: POST /api/cron/calculate-live-trade-profits');
    console.log('3. Check individual trade: GET /api/admin/live-trade/force-completion');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

testLiveTradeCompletion();
